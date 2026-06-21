"use client";

import { useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import AdminOrderCard from "@/components/AdminOrderCard";
import { TbSearch } from "react-icons/tb";
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
        {[
          { label: "Total orders", value: orders.length },
          {
            label: "Paid",
            value: orders.filter((order) => order.status === "paid").length,
          },
          {
            label: "Refunded",
            value: orders.filter((order) => order.status === "refunded").length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-[#f3eadb]/14 bg-black/20 p-4 transition-colors duration-300 hover:border-[#f3eadb]/24 hover:bg-black/30 md:p-5"
          >
            <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-black leading-none tracking-tighter text-[#f8f0e3]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id="order-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or email"
            className={twMerge(
              "w-full rounded-md border border-[#f3eadb]/14 bg-black/20 px-3 py-2.5 pr-10 text-sm font-medium text-[#f8f0e3] outline-none transition placeholder:text-[#f3eadb]/38 focus:border-[#f3eadb]/38 focus:bg-black/35",
              searchQuery && "pr-3",
            )}
            autoComplete="off"
          />
          <TbSearch
            aria-hidden="true"
            className={twMerge(
              "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#f3eadb]/45",
              searchQuery && "hidden",
            )}
          />
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
        <div className="border border-[#f3eadb]/14 bg-black/20 p-6 text-sm text-[#f3eadb]/62">
          No paid or refunded orders for this event yet.
        </div>
      ) : null}

      {orders.length > 0 && filteredOrders.length === 0 ? (
        <div className="border border-[#f3eadb]/14 bg-black/20 p-6 text-sm text-[#f3eadb]/62">
          No orders match that name or email.
        </div>
      ) : null}

      {filteredOrders.length > 0 ? (
        <div className="flex flex-col gap-3 border border-[#f3eadb]/10 bg-black/20 p-3 text-sm text-[#f3eadb]/62 sm:flex-row sm:items-center sm:justify-between">
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
              className="rounded-md border border-[#f3eadb]/14 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f8f0e3] transition hover:bg-[#f3eadb]/8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setOrderPage((page) => Math.min(totalOrderPages, page + 1))
              }
              disabled={orderPage === totalOrderPages}
              className="rounded-md border border-[#f3eadb]/14 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f8f0e3] transition hover:bg-[#f3eadb]/8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
