import type { Metadata } from "next";
import { AdminSupportInbox } from "@/components/admin/AdminSupportInbox";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminShell } from "@/components/admin/AdminShell";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import {
  type SupportMessage,
  type SupportAiSuggestion,
  type SupportThread,
  type AdminSupportMessage,
  type AdminSupportAiSuggestion,
  type AdminSupportThread,
  normalizeSupportAiSuggestion,
  normalizeSupportMessage,
  normalizeSupportThread,
} from "@/lib/support";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Support | Come Thru",
};

export default async function AdminSupportPage() {
  await requireAdmin();

  const { supabase } = await createSessionAuthClient();
  const { data: threadData, error: threadError } = await supabase
    .from("support_threads")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (threadError) {
    throw threadError;
  }

  const threadRows = (threadData ?? []) as SupportThread[];
  const threadIds = threadRows.map((thread) => thread.id);
  let messageRows: SupportMessage[] = [];
  let suggestionRows: SupportAiSuggestion[] = [];
  let ticketEmailSentAtByOrderId = new Map<string, string | null>();

  if (threadIds.length > 0) {
    const { data: messageData, error: messageError } = await supabase
      .from("support_messages")
      .select("*")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true });

    if (messageError) {
      throw messageError;
    }

    messageRows = (messageData ?? []) as SupportMessage[];

    const { data: suggestionData, error: suggestionError } = await supabase
      .from("support_ai_suggestions")
      .select("*")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false });

    if (suggestionError) {
      throw suggestionError;
    }

    suggestionRows = (suggestionData ?? []) as SupportAiSuggestion[];

    const matchedOrderIds = Array.from(
      new Set(
        suggestionRows
          .map((suggestion) => suggestion.matched_order_id)
          .filter((orderId): orderId is string => Boolean(orderId)),
      ),
    );

    if (matchedOrderIds.length > 0) {
      const { data: orderData, error: orderError } = await supabase
        .from("ticketing_orders")
        .select("id, ticket_email_sent_at")
        .in("id", matchedOrderIds);

      if (orderError) {
        throw orderError;
      }

      ticketEmailSentAtByOrderId = new Map(
        (orderData ?? []).map((order) => [
          order.id,
          order.ticket_email_sent_at,
        ]),
      );
    }
  }

  const messagesByThreadId = messageRows.reduce((messagesByThread, message) => {
    const existingMessages = messagesByThread.get(message.thread_id) ?? [];

    existingMessages.push(normalizeSupportMessage(message));
    messagesByThread.set(message.thread_id, existingMessages);

    return messagesByThread;
  }, new Map<string, AdminSupportMessage[]>());

  const latestSuggestionByThreadId = suggestionRows.reduce(
    (suggestionsByThread, suggestion) => {
      if (!suggestionsByThread.has(suggestion.thread_id)) {
        const normalizedSuggestion = normalizeSupportAiSuggestion(suggestion);

        suggestionsByThread.set(suggestion.thread_id, {
          ...normalizedSuggestion,
          matchedOrderTicketEmailSentAt: suggestion.matched_order_id
            ? (ticketEmailSentAtByOrderId.get(suggestion.matched_order_id) ??
              null)
            : null,
        });
      }

      return suggestionsByThread;
    },
    new Map<string, AdminSupportAiSuggestion>(),
  );

  const threads: AdminSupportThread[] = threadRows.map((thread) => ({
    ...normalizeSupportThread(thread),
    messages: messagesByThreadId.get(thread.id) ?? [],
    aiSuggestion: latestSuggestionByThreadId.get(thread.id) ?? null,
  }));

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Operations"
        title="Support inbox"
        description="Review customer requests, reply from support, and keep thread status up to date."
      />
      <AdminSupportInbox initialThreads={threads} />
    </AdminShell>
  );
}
