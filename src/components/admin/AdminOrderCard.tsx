import type {
  AdminEventOrder,
  AdminEventOrderItem,
  OrderStatus,
} from "./AdminEventOrders";
import { useState } from "react";
import { useId } from "react";
import { FiChevronDown, FiMail, FiRotateCcw } from "react-icons/fi";
import {
  formatEventDate,
  formatMoney,
  formatTicketResendWait,
} from "@/lib/tickets";
import useTicketResendAvailability from "@/hooks/useTicketResendAvailability";

type AdminOrderCardProps = {
  order: AdminEventOrder;
  onRefund: (order: AdminEventOrder) => void;
  refundError?: string;
  isRefunding: boolean;
  onResend: (order: AdminEventOrder) => void;
  isResending: boolean;
  resendError?: string;
};

function getOrderItemsSummary(items: AdminEventOrderItem[]) {
  return items.map((item) => `${item.quantity} x ${item.name}`).join(", ");
}

function getStatusPillClass(status: OrderStatus) {
  if (status === "paid") {
    return "border-emerald-300/24 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "refunded") {
    return "border-red-300/24 bg-red-400/10 text-red-100";
  }

  return "border-red-300/24 bg-red-400/10 text-red-100";
}

export default function AdminOrderCard({
  order,
  onRefund,
  isRefunding,
  onResend,
  isResending,
}: AdminOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const isRefunded = order.status === "refunded";
  const canRefund = !isRefunded && Boolean(order.stripePaymentIntentId);
  const resendAvailability = useTicketResendAvailability(
    order.ticketEmailSentAt,
  );
  const canResend =
    order.status === "paid" && Boolean(resendAvailability?.canResend);
  const orderName = order.name?.trim() || "No name";
  const orderEmail = order.email?.trim() || "No email";
  const resendLabel =
    resendAvailability && !resendAvailability.canResend
      ? `Available in ${formatTicketResendWait(resendAvailability.remainingMs)}`
      : isResending
        ? "Resending"
        : "Resend";

  return (
    <article
      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
        isOpen
          ? "border-admin-border-strong bg-admin-surface-elevated"
          : "border-admin-border bg-black/10"
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 p-5 text-left outline-none transition-colors duration-300 hover:bg-admin-surface-elevated focus-visible:bg-admin-surface-elevated"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-[-0.03em] text-admin-text">
              {order.reference}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getStatusPillClass(order.status)}`}
            >
              {order.status}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-admin-muted">
            {orderName} / {orderEmail}
          </p>
          <p className="mt-1 truncate text-xs text-admin-subtle">
            {getOrderItemsSummary(order.items)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-admin-text">
              {formatMoney(order.totalCents, order.currency)}
            </p>
            <p className="mt-1 text-xs text-admin-subtle">
              {formatEventDate(order.placedAt)}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-admin-border p-2 text-xs font-medium text-admin-muted transition duration-300 hover:border-admin-border-strong hover:text-admin-text">
            <FiChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </div>
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-5 border-t border-admin-border p-5 md:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="grid gap-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-admin-subtle">
                    Order name
                  </p>
                  <p className="mt-1 font-semibold text-admin-text">
                    {orderName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-admin-subtle">
                    Order email
                  </p>
                  <p className="mt-1 wrap-break-word font-semibold text-admin-text">
                    {orderEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-admin-subtle">
                    Placed
                  </p>
                  <p className="mt-1 font-semibold text-admin-text">
                    {formatEventDate(order.placedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-admin-subtle">Total</p>
                  <p className="mt-1 font-semibold text-admin-text">
                    {formatMoney(order.totalCents, order.currency)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-admin-subtle">
                  Order items
                </p>
                <div className="grid gap-2">
                  {order.items.map((item) => (
                    <div
                      key={`${order.id}-${item.name}`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-admin-border bg-black/10 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-admin-text">
                        {item.name}
                      </span>
                      <span className="text-admin-muted">
                        x {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 self-end">
              <div>
                <button
                  type="button"
                  onClick={() => onResend(order)}
                  disabled={!canResend || isResending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-admin-primary px-4 py-2.5 text-sm font-medium text-admin-primary-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-admin-primary"
                >
                  <FiMail
                    aria-hidden="true"
                    className={isResending ? "size-4 animate-pulse" : "size-4"}
                  />
                  {resendLabel}
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onRefund(order)}
                  disabled={!canRefund || isRefunding}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                    !canRefund
                      ? "cursor-not-allowed border-admin-border bg-black/10 text-admin-subtle"
                      : "border-red-300/25 bg-red-400/5 text-red-100 hover:border-red-200/40 hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-70",
                  ].join(" ")}
                >
                  <FiRotateCcw
                    aria-hidden
                    className={isRefunding ? "size-4 animate-spin" : "size-4"}
                  />
                  {isRefunded
                    ? "Refunded"
                    : isRefunding
                      ? "Refunding"
                      : order.stripePaymentIntentId
                        ? "Refund"
                        : "No payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
