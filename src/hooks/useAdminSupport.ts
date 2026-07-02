import {
  AdminSupportAiSuggestion,
  AdminSupportThread,
  normalizeSupportMessage,
  normalizeSupportThread,
  SupportMessage,
  SupportStatus,
  SupportThread,
  statusLabels,
} from "@/lib/support";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";

type UseAdminSupportProps = {
  initialThreads: AdminSupportThread[];
};

export default function useAdminSupport({
  initialThreads,
}: UseAdminSupportProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(
    initialThreads[0]?.id ?? null,
  );
  const [suggestedAction, setSuggestedAction] = useState<
    "resend_tickets" | "refund_order" | null
  >(null);
  const [updatingStatus, setUpdatingStatus] = useState<SupportStatus | null>(
    null,
  );
  const [rejectingSuggestionId, setRejectingSuggestionId] = useState<
    string | null
  >(null);

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

  async function sendReply(
    nextStatus?: SupportStatus,
    bodyText = replyBody,
    aiSuggestionId?: string,
  ) {
    const trimmedBodyText = bodyText.trim();

    if (!selectedThread || !trimmedBodyText) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          bodyText: trimmedBodyText,
          nextStatus,
          aiSuggestionId,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        thread?: SupportThread;
        message?: SupportMessage;
        aiSuggestion?: AdminSupportAiSuggestion | null;
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
                aiSuggestion: payload.aiSuggestion
                  ? {
                      ...payload.aiSuggestion,
                      matchedOrderTicketEmailSentAt:
                        thread.aiSuggestion?.matchedOrderTicketEmailSentAt ??
                        payload.aiSuggestion.matchedOrderTicketEmailSentAt,
                    }
                  : thread.aiSuggestion,
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

  async function rejectAiDraft(suggestion: AdminSupportAiSuggestion) {
    setRejectingSuggestionId(suggestion.id);

    try {
      const response = await fetch("/api/support/ai-suggestion/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionId: suggestion.id,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        aiSuggestion?: AdminSupportAiSuggestion;
      };

      if (!response.ok || !payload.aiSuggestion) {
        throw new Error(payload.error ?? "Could not reject draft.");
      }

      const updatedAiSuggestion = payload.aiSuggestion;

      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === updatedAiSuggestion.threadId
            ? {
                ...thread,
                aiSuggestion: {
                  ...updatedAiSuggestion,
                  matchedOrderTicketEmailSentAt:
                    thread.aiSuggestion?.matchedOrderTicketEmailSentAt ??
                    updatedAiSuggestion.matchedOrderTicketEmailSentAt,
                },
              }
            : thread,
        ),
      );
      toast.success("Draft rejected.");
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : "Could not reject draft.",
      );
    } finally {
      setRejectingSuggestionId(null);
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

  async function resendSuggestedTickets(suggestion: AdminSupportAiSuggestion) {
    if (!suggestion.matchedOrderId) {
      return;
    }

    setSuggestedAction("resend_tickets");

    try {
      const response = await fetch("/api/resend-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: suggestion.matchedOrderId,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        ticketEmailSentAt?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not resend tickets.");
      }

      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.aiSuggestion?.matchedOrderId === suggestion.matchedOrderId
            ? {
                ...thread,
                aiSuggestion: {
                  ...thread.aiSuggestion,
                  matchedOrderTicketEmailSentAt:
                    payload.ticketEmailSentAt ?? new Date().toISOString(),
                },
              }
            : thread,
        ),
      );
      toast.success("Tickets resent.");
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : "Could not resend tickets.",
      );
    } finally {
      setSuggestedAction(null);
    }
  }

  async function refundSuggestedOrder(suggestion: AdminSupportAiSuggestion) {
    if (!suggestion.matchedOrderId) {
      return;
    }

    setSuggestedAction("refund_order");

    try {
      const response = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: suggestion.matchedOrderId,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not refund order.");
      }

      toast.success("Order refunded.");
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : "Could not refund order.",
      );
    } finally {
      setSuggestedAction(null);
    }
  }

  return {
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
  };
}
