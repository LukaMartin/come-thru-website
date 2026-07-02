import { AdminEventOrder } from "@/components/admin/AdminEventOrders";
import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";

type UseAdminOrdersProps = {
  initialOrders: AdminEventOrder[];
};

export default function useAdminOrders({ initialOrders }: UseAdminOrdersProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);

  async function refundOrder(order: AdminEventOrder) {
    setRefundingOrderId(order.id);

    try {
      if (!order.stripePaymentIntentId) {
        throw new Error("Order has no Stripe payment intent.");
      }

      const response = await fetch("/api/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Refund failed.");
      }

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? { ...currentOrder, status: "refunded" }
            : currentOrder,
        ),
      );

      toast.success(`${order.reference} has been refunded.`);
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : "Could not refund order.",
      );
    } finally {
      setRefundingOrderId(null);
    }
  }

  async function resendTickets(order: AdminEventOrder) {
    setResendingOrderId(order.id);

    try {
      const response = await fetch("/api/resend-tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        ticketEmailSentAt?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to resend tickets.");
      }

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                ticketEmailSentAt:
                  payload.ticketEmailSentAt ?? new Date().toISOString(),
              }
            : currentOrder,
        ),
      );
      toast.success(`${order.reference} tickets have been resent`);
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : "Could not resend tickets.",
      );
    } finally {
      setResendingOrderId(null);
    }
  }

  return {
    orders,
    refundingOrderId,
    resendingOrderId,
    refundOrder,
    resendTickets,
  };
}
