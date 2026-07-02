import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { getAdminAuthState } from "@/lib/admin-auth";
import { sendSupportReplyEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import {
  appendSupportFooter,
  formatSupportSubject,
  normalizeSupportAiSuggestion,
  type SupportAiSuggestion,
  supportStatuses,
  type SupportThread,
} from "@/lib/support";

const replySchema = z.object({
  threadId: z.uuid(),
  bodyText: z.string().trim().min(1).max(2000),
  nextStatus: z.enum(supportStatuses).optional(),
  aiSuggestionId: z.uuid().optional(),
});

export async function POST(request: Request) {
  const auth = await getAdminAuthState();

  if (auth.status !== "admin") {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = replySchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid support reply request." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: threadData, error: threadError } = await supabase
    .from("support_threads")
    .select("*")
    .eq("id", parsed.data.threadId)
    .single();

  if (threadError) {
    throw threadError;
  }

  const thread = threadData as SupportThread;
  const nextStatus = parsed.data.nextStatus ?? "resolved";
  const bodyWithFooter = appendSupportFooter(parsed.data.bodyText);
  let aiSuggestion: SupportAiSuggestion | null = null;

  if (parsed.data.aiSuggestionId) {
    const { data: suggestionData, error: suggestionError } = await supabase
      .from("support_ai_suggestions")
      .select("*")
      .eq("id", parsed.data.aiSuggestionId)
      .eq("thread_id", thread.id)
      .eq("draft_reply_outcome", "unused")
      .maybeSingle();

    if (suggestionError) {
      throw suggestionError;
    }

    if (!suggestionData) {
      return Response.json(
        { error: "This AI draft has already been used or rejected." },
        { status: 409 },
      );
    }

    aiSuggestion = suggestionData as SupportAiSuggestion;
  }

  try {
    const providerMessageId = await sendSupportReplyEmail({
      to: thread.customer_email,
      subject: formatSupportSubject(thread),
      bodyText: bodyWithFooter,
    });

    const now = new Date().toISOString();

    const { data: message, error: messageError } = await supabase
      .from("support_messages")
      .insert({
        thread_id: thread.id,
        direction: "outbound",
        author_email: auth.user.email ?? null,
        author_name: auth.user.email ?? "Admin",
        subject: formatSupportSubject(thread),
        body_text: parsed.data.bodyText,
        provider: "resend",
        provider_message_id: providerMessageId,
        created_at: now,
      })
      .select("*")
      .single();

    if (messageError) {
      throw messageError;
    }

    const { data: updatedThread, error: updateError } = await supabase
      .from("support_threads")
      .update({
        status: nextStatus,
        last_message_at: now,
        closed_at: nextStatus === "resolved" ? now : null,
      })
      .eq("id", thread.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    let updatedAiSuggestion: SupportAiSuggestion | null = null;

    if (aiSuggestion) {
      const { data: suggestionData, error: suggestionError } = await supabase
        .from("support_ai_suggestions")
        .update({
          draft_reply_outcome: "used",
          draft_reply_outcome_at: now,
          draft_reply_used_message_id: message.id,
        })
        .eq("id", aiSuggestion.id)
        .eq("draft_reply_outcome", "unused")
        .select("*")
        .single();

      if (suggestionError) {
        throw suggestionError;
      }

      updatedAiSuggestion = suggestionData as SupportAiSuggestion;
    }

    return Response.json({
      ok: true,
      thread: updatedThread,
      message,
      aiSuggestion: updatedAiSuggestion
        ? normalizeSupportAiSuggestion(updatedAiSuggestion)
        : null,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        "app.area": "support_reply",
        "support.thread_id": thread.id,
      },
    });

    return Response.json(
      { error: "Support reply could not be sent." },
      { status: 500 },
    );
  }
}
