import type { Database } from "@/lib/database.types";

type SupportThreadRow = Database["public"]["Tables"]["support_threads"]["Row"];
type SupportMessageRow =
  Database["public"]["Tables"]["support_messages"]["Row"];
type SupportAiSuggestionRow =
  Database["public"]["Tables"]["support_ai_suggestions"]["Row"];

export type SupportStatus = SupportThreadRow["status"];
export type SupportSource = SupportThreadRow["source"];
export type SupportMessageDirection = SupportMessageRow["direction"];
export type SupportThread = SupportThreadRow;
export type SupportMessage = SupportMessageRow;
export type SupportAiSuggestion = SupportAiSuggestionRow;
export type SupportAiSuggestionStatus = SupportAiSuggestionRow["status"];
export type SupportAiDraftReplyOutcome =
  SupportAiSuggestionRow["draft_reply_outcome"];
export type SupportAiCategory = NonNullable<SupportAiSuggestionRow["category"]>;
export type SupportAiPriority = NonNullable<SupportAiSuggestionRow["priority"]>;
export type SupportAiRecommendedAction = NonNullable<
  SupportAiSuggestionRow["recommended_action"]
>;

export const supportStatuses = [
  "new",
  "needs_reply",
  "resolved",
] as const satisfies readonly SupportThreadRow["status"][];

export type AdminSupportMessage = {
  id: string;
  threadId: string;
  direction: SupportMessageDirection;
  authorEmail: string | null;
  authorName: string | null;
  subject: string | null;
  bodyText: string;
  createdAt: string;
};

export type AdminSupportThread = {
  id: string;
  referenceNumber: number;
  customerEmail: string;
  customerName: string | null;
  subject: string;
  status: SupportStatus;
  source: SupportSource;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
  messages: AdminSupportMessage[];
  aiSuggestion: AdminSupportAiSuggestion | null;
};

export type AdminSupportAiSuggestion = {
  id: string;
  threadId: string;
  triggerMessageId: string | null;
  matchedOrderId: string | null;
  matchedOrderTicketEmailSentAt: string | null;
  provider: string;
  model: string;
  status: SupportAiSuggestionStatus;
  category: SupportAiCategory | null;
  priority: SupportAiPriority | null;
  recommendedAction: SupportAiRecommendedAction | null;
  summary: string | null;
  actionReason: string | null;
  draftReply: string | null;
  draftReplyOutcome: SupportAiDraftReplyOutcome;
  draftReplyOutcomeAt: string | null;
  draftReplyUsedMessageId: string | null;
  confidence: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export const statusLabels: Record<SupportStatus, string> = {
  new: "New",
  needs_reply: "Needs reply",
  resolved: "Resolved",
};

export function isSupportStatus(value: string): value is SupportStatus {
  return supportStatuses.some((status) => status === value);
}

export function formatSupportReference(referenceNumber: number) {
  return `#${referenceNumber}`;
}

export function formatSupportSubject(
  thread: Pick<SupportThread, "subject" | "reference_number">,
) {
  const subject = /^re:/i.test(thread.subject)
    ? thread.subject
    : `Re: ${thread.subject}`;

  return `${subject} [Support ${formatSupportReference(thread.reference_number)}]`;
}

export function appendSupportFooter(bodyText: string) {
  return [
    bodyText.trim(),
    "",
    "Kind regards,",
    "Luka",
  ].join("\n");
}

export function normalizeSupportMessage(
  message: SupportMessage,
): AdminSupportMessage {
  return {
    id: message.id,
    threadId: message.thread_id,
    direction: message.direction,
    authorEmail: message.author_email,
    authorName: message.author_name,
    subject: message.subject,
    bodyText: message.body_text,
    createdAt: message.created_at,
  };
}

export function normalizeSupportThread(
  thread: SupportThread,
): Omit<AdminSupportThread, "messages" | "aiSuggestion"> {
  return {
    id: thread.id,
    referenceNumber: thread.reference_number,
    customerEmail: thread.customer_email,
    customerName: thread.customer_name,
    subject: thread.subject,
    status: thread.status,
    source: thread.source,
    lastMessageAt: thread.last_message_at,
    closedAt: thread.closed_at,
    createdAt: thread.created_at,
  };
}

export function normalizeSupportAiSuggestion(
  suggestion: SupportAiSuggestion,
): AdminSupportAiSuggestion {
  return {
    id: suggestion.id,
    threadId: suggestion.thread_id,
    triggerMessageId: suggestion.trigger_message_id,
    matchedOrderId: suggestion.matched_order_id,
    matchedOrderTicketEmailSentAt: null,
    provider: suggestion.provider,
    model: suggestion.model,
    status: suggestion.status,
    category: suggestion.category,
    priority: suggestion.priority,
    recommendedAction: suggestion.recommended_action,
    summary: suggestion.summary,
    actionReason: suggestion.action_reason,
    draftReply: suggestion.draft_reply,
    draftReplyOutcome: suggestion.draft_reply_outcome,
    draftReplyOutcomeAt: suggestion.draft_reply_outcome_at,
    draftReplyUsedMessageId: suggestion.draft_reply_used_message_id,
    confidence: suggestion.confidence,
    errorMessage: suggestion.error_message,
    createdAt: suggestion.created_at,
    completedAt: suggestion.completed_at,
  };
}
