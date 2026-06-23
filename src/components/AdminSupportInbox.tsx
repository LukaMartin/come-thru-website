"use client";

import { useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiInbox,
  FiMail,
  FiMessageSquare,
  FiSearch,
  FiSend,
  FiUser,
} from "react-icons/fi";
import {
  type SupportStatus,
  supportStatuses,
  type AdminSupportThread,
  type SupportThread,
  type SupportMessage,
  normalizeSupportMessage,
  normalizeSupportThread,
} from "@/lib/support";
import { formatEventDate } from "@/lib/tickets";

type AdminSupportInboxProps = {
  initialThreads: AdminSupportThread[];
};

const statusLabels: Record<SupportStatus, string> = {
  new: "New",
  needs_reply: "Needs reply",
  resolved: "Resolved",
};

const statusPillClasses: Record<SupportStatus, string> = {
  new: "border-sky-300/24 bg-sky-400/10 text-sky-100",
  needs_reply: "border-amber-300/28 bg-amber-400/10 text-amber-100",
  resolved: "border-emerald-300/24 bg-emerald-400/10 text-emerald-100",
};

const statusDotClasses: Record<SupportStatus, string> = {
  new: "bg-sky-300 shadow-sky-300/40",
  needs_reply: "bg-amber-300 shadow-amber-300/40",
  resolved: "bg-emerald-300 shadow-emerald-300/40",
};

export function AdminSupportInbox({ initialThreads }: AdminSupportInboxProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState(
    initialThreads[0]?.id ?? null,
  );
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<SupportStatus | null>(
    null,
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const matchesStatus =
        statusFilter === "all" || thread.status === statusFilter;
      const matchesSearch =
        !normalizedSearchQuery ||
        [
          `#${thread.referenceNumber}`,
          thread.subject,
          thread.customerEmail,
          thread.customerName,
        ].some((value) => value?.toLowerCase().includes(normalizedSearchQuery));

      return matchesStatus && matchesSearch;
    });
  }, [normalizedSearchQuery, statusFilter, threads]);
  const selectedThread =
    filteredThreads.find((thread) => thread.id === selectedThreadId) ??
    filteredThreads[0] ??
    null;
  const threadStats = useMemo(
    () => [
      {
        label: "Total threads",
        value: threads.length,
        icon: FiInbox,
      },
      {
        label: "Needs attention",
        value: threads.filter(
          (thread) =>
            thread.status === "new" || thread.status === "needs_reply",
        ).length,
        icon: FiAlertCircle,
      },
      {
        label: "Resolved",
        value: threads.filter((thread) => thread.status === "resolved").length,
        icon: FiCheckCircle,
      },
    ],
    [threads],
  );
  const statusCounts = useMemo(
    () =>
      supportStatuses.reduce(
        (counts, status) => ({
          ...counts,
          [status]: threads.filter((thread) => thread.status === status).length,
        }),
        {} as Record<SupportStatus, number>,
      ),
    [threads],
  );
  const selectedCustomerLabel = selectedThread
    ? selectedThread.customerName || selectedThread.customerEmail
    : "";
  const replyCharacterCount = replyBody.trim().length;

  async function sendReply(nextStatus?: SupportStatus) {
    if (!selectedThread || !replyBody.trim()) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          bodyText: replyBody,
          nextStatus,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        thread?: SupportThread;
        message?: SupportMessage;
      };

      if (!response.ok || !payload.thread || !payload.message) {
        throw new Error(payload.error ?? "Could not send reply.");
      }

      const updatedThread = normalizeSupportThread(payload.thread);
      const savedMessage = normalizeSupportMessage(payload.message);

      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === updatedThread.id
            ? {
                ...thread,
                ...updatedThread,
                messages: [...thread.messages, savedMessage],
              }
            : thread,
        ),
      );
      setReplyBody("");
      toast.success("Reply sent.");
    } catch (error) {
      Sentry.captureException(error);
      toast.error(error instanceof Error ? error.message : "Could not reply.");
    } finally {
      setIsSending(false);
    }
  }

  async function updateThreadStatus(status: SupportStatus) {
    if (!selectedThread) {
      return;
    }

    setUpdatingStatus(status);

    try {
      const response = await fetch("/api/support/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          status,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        thread?: SupportThread;
      };

      if (!response.ok || !payload.thread) {
        throw new Error(payload.error ?? "Could not update status.");
      }

      const updatedThread = normalizeSupportThread(payload.thread);

      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === updatedThread.id
            ? { ...thread, ...updatedThread, messages: thread.messages }
            : thread,
        ),
      );
      toast.success(`Marked ${statusLabels[status].toLowerCase()}.`);
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : "Could not update status.",
      );
    } finally {
      setUpdatingStatus(null);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {threadStats.map((stat) => (
          <div
            key={stat.label}
            className="border border-[#f3eadb]/14 bg-black/20 p-4 transition-colors duration-300 hover:border-[#f3eadb]/24 hover:bg-black/30 md:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-black leading-none tracking-tighter text-[#f8f0e3]">
                  {stat.value}
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center border border-[#f3eadb]/12 bg-[#f3eadb]/4.5 text-[#d7c7ad]/78 rounded-full">
                <stat.icon aria-hidden className="size-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="grid min-h-136 content-start overflow-hidden border border-[#f3eadb]/12 bg-black/20 shadow-2xl shadow-black/35 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]">
          <div className="grid gap-3 border-b border-[#f3eadb]/10 pb-4">
            <div className="px-4 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[#d7c7ad]/70">
                    Inbox
                  </p>
                  <p className="mt-1 text-xs text-[#f3eadb]/45">
                    {filteredThreads.length} of {threads.length} threads
                  </p>
                </div>
                <span className="rounded-full border border-[#f3eadb]/12 bg-[#f3eadb]/4.5 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#f3eadb]/62">
                  Live
                </span>
              </div>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search #, email, subject"
                    className={[
                      "w-full rounded-md border border-[#f3eadb]/14 bg-black/20 px-3 py-2.5 text-sm font-medium text-[#f8f0e3] outline-none transition placeholder:text-[#f3eadb]/38 focus:border-[#f3eadb]/38 focus:bg-black/35",
                      searchQuery ? "pr-3" : "pr-10",
                    ].join(" ")}
                  />
                  {!searchQuery ? (
                    <FiSearch
                      aria-hidden
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#f3eadb]/45"
                    />
                  ) : null}
                </div>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="rounded-md border border-[#f3eadb]/14 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f8f0e3] transition hover:bg-[#f3eadb]/8"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 px-4">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={[
                  "flex h-10 items-center justify-between gap-2 border px-3 text-left text-[0.58rem] font-semibold uppercase tracking-[0.12em] transition",
                  statusFilter === "all"
                    ? "border-[#d7c7ad]/30 bg-[#f3eadb]/12 text-[#f8f0e3]"
                    : "border-[#f3eadb]/12 bg-black/10 text-[#f3eadb]/52 hover:border-[#f3eadb]/26 hover:bg-black/25 hover:text-[#f8f0e3]",
                ].join(" ")}
              >
                <span>All</span>
                <span className="text-[#f3eadb]/45">{threads.length}</span>
              </button>
              {supportStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={[
                    "flex h-10 items-center justify-between gap-2 border px-3 text-left text-[0.58rem] font-semibold uppercase tracking-[0.12em] transition",
                    statusFilter === status
                      ? "border-[#d7c7ad]/30 bg-[#f3eadb]/12 text-[#f8f0e3]"
                      : "border-[#f3eadb]/12 bg-black/10 text-[#f3eadb]/52 hover:border-[#f3eadb]/26 hover:bg-black/25 hover:text-[#f8f0e3]",
                  ].join(" ")}
                >
                  <span>{statusLabels[status as SupportStatus]}</span>
                  <span className="text-[#f3eadb]/45">
                    {statusCounts[status as SupportStatus]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid content-start gap-2 overflow-y-auto p-3">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={[
                  "group relative overflow-hidden border p-4 text-left transition-colors duration-300",
                  selectedThread?.id === thread.id
                    ? "border-[#f3eadb]/28 bg-black/30"
                    : "border-[#f3eadb]/14 bg-black/20 hover:border-[#f3eadb]/24 hover:bg-black/30",
                ].join(" ")}
              >
                <span
                  className={`absolute left-0 top-0 h-full w-1 opacity-80 ${statusDotClasses[thread.status]}`}
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="mt-1 truncate text-base font-black uppercase tracking-[-0.03em] text-[#f8f0e3]">
                      {thread.subject}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${statusPillClasses[thread.status]}`}
                  >
                    {statusLabels[thread.status]}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#f3eadb]/42 transition group-hover:text-[#f3eadb]/58">
                  <span className="inline-flex items-center gap-1.5">
                    <FiClock aria-hidden className="size-3.5" />
                    {formatEventDate(thread.lastMessageAt)}
                  </span>
                </div>
              </button>
            ))}

            {filteredThreads.length === 0 ? (
              <div className="grid min-h-56 place-items-center border border-[#f3eadb]/14 bg-black/20 p-5 text-center">
                <div>
                  <FiInbox
                    aria-hidden
                    className="mx-auto size-7 text-[#d7c7ad]/50"
                  />
                  <p className="mt-3 text-sm font-semibold text-[#f8f0e3]">
                    No matching threads
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#f3eadb]/50">
                    Try a different status or search term.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 overflow-hidden border border-[#f3eadb]/12 bg-[linear-gradient(180deg,rgba(11,10,8,0.99),rgba(8,7,6,0.99))] shadow-2xl shadow-black/35">
          {selectedThread ? (
            <div className="grid min-h-136 grid-rows-[auto_minmax(0,1fr)_auto]">
              <header className="border-b border-[#f3eadb]/10 bg-black/20 p-5 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[0.62rem] uppercase tracking-[0.32em] text-[#d7c7ad]">
                        Support #{selectedThread.referenceNumber}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${statusPillClasses[selectedThread.status]}`}
                      >
                        {statusLabels[selectedThread.status]}
                      </span>
                    </div>
                    <h1 className="mt-4 text-3xl font-black uppercase leading-none tracking-tighter text-[#f8f0e3] md:text-4xl">
                      {selectedThread.subject}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#f3eadb]/58">
                      <span className="inline-flex items-center gap-2 border border-[#f3eadb]/10 bg-black/20 px-3 py-1.5">
                        <FiUser
                          aria-hidden
                          className="size-3.5 text-[#d7c7ad]/70"
                        />
                        {selectedThread.customerName || "No name"}
                      </span>
                      <span className="inline-flex items-center gap-2 border border-[#f3eadb]/10 bg-black/20 px-3 py-1.5">
                        <FiMail
                          aria-hidden
                          className="size-3.5 text-[#d7c7ad]/70"
                        />
                        {selectedThread.customerEmail}
                      </span>
                      <span className="inline-flex items-center gap-2 border border-[#f3eadb]/10 bg-black/20 px-3 py-1.5">
                        <FiMessageSquare
                          aria-hidden
                          className="size-3.5 text-[#d7c7ad]/70"
                        />
                        {selectedThread.messages.length} messages
                      </span>
                    </div>
                  </div>
                </div>
              </header>

              <div className="grid content-start gap-4 overflow-y-auto p-5 md:p-6">
                {selectedThread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={[
                      "max-w-3xl border p-4 transition-colors duration-300",
                      message.direction === "outbound"
                        ? "ml-auto border-[#f3eadb]/22 bg-black/30"
                        : "border-[#f3eadb]/14 bg-black/20",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#d7c7ad]/72">
                        {message.direction === "outbound"
                          ? "You"
                          : message.authorName ||
                            message.authorEmail ||
                            "Customer"}
                      </p>
                      <p className="text-xs text-[#f3eadb]/42">
                        {formatEventDate(message.createdAt)}
                      </p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-[#f8f0e3]/86">
                      {message.bodyText}
                    </p>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 border-t border-[#f3eadb]/10 bg-black/20 p-4 md:p-5">
                <div className="overflow-hidden rounded-md border border-[#f3eadb]/14 bg-black/20 transition focus-within:border-[#f3eadb]/38 focus-within:bg-black/35">
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder={`Reply to ${selectedCustomerLabel}...`}
                    rows={6}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-[#f8f0e3] outline-none placeholder:text-[#f3eadb]/38"
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-[#f3eadb]/8 px-4 py-2 text-xs text-[#f3eadb]/42">
                    <span>Replies are emailed to the customer.</span>
                    <span>{replyCharacterCount} chars</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={isSending || !replyBody.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f8f0e3] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiSend aria-hidden className="size-4" />
                    {isSending ? "Sending" : "Send reply"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateThreadStatus("resolved")}
                    disabled={
                      Boolean(updatingStatus) ||
                      selectedThread.status === "resolved"
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-300/24 bg-emerald-400/8 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-400/12 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiCheck aria-hidden className="size-4" />
                    Mark resolved
                  </button>
                  {selectedThread.status === "resolved" ? (
                    <p className="ml-auto text-xs text-emerald-100/62">
                      This thread is already resolved.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-136 place-items-center p-8 text-center">
              <div>
                <FiInbox
                  aria-hidden
                  className="mx-auto size-10 text-[#d7c7ad]/50"
                />
                <p className="mt-4 text-sm font-semibold text-[#f8f0e3]">
                  No support threads yet
                </p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#f3eadb]/50">
                  New contact form messages will show up here with reply and
                  status tools ready to go.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
