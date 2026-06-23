import type { Metadata } from "next";
import Link from "next/link";
import { AdminSupportInbox } from "@/components/AdminSupportInbox";
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
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 py-8 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f3eadb]/12 pb-6">
          <div>
            <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-[-0.06em]">
              Support
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#f3eadb]/64">
              Review customer requests, reply from support, and keep thread
              status up to date.
            </p>
          </div>
          <Link
            href="/admin/events"
            className="group relative flex w-fit items-center gap-1.5 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7c7ad] transition-colors duration-300 hover:text-[#f8f0e3] after:absolute after:bottom-0 after:right-0 after:h-px after:w-[calc(100%-1.25rem)] after:bg-current after:transition-all after:duration-400 after:ease-out hover:after:w-full"
          >
            <span className="hover:-mr-5 opacity-0 transition-all duration-300 ease-out group-hover:mr-0 group-hover:opacity-100">
              &larr;
            </span>
            <span>Back to events</span>
          </Link>
        </header>

        <AdminSupportInbox initialThreads={threads} />
      </div>
    </main>
  );
}
