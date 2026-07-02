"use client";

import { useMemo } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiInbox,
  FiMail,
  FiMessageSquare,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUser,
  FiZap,
} from "react-icons/fi";
import {
  type AdminSupportAiSuggestion,
  type SupportAiCategory,
  type SupportAiPriority,
  type SupportAiRecommendedAction,
  type SupportStatus,
  supportStatuses,
  type AdminSupportThread,
  statusLabels,
} from "@/lib/support";
import { formatEventDate, formatTicketResendWait } from "@/lib/tickets";
import useAdminSupport from "@/hooks/useAdminSupport";
import useTicketResendAvailability from "@/hooks/useTicketResendAvailability";

type AdminSupportInboxProps = {
  initialThreads: AdminSupportThread[];
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

const aiCategoryLabels: Record<SupportAiCategory, string> = {
  missing_tickets: "Missing tickets",
  refund_request: "Refund request",
  event_question: "Event question",
  complaint: "Complaint",
  spam: "Spam",
  other: "Other",
};

const aiPriorityLabels: Record<SupportAiPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

const aiPriorityClasses: Record<SupportAiPriority, string> = {
  low: "border-sky-400/25 bg-sky-400/10 text-sky-100",
  normal: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  high: "border-red-400/25 bg-red-400/10 text-red-100",
};

const aiActionLabels: Record<SupportAiRecommendedAction, string> = {
  resend_tickets: "Resend tickets",
  refund_order: "Refund order",
  ask_for_more_info: "Ask for more info",
  manual_review: "Manual review",
  no_action: "No action",
};

const draftOutcomeLabels: Record<
  AdminSupportAiSuggestion["draftReplyOutcome"],
  string
> = {
  unused: "Draft unused",
  used: "Draft used",
  rejected: "Draft rejected",
};

export function AdminSupportInbox({ initialThreads }: AdminSupportInboxProps) {
  const {
    threads,
    filteredThreads,
    replyBody,
    setReplyBody,
    isSending,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    setSelectedThreadId,
    selectedThread,
    rejectingSuggestionId,
    suggestedAction,
    updatingStatus,
    rejectAiDraft,
    sendReply,
    updateThreadStatus,
    resendSuggestedTickets,
    refundSuggestedOrder,
  } = useAdminSupport({ initialThreads });

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
  const selectedAiSuggestion = selectedThread?.aiSuggestion ?? null;
  const selectedDraftOutcome = selectedAiSuggestion?.draftReplyOutcome;
  const isSelectedDraftClosed =
    Boolean(selectedDraftOutcome) && selectedDraftOutcome !== "unused";
  const selectedResendAvailability = useTicketResendAvailability(
    selectedAiSuggestion?.matchedOrderTicketEmailSentAt ?? null,
  );

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

          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto p-3">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={[
                  "group relative min-h-28 shrink-0 overflow-hidden rounded-xl border p-4 text-left transition",
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
                {selectedAiSuggestion ? (
                  <section className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4 shadow-sm shadow-violet-950/20">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-100/80">
                          <FiZap aria-hidden className="size-3.5" />
                          AI assist
                        </p>
                        <h2 className="mt-2 text-sm font-semibold text-admin-text">
                          Support triage suggestion
                        </h2>
                      </div>
                      <span className="rounded-full border border-violet-300/20 bg-black/15 px-2.5 py-1 text-xs font-medium capitalize text-violet-100">
                        {selectedAiSuggestion.status}
                      </span>
                    </div>

                    {selectedAiSuggestion.status === "pending" ? (
                      <p className="mt-3 text-sm leading-6 text-admin-muted">
                        AI triage is running in the background. Refresh the
                        inbox shortly to review the draft and recommendation.
                      </p>
                    ) : null}

                    {selectedAiSuggestion.status === "failed" ? (
                      <p className="mt-3 text-sm leading-6 text-red-200/80">
                        AI triage failed
                        {selectedAiSuggestion.errorMessage
                          ? `: ${selectedAiSuggestion.errorMessage}`
                          : "."}
                      </p>
                    ) : null}

                    {selectedAiSuggestion.status === "completed" ? (
                      <div className="mt-4 grid gap-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedAiSuggestion.category ? (
                            <span className="rounded-full border border-violet-300/20 bg-black/15 px-2.5 py-1 text-xs font-medium text-violet-100">
                              {aiCategoryLabels[selectedAiSuggestion.category]}
                            </span>
                          ) : null}
                          {selectedAiSuggestion.priority ? (
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${aiPriorityClasses[selectedAiSuggestion.priority]}`}
                            >
                              {aiPriorityLabels[selectedAiSuggestion.priority]}{" "}
                              priority
                            </span>
                          ) : null}
                        </div>

                        {selectedAiSuggestion.summary ? (
                          <div>
                            <p className="text-xs font-medium text-admin-subtle">
                              Summary
                            </p>
                            <p className="mt-1 text-sm leading-6 text-admin-text">
                              {selectedAiSuggestion.summary}
                            </p>
                          </div>
                        ) : null}

                        {selectedAiSuggestion.recommendedAction ? (
                          <div>
                            <p className="text-xs font-medium text-admin-subtle">
                              Recommended action
                            </p>
                            <p className="mt-1 text-sm leading-6 text-admin-text">
                              {
                                aiActionLabels[
                                  selectedAiSuggestion.recommendedAction
                                ]
                              }
                            </p>
                          </div>
                        ) : null}

                        {selectedAiSuggestion.draftReply ? (
                          <div>
                            <p className="text-xs font-medium text-admin-subtle">
                              Draft reply
                            </p>
                            <p className="mt-1 text-sm leading-6 text-admin-text">
                              {selectedAiSuggestion.draftReply}
                            </p>
                            <p className="mt-2 text-xs text-admin-subtle">
                              {
                                draftOutcomeLabels[
                                  selectedAiSuggestion.draftReplyOutcome
                                ]
                              }
                            </p>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2">
                          {selectedAiSuggestion.draftReply ? (
                            <button
                              type="button"
                              onClick={() =>
                                void sendReply(
                                  undefined,
                                  selectedAiSuggestion.draftReply ?? "",
                                  selectedAiSuggestion.id,
                                )
                              }
                              disabled={isSending || isSelectedDraftClosed}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/10 px-3 py-2 text-xs font-medium text-violet-100 transition hover:border-violet-200/40 hover:bg-violet-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {selectedAiSuggestion.draftReplyOutcome === "used"
                                ? "Draft used"
                                : "Use draft"}
                            </button>
                          ) : null}
                          {selectedAiSuggestion.draftReply ? (
                            <button
                              type="button"
                              onClick={() =>
                                void rejectAiDraft(selectedAiSuggestion)
                              }
                              disabled={
                                isSending ||
                                Boolean(rejectingSuggestionId) ||
                                isSelectedDraftClosed
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-admin-border bg-black/15 px-3 py-2 text-xs font-medium text-admin-muted transition hover:border-admin-danger/50 hover:bg-black/25 hover:text-admin-danger/70 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {selectedAiSuggestion.draftReplyOutcome ===
                              "rejected"
                                ? "Draft rejected"
                                : rejectingSuggestionId ===
                                    selectedAiSuggestion.id
                                  ? "Rejecting"
                                  : "Reject draft"}
                            </button>
                          ) : null}
                          {selectedAiSuggestion.recommendedAction ===
                            "resend_tickets" &&
                          selectedAiSuggestion.matchedOrderId ? (
                            <button
                              type="button"
                              onClick={() =>
                                void resendSuggestedTickets(
                                  selectedAiSuggestion,
                                )
                              }
                              disabled={
                                Boolean(suggestedAction) ||
                                !selectedResendAvailability?.canResend
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:border-amber-200/40 hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FiRefreshCw aria-hidden className="size-3.5" />
                              {selectedResendAvailability &&
                              !selectedResendAvailability.canResend
                                ? `Available in ${formatTicketResendWait(
                                    selectedResendAvailability.remainingMs,
                                  )}`
                                : suggestedAction === "resend_tickets"
                                  ? "Resending"
                                  : "Resend tickets"}
                            </button>
                          ) : null}
                          {selectedAiSuggestion.recommendedAction ===
                            "refund_order" &&
                          selectedAiSuggestion.matchedOrderId ? (
                            <button
                              type="button"
                              onClick={() =>
                                void refundSuggestedOrder(selectedAiSuggestion)
                              }
                              disabled={Boolean(suggestedAction)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-xs font-medium text-red-100 transition hover:border-red-200/40 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {suggestedAction === "refund_order"
                                ? "Refunding"
                                : "Refund order"}
                            </button>
                          ) : null}
                        </div>

                        <p className="text-xs text-admin-subtle">
                          Confidence{" "}
                          {selectedAiSuggestion.confidence !== null
                            ? `${Math.round(selectedAiSuggestion.confidence * 100)}%`
                            : "unknown"}{" "}
                          / {selectedAiSuggestion.model}
                        </p>
                      </div>
                    ) : null}
                  </section>
                ) : (
                  <section className="rounded-2xl border border-admin-border bg-black/10 p-4">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-admin-subtle">
                      <FiZap aria-hidden className="size-3.5" />
                      AI assist
                    </p>
                    <p className="mt-2 text-sm leading-6 text-admin-muted">
                      No AI suggestion is stored for this thread.
                    </p>
                  </section>
                )}

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
