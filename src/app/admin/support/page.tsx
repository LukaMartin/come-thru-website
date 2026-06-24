import type { Metadata } from "next";
import { AdminSupportInbox } from "@/components/AdminSupportInbox";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminShell } from "@/components/admin/AdminShell";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import {
  type SupportMessage,
  type SupportThread,
  type AdminSupportMessage,
  type AdminSupportThread,
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
  }

  const messagesByThreadId = messageRows.reduce((messagesByThread, message) => {
    const existingMessages = messagesByThread.get(message.thread_id) ?? [];

    existingMessages.push(normalizeSupportMessage(message));
    messagesByThread.set(message.thread_id, existingMessages);

    return messagesByThread;
  }, new Map<string, AdminSupportMessage[]>());

  const threads: AdminSupportThread[] = threadRows.map((thread) => ({
    ...normalizeSupportThread(thread),
    messages: messagesByThreadId.get(thread.id) ?? [],
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
