import type { Database } from "@/lib/database.types";

type SupportThreadRow = Database["public"]["Tables"]["support_threads"]["Row"];
type SupportMessageRow =
  Database["public"]["Tables"]["support_messages"]["Row"];

export type SupportStatus = SupportThreadRow["status"];
export type SupportSource = SupportThreadRow["source"];
export type SupportMessageDirection = SupportMessageRow["direction"];
export type SupportThread = SupportThreadRow;
export type SupportMessage = SupportMessageRow;

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

export function appendSupportFooter(bodyText: string, referenceNumber: number) {
  return [
    bodyText.trim(),
    "",
    "Kind regards,",
    "Come Thru Support",
    "",
    `Support reference: ${formatSupportReference(referenceNumber)}`,
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
): Omit<AdminSupportThread, "messages"> {
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
