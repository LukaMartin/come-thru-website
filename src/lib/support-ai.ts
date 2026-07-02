import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { Database, Json } from "@/lib/database.types";
import { requireEnv } from "@/lib/env";
import { faqItems } from "@/lib/faq";
import { createServiceClient } from "@/lib/supabase/server";
import type { SupportMessage, SupportThread } from "@/lib/support";

const supportAiModel = process.env.SUPPORT_AI_MODEL ?? "gpt-4.1-mini";
const orderReferencePattern = /\bCT-[A-Z0-9]{8}\b/gi;

type SupabaseClient = ReturnType<typeof createServiceClient>;
type SupportAiSuggestion =
  Database["public"]["Tables"]["support_ai_suggestions"]["Row"];
type TicketingOrder = Database["public"]["Tables"]["ticketing_orders"]["Row"];

type SupportAiSuggestionInput = {
  suggestionId: string;
  threadId: string;
  supabaseClient?: SupabaseClient;
};

type CreatePendingSupportAiSuggestionInput = {
  threadId: string;
  triggerMessageId?: string | null;
  supabaseClient?: SupabaseClient;
};

type MarkSupportAiSuggestionFailedInput = {
  suggestionId: string;
  error: unknown;
  supabaseClient?: SupabaseClient;
};

type SupportOrderContext = Pick<
  TicketingOrder,
  | "id"
  | "order_reference"
  | "buyer_email"
  | "buyer_name"
  | "status"
  | "ticket_email_status"
  | "ticket_email_error"
  | "amount_total_cents"
  | "currency"
  | "stripe_payment_intent_id"
  | "created_at"
> & {
  ticket_count: number;
  ticket_statuses: string[];
};

const supportAiResponseSchema = z.object({
  category: z.enum([
    "missing_tickets",
    "refund_request",
    "event_question",
    "complaint",
    "spam",
    "other",
  ]),
  priority: z.enum(["low", "normal", "high"]),
  summary: z.string().trim().min(1).max(600),
  recommendedAction: z.object({
    type: z.enum([
      "resend_tickets",
      "refund_order",
      "ask_for_more_info",
      "manual_review",
      "no_action",
    ]),
    reason: z.string().trim().min(1).max(600),
    orderReference: z.string().trim().nullable(),
  }),
  draftReply: z.string().trim().min(1).max(2000),
  confidence: z.number().min(0).max(1),
  needsHumanCheck: z.boolean(),
});

type SupportAiResponse = z.infer<typeof supportAiResponseSchema>;

const supportAiJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "category",
    "priority",
    "summary",
    "recommendedAction",
    "draftReply",
    "confidence",
    "needsHumanCheck",
  ],
  properties: {
    category: {
      type: "string",
      enum: [
        "missing_tickets",
        "refund_request",
        "event_question",
        "complaint",
        "spam",
        "other",
      ],
    },
    priority: {
      type: "string",
      enum: ["low", "normal", "high"],
    },
    summary: {
      type: "string",
    },
    recommendedAction: {
      type: "object",
      additionalProperties: false,
      required: ["type", "reason", "orderReference"],
      properties: {
        type: {
          type: "string",
          enum: [
            "resend_tickets",
            "refund_order",
            "ask_for_more_info",
            "manual_review",
            "no_action",
          ],
        },
        reason: {
          type: "string",
        },
        orderReference: {
          type: ["string", "null"],
        },
      },
    },
    draftReply: {
      type: "string",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    needsHumanCheck: {
      type: "boolean",
    },
  },
} as const;

export async function createPendingSupportAiSuggestion({
  threadId,
  triggerMessageId,
  supabaseClient,
}: CreatePendingSupportAiSuggestionInput) {
  const supabase = supabaseClient ?? createServiceClient();
  const { data, error } = await supabase
    .from("support_ai_suggestions")
    .insert({
      thread_id: threadId,
      trigger_message_id: triggerMessageId ?? null,
      model: supportAiModel,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SupportAiSuggestion;
}

export async function markSupportAiSuggestionFailed({
  suggestionId,
  error,
  supabaseClient,
}: MarkSupportAiSuggestionFailedInput) {
  const supabase = supabaseClient ?? createServiceClient();
  const message = error instanceof Error ? error.message : "AI triage failed.";

  const { error: updateError } = await supabase
    .from("support_ai_suggestions")
    .update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", suggestionId);

  if (updateError) {
    throw updateError;
  }
}

export async function generateSupportAiSuggestion({
  suggestionId,
  threadId,
  supabaseClient,
}: SupportAiSuggestionInput) {
  const supabase = supabaseClient ?? createServiceClient();

  try {
    const context = await findSupportContext(threadId, supabase);
    const rawResult = await generateStructuredSupportSuggestion(context);
    const result = formatSupportAiDraftReply(
      applyRefundPolicyForClearlyIneligibleRequests(
        requireExplicitOrderReferenceForOrderActions(rawResult, context),
        context,
      ),
      context.thread.customer_name,
    );
    const matchedOrder = findRecommendedOrder(
      result.recommendedAction.orderReference,
      context.matchingOrders,
    );
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("support_ai_suggestions")
      .update({
        matched_order_id: matchedOrder?.id ?? null,
        status: "completed",
        category: result.category,
        priority: result.priority,
        recommended_action: result.recommendedAction.type,
        summary: result.summary,
        action_reason: result.recommendedAction.reason,
        draft_reply: result.draftReply,
        confidence: result.confidence,
        input_snapshot: context.snapshot,
        raw_response: result as unknown as Json,
        completed_at: now,
        error_message: null,
      })
      .eq("id", suggestionId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as SupportAiSuggestion;
  } catch (error) {
    await markSupportAiSuggestionFailed({
      suggestionId,
      error,
      supabaseClient: supabase,
    });
    throw error;
  }
}

async function findSupportContext(threadId: string, supabase: SupabaseClient) {
  const { data: threadData, error: threadError } = await supabase
    .from("support_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (threadError) {
    throw threadError;
  }

  const thread = threadData as SupportThread;
  const { data: messageData, error: messagesError } = await supabase
    .from("support_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw messagesError;
  }

  const messages = (messageData ?? []) as SupportMessage[];
  const orderReferences = extractOrderReferences(thread, messages);
  const matchingOrders = await findMatchingOrders(
    thread,
    messages,
    supabase,
    orderReferences,
  );
  const snapshot = {
    thread: {
      id: thread.id,
      referenceNumber: thread.reference_number,
      customerEmail: thread.customer_email,
      customerName: thread.customer_name,
      subject: thread.subject,
      status: thread.status,
      source: thread.source,
      createdAt: thread.created_at,
    },
    messages: messages.map((message) => ({
      direction: message.direction,
      authorEmail: message.author_email,
      authorName: message.author_name,
      subject: message.subject,
      bodyText: message.body_text,
      createdAt: message.created_at,
    })),
    orderReferences,
    matchingOrders,
  } satisfies Json;

  return {
    thread,
    messages,
    orderReferences,
    matchingOrders,
    snapshot,
  };
}

async function findMatchingOrders(
  thread: SupportThread,
  messages: SupportMessage[],
  supabase: SupabaseClient,
  orderReferences = extractOrderReferences(thread, messages),
) {
  const ordersById = new Map<string, SupportOrderContext>();

  const { data: emailOrders, error: emailOrdersError } = await supabase
    .from("ticketing_orders")
    .select(
      `
        id,
        order_reference,
        buyer_email,
        buyer_name,
        status,
        ticket_email_status,
        ticket_email_error,
        amount_total_cents,
        currency,
        stripe_payment_intent_id,
        created_at,
        ticketing_tickets (
          status
        )
      `,
    )
    .ilike("buyer_email", thread.customer_email)
    .order("created_at", { ascending: false })
    .limit(5);

  if (emailOrdersError) {
    throw emailOrdersError;
  }

  for (const order of normalizeOrderRows(emailOrders ?? [])) {
    ordersById.set(order.id, order);
  }

  if (orderReferences.length > 0) {
    const { data: referenceOrders, error: referenceOrdersError } =
      await supabase
        .from("ticketing_orders")
        .select(
          `
          id,
          order_reference,
          buyer_email,
          buyer_name,
          status,
          ticket_email_status,
          ticket_email_error,
          amount_total_cents,
          currency,
          stripe_payment_intent_id,
          created_at,
          ticketing_tickets (
            status
          )
        `,
        )
        .in("order_reference", orderReferences)
        .order("created_at", { ascending: false });

    if (referenceOrdersError) {
      throw referenceOrdersError;
    }

    for (const order of normalizeOrderRows(referenceOrders ?? [])) {
      ordersById.set(order.id, order);
    }
  }

  return Array.from(ordersById.values()).sort((first, second) =>
    second.created_at.localeCompare(first.created_at),
  );
}

function normalizeOrderRows(rows: unknown[]): SupportOrderContext[] {
  return rows.map((row) => {
    const order = row as SupportOrderContext & {
      ticketing_tickets?: { status: string }[] | { status: string } | null;
    };
    const tickets = Array.isArray(order.ticketing_tickets)
      ? order.ticketing_tickets
      : order.ticketing_tickets
        ? [order.ticketing_tickets]
        : [];

    return {
      id: order.id,
      order_reference: order.order_reference,
      buyer_email: order.buyer_email,
      buyer_name: order.buyer_name,
      status: order.status,
      ticket_email_status: order.ticket_email_status,
      ticket_email_error: order.ticket_email_error,
      amount_total_cents: order.amount_total_cents,
      currency: order.currency,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
      created_at: order.created_at,
      ticket_count: tickets.length,
      ticket_statuses: tickets.map((ticket) => ticket.status),
    };
  });
}

function extractOrderReferences(
  thread: SupportThread,
  messages: SupportMessage[],
) {
  const inboundMessages = messages.filter(
    (message) => message.direction === "inbound",
  );
  const values = [
    thread.subject,
    ...inboundMessages.flatMap((message) => [
      message.subject ?? "",
      message.body_text,
    ]),
  ];
  const references = new Set<string>();

  for (const value of values) {
    for (const match of value.matchAll(orderReferencePattern)) {
      references.add(match[0].toUpperCase());
    }
  }

  return Array.from(references);
}

async function generateStructuredSupportSuggestion(
  context: Awaited<ReturnType<typeof findSupportContext>>,
) {
  const openai = new OpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  });

  const completion = await openai.chat.completions.create({
    model: supportAiModel,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "support_ai_suggestion",
        strict: true,
        schema: supportAiJsonSchema,
      },
    },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      {
        role: "user",
        content: JSON.stringify(context.snapshot),
      },
    ],
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error("OpenAI returned an empty support AI suggestion.");
  }

  return supportAiResponseSchema.parse(JSON.parse(content));
}

function requireExplicitOrderReferenceForOrderActions(
  result: SupportAiResponse,
  context: Awaited<ReturnType<typeof findSupportContext>>,
): SupportAiResponse {
  if (
    context.orderReferences.length > 0 ||
    !isOrderSpecificSuggestion(result)
  ) {
    return result;
  }

  return {
    ...result,
    recommendedAction: {
      type: "ask_for_more_info",
      reason:
        "The customer did not provide an order reference, so ask them to confirm the order reference and email address used for the order before acting on any email-matched order.",
      orderReference: null,
    },
    draftReply: buildOrderReferenceRequestDraft(context.thread.customer_name),
    confidence: Math.min(result.confidence, 0.75),
    needsHumanCheck: true,
  };
}

function applyRefundPolicyForClearlyIneligibleRequests(
  result: SupportAiResponse,
  context: Awaited<ReturnType<typeof findSupportContext>>,
): SupportAiResponse {
  if (
    result.category !== "refund_request" ||
    context.orderReferences.length === 0 ||
    !isPersonalAttendanceRefundRequest(context.messages)
  ) {
    return result;
  }

  return {
    ...result,
    recommendedAction: {
      type: "manual_review",
      reason:
        "The customer requested a refund because they can no longer attend, which is not eligible under the refund terms.",
      orderReference: context.orderReferences[0] ?? null,
    },
    draftReply: buildIneligibleAttendanceRefundDraft(
      context.thread.customer_name,
    ),
    confidence: Math.max(result.confidence, 0.8),
    needsHumanCheck: true,
  };
}

function isOrderSpecificSuggestion(result: SupportAiResponse) {
  return (
    result.category === "missing_tickets" ||
    result.category === "refund_request" ||
    result.recommendedAction.type === "resend_tickets" ||
    result.recommendedAction.type === "refund_order"
  );
}

function isPersonalAttendanceRefundRequest(messages: SupportMessage[]) {
  const inboundText = messages
    .filter((message) => message.direction === "inbound")
    .map((message) => `${message.subject ?? ""}\n${message.body_text}`)
    .join("\n")
    .toLowerCase();

  return [
    /\bcan(?:not|'t)\s+(?:go|attend|make\s+it)\b/,
    /\bno\s+longer\s+(?:able\s+to\s+)?(?:go|attend|make\s+it)\b/,
    /\bunable\s+to\s+(?:go|attend|make\s+it)\b/,
    /\bpersonal\s+circumstances?\b/,
    /\bchange\s+of\s+mind\b/,
  ].some((pattern) => pattern.test(inboundText));
}

function formatSupportAiDraftReply(
  result: SupportAiResponse,
  customerName: string | null,
): SupportAiResponse {
  return {
    ...result,
    draftReply: buildGreetingDraft(result.draftReply, customerName),
  };
}

function buildGreetingDraft(draftReply: string, customerName: string | null) {
  const body = stripLeadingGreeting(draftReply).trim();

  return [buildCustomerGreeting(customerName), body].join("\n\n");
}

function stripLeadingGreeting(draftReply: string) {
  return draftReply.trim().replace(/^hi\s+[^,\n]+,\s*/i, "");
}

function buildCustomerGreeting(customerName: string | null) {
  const firstName = customerName?.trim().split(/\s+/)[0];

  return firstName ? `Hi ${firstName},` : "Hi there,";
}

function buildOrderReferenceRequestDraft(customerName: string | null) {
  return [
    buildCustomerGreeting(customerName),
    "Could you please send through your order reference (it starts with CT-) and the email address used for the order?",
    "Once I have those details, I can look into this for you.",
  ].join("\n\n");
}

function buildIneligibleAttendanceRefundDraft(customerName: string | null) {
  return [
    buildCustomerGreeting(customerName),
    "Thanks for reaching out. Refunds are only available if the event is cancelled or rescheduled.",
    "As this request is because you can no longer attend, it does not fall within our refund terms.",
  ].join("\n\n");
}

function buildSystemPrompt() {
  return [
    "You are an internal support triage assistant for Come Thru, an event ticketing app.",
    "You help the admin review support requests. You never send emails, issue refunds, or resend tickets yourself.",
    "Return only the requested structured JSON.",
    "",
    "Business rules:",
    "- Only treat an order as actionable when the customer explicitly provided its order reference in orderReferences.",
    "- If the customer says they cannot find tickets and there is a paid matching order for an explicitly provided order reference, recommend resend_tickets.",
    "- If the customer asks for a refund, only recommend refund_order when the request is clearly eligible: cancelled event or rescheduled event. If they say they cannot attend, cannot go anymore, changed their mind, or cite personal circumstances, recommend manual_review and draft a reply saying that does not fall within the refund terms; do not ask them whether cancelled/rescheduled terms apply.",
    "- If there is no matching order for a ticket/order-specific request, recommend ask_for_more_info.",
    "- If the customer asks for a refund, resending tickets, missing tickets, or another order-specific action and orderReferences is empty, always recommend ask_for_more_info and draft a reply asking for both the order reference and the email address used for the order.",
    "- If there are multiple matching orders, in your draft response ask for more information - specifically the order reference, recommend ask_for_more_info.",
    "- Always start draftReply with the customer first-name greeting on its own line, then a blank line, then the response body: Hi FirstName,",
    "- Keep draft replies concise, warm, and practical. Do not promise a refund unless eligibility is clear.",
    "- Do not include sign-off/footer text; the app adds support footer text when sending.",
    "",
    "Known FAQ:",
    ...faqItems.map((item) => `- ${item.question} ${item.answer}`),
    "",
    "Refund terms: Refunds are only available where the event has been cancelled, or the event has been rescheduled. Refunds are not granted for incorrect purchases, change of mind, or personal circumstances preventing attendance.",
  ].join("\n");
}

function findRecommendedOrder(
  orderReference: string | null,
  orders: SupportOrderContext[],
) {
  if (!orderReference) {
    return null;
  }

  const normalizedReference = orderReference.toUpperCase();

  return (
    orders.find(
      (order) => order.order_reference.toUpperCase() === normalizedReference,
    ) ?? null
  );
}
