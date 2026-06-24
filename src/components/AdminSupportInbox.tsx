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
  new: "border-sky-400/25 bg-sky-400/10 text-sky-100",
  needs_reply: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  resolved: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
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
    <section className="grid h-[calc(100dvh-13rem)] grid-rows-[auto_minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-3 gap-3">
        {threadStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-admin-border bg-admin-surface p-4 shadow-sm shadow-black/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-admin-muted">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-admin-text">
                  {stat.value}
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-admin-border bg-admin-surface-elevated text-admin-muted">
                <stat.icon aria-hidden className="size-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 grid-cols-[24rem_minmax(0,1fr)] gap-5">
        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-admin-border bg-admin-surface shadow-sm shadow-black/20">
          <div className="grid gap-4 border-b border-admin-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-admin-text">Inbox</p>
                <p className="mt-1 text-xs text-admin-subtle">
                  {filteredThreads.length} of {threads.length} threads
                </p>
              </div>
              <span className="rounded-full border border-admin-border bg-admin-surface-elevated px-3 py-1 text-xs font-medium text-admin-muted">
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
                    "w-full rounded-xl border border-admin-border bg-black/20 px-3 py-2.5 text-sm text-admin-text outline-none transition placeholder:text-admin-subtle focus:border-admin-border-strong focus:bg-black/30",
                    searchQuery ? "pr-3" : "pr-10",
                  ].join(" ")}
                />
                {!searchQuery ? (
                  <FiSearch
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-admin-subtle"
                  />
                ) : null}
              </div>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-xl border border-admin-border px-3 py-2 text-xs font-medium text-admin-muted transition hover:bg-admin-surface-elevated hover:text-admin-text"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={[
                  "flex h-10 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-medium transition",
                  statusFilter === "all"
                    ? "border-admin-border-strong bg-admin-surface-elevated text-admin-text"
                    : "border-admin-border bg-black/10 text-admin-muted hover:bg-black/20 hover:text-admin-text",
                ].join(" ")}
              >
                <span>All</span>
                <span className="text-admin-subtle">{threads.length}</span>
              </button>
              {supportStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={[
                    "flex h-10 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-medium transition",
                    statusFilter === status
                      ? "border-admin-border-strong bg-admin-surface-elevated text-admin-text"
                      : "border-admin-border bg-black/10 text-admin-muted hover:bg-black/20 hover:text-admin-text",
                  ].join(" ")}
                >
                  <span>{statusLabels[status as SupportStatus]}</span>
                  <span className="text-admin-subtle">
                    {statusCounts[status as SupportStatus]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 content-start gap-2 overflow-y-auto p-3 [scrollbar-color:rgb(63_63_70)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700/70 [&::-webkit-scrollbar-track]:bg-transparent">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={[
                  "group relative overflow-hidden rounded-xl border p-4 text-left transition",
                  selectedThread?.id === thread.id
                    ? "border-admin-border-strong bg-admin-surface-elevated"
                    : "border-admin-border bg-black/10 hover:bg-admin-surface-elevated",
                ].join(" ")}
              >
                <span
                  className={`absolute left-0 top-0 h-full w-1 opacity-80 ${statusDotClasses[thread.status]}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-admin-subtle">
                      #{thread.referenceNumber}
                    </p>
                    <h2 className="mt-1 truncate text-sm font-semibold text-admin-text">
                      {thread.subject}
                    </h2>
                    <p className="mt-1 truncate text-xs text-admin-muted">
                      {thread.customerName || thread.customerEmail}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${statusPillClasses[thread.status]}`}
                  >
                    {statusLabels[thread.status]}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-admin-subtle">
                  <span className="inline-flex items-center gap-1.5">
                    <FiClock aria-hidden className="size-3.5" />
                    {formatEventDate(thread.lastMessageAt)}
                  </span>
                </div>
              </button>
            ))}

            {filteredThreads.length === 0 ? (
              <div className="grid min-h-56 place-items-center rounded-xl border border-admin-border bg-black/10 p-5 text-center">
                <div>
                  <FiInbox
                    aria-hidden
                    className="mx-auto size-7 text-admin-subtle"
                  />
                  <p className="mt-3 text-sm font-semibold text-admin-text">
                    No matching threads
                  </p>
                  <p className="mt-2 text-xs leading-5 text-admin-muted">
                    Try a different status or search term.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-h-0 min-w-0 overflow-hidden rounded-2xl border border-admin-border bg-admin-surface shadow-sm shadow-black/20">
          {selectedThread ? (
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
              <header className="border-b border-admin-border bg-admin-surface-elevated/70 p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-medium text-admin-subtle">
                      Support #{selectedThread.referenceNumber}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClasses[selectedThread.status]}`}
                    >
                      {statusLabels[selectedThread.status]}
                    </span>
                  </div>
                  <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-admin-text">
                    {selectedThread.subject}
                  </h1>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-admin-muted">
                    <span className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-black/15 px-3 py-1.5">
                      <FiUser
                        aria-hidden
                        className="size-3.5 text-admin-subtle"
                      />
                      {selectedThread.customerName || "No name"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-black/15 px-3 py-1.5">
                      <FiMail
                        aria-hidden
                        className="size-3.5 text-admin-subtle"
                      />
                      {selectedThread.customerEmail}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-black/15 px-3 py-1.5">
                      <FiMessageSquare
                        aria-hidden
                        className="size-3.5 text-admin-subtle"
                      />
                      {selectedThread.messages.length} messages
                    </span>
                  </div>
                </div>
              </header>

              <div className="grid content-start gap-4 overflow-y-auto p-6">
                {selectedThread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={[
                      "max-w-3xl rounded-2xl border p-4 transition",
                      message.direction === "outbound"
                        ? "ml-auto border-admin-border-strong bg-admin-surface-elevated"
                        : "border-admin-border bg-black/10",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-medium text-admin-muted">
                        {message.direction === "outbound"
                          ? "You"
                          : message.authorName ||
                            message.authorEmail ||
                            "Customer"}
                      </p>
                      <p className="text-xs text-admin-subtle">
                        {formatEventDate(message.createdAt)}
                      </p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-admin-text">
                      {message.bodyText}
                    </p>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 border-t border-admin-border bg-admin-surface-elevated/70 p-5">
                <div className="overflow-hidden rounded-2xl border border-admin-border bg-black/15 transition focus-within:border-admin-border-strong focus-within:bg-black/25">
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder={`Reply to ${selectedCustomerLabel}...`}
                    rows={5}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-admin-text outline-none placeholder:text-admin-subtle"
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-admin-border px-4 py-2 text-xs text-admin-subtle">
                    <span>Replies are emailed to the customer.</span>
                    <span>{replyCharacterCount} chars</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={isSending || !replyBody.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-admin-primary px-4 py-2.5 text-sm font-medium text-admin-primary-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiCheck aria-hidden className="size-4" />
                    Mark resolved
                  </button>
                  {selectedThread.status === "resolved" ? (
                    <p className="ml-auto text-xs text-emerald-100/65">
                      This thread is already resolved.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-0 place-items-center p-8 text-center">
              <div>
                <FiInbox
                  aria-hidden
                  className="mx-auto size-10 text-admin-subtle"
                />
                <p className="mt-4 text-sm font-semibold text-admin-text">
                  No support threads yet
                </p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-admin-muted">
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
