"use client";

import { useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import AdminOrderCard from "@/components/AdminOrderCard";
import {
  FiCheckCircle,
  FiRotateCcw,
  FiSearch,
  FiShoppingBag,
} from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";

export type OrderStatus = "paid" | "refunded";

export type AdminEventOrderItem = {
  name: string;
  quantity: number;
};

export type AdminEventOrder = {
  id: string;
  reference: string;
  email: string | null;
  name: string | null;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  placedAt: string;
  stripePaymentIntentId: string | null;
  items: AdminEventOrderItem[];
};

type AdminEventOrdersProps = {
  orders: AdminEventOrder[];
};

const ordersPerPage = 6;

export function AdminEventOrders({
  orders: initialOrders,
}: AdminEventOrdersProps) {
  const [orderPage, setOrderPage] = useState(1);
  const [orders, setOrders] = useState(initialOrders);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const orderStats = [
    { label: "Total orders", value: orders.length, icon: FiShoppingBag },
    {
      label: "Paid",
      value: orders.filter((order) => order.status === "paid").length,
      icon: FiCheckCircle,
    },
    {
      label: "Refunded",
      value: orders.filter((order) => order.status === "refunded").length,
      icon: FiRotateCcw,
    },
  ];
  const filteredOrders = useMemo(() => {
    if (!normalizedSearchQuery) {
      return orders;
    }

    return orders.filter((order) =>
      [order.name, order.email].some((value) =>
        value?.toLowerCase().includes(normalizedSearchQuery),
      ),
    );
  }, [normalizedSearchQuery, orders]);
  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const visibleOrders = filteredOrders.slice(
    (orderPage - 1) * ordersPerPage,
    orderPage * ordersPerPage,
  );

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
          stripePaymentIntentId: order.stripePaymentIntentId,
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

      if (!response.ok) {
        toast.error("Failed to resend tickets.");
        throw new Error("Failed to resend tickets.");
      }

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

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {orderStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-admin-border bg-admin-surface p-4 shadow-sm shadow-black/20 transition hover:border-admin-border-strong hover:bg-admin-surface-elevated"
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

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id="order-search"
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setOrderPage(1);
            }}
            placeholder="Search by name or email"
            className={twMerge(
              "w-full rounded-xl border border-admin-border bg-black/20 px-3 py-2.5 pr-10 text-sm text-admin-text outline-none transition placeholder:text-admin-subtle focus:border-admin-border-strong focus:bg-black/30",
              searchQuery && "pr-3",
            )}
            autoComplete="off"
          />
          <FiSearch
            aria-hidden="true"
            className={twMerge(
              "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-admin-subtle",
              searchQuery && "hidden",
            )}
          />
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

      {visibleOrders.map((order) => (
        <AdminOrderCard
          key={order.id}
          order={order}
          onRefund={(selectedOrder) => void refundOrder(selectedOrder)}
          isRefunding={refundingOrderId === order.id}
          onResend={(selectedOrder) => void resendTickets(selectedOrder)}
          isResending={resendingOrderId === order.id}
        />
      ))}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-black/10 p-6 text-sm text-admin-muted">
          No paid or refunded orders for this event yet.
        </div>
      ) : null}

      {orders.length > 0 && filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-black/10 p-6 text-sm text-admin-muted">
          No orders match that name or email.
        </div>
      ) : null}

      {filteredOrders.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-admin-border bg-admin-surface p-3 text-sm text-admin-muted shadow-sm shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {(orderPage - 1) * ordersPerPage + 1}-
            {Math.min(orderPage * ordersPerPage, filteredOrders.length)} of{" "}
            {filteredOrders.length} orders
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
              disabled={orderPage === 1}
              className="rounded-xl border border-admin-border px-3 py-2 text-xs font-medium text-admin-muted transition hover:bg-admin-surface-elevated hover:text-admin-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setOrderPage((page) => Math.min(totalOrderPages, page + 1))
              }
              disabled={orderPage === totalOrderPages}
              className="rounded-xl border border-admin-border px-3 py-2 text-xs font-medium text-admin-muted transition hover:bg-admin-surface-elevated hover:text-admin-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
