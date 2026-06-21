import type {
  AdminEventOrder,
  AdminEventOrderItem,
  OrderStatus,
} from "./AdminEventOrders";
import { useState } from "react";
import { useId } from "react";
import { FiChevronDown, FiMail, FiRotateCcw } from "react-icons/fi";
import { formatEventDate, formatMoney } from "@/lib/tickets";

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
  refundError,
  isRefunding,
  onResend,
  isResending,
  resendError,
}: AdminOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const isRefunded = order.status === "refunded";
  const canRefund = !isRefunded && Boolean(order.stripePaymentIntentId);
  const canResend = order.status === "paid";
  const orderName = order.name?.trim() || "No name";
  const orderEmail = order.email?.trim() || "No email";

  return (
    <article
      className={`border bg-black/20 transition-colors duration-300 ${
        isOpen ? "border-[#f3eadb]/28 bg-black/30" : "border-[#f3eadb]/14"
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 p-5 text-left outline-none transition-colors duration-300 hover:bg-[#f3eadb]/[0.035] focus-visible:bg-[#f3eadb]/4.5 md:p-6"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black uppercase tracking-[-0.03em]">
              {order.reference}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${getStatusPillClass(order.status)}`}
            >
              {order.status}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[#f3eadb]/58">
            {orderName} / {orderEmail}
          </p>
          <p className="mt-1 truncate text-xs text-[#f3eadb]/44">
            {getOrderItemsSummary(order.items)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-[#f8f0e3]">
              {formatMoney(order.totalCents, order.currency)}
            </p>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-[#d7c7ad]/62">
              {formatEventDate(order.placedAt)}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f3eadb]/14 p-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f3eadb]/64 transition duration-300 hover:border-[#f3eadb]/28 hover:text-[#f8f0e3]">
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
          <div className="grid gap-5 border-t border-[#f3eadb]/10 p-5 md:grid-cols-[minmax(0,1fr)_13rem] md:p-6">
            <div className="grid gap-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
                    Order name
                  </p>
                  <p className="mt-1 font-semibold text-[#f8f0e3]">
                    {orderName}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
                    Order email
                  </p>
                  <p className="mt-1 wrap-break-word font-semibold text-[#f8f0e3]">
                    {orderEmail}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
                    Placed
                  </p>
                  <p className="mt-1 font-semibold text-[#f8f0e3]">
                    {formatEventDate(order.placedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
                    Total
                  </p>
                  <p className="mt-1 font-semibold text-[#f8f0e3]">
                    {formatMoney(order.totalCents, order.currency)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
                  Order items
                </p>
                <div className="grid gap-2">
                  {order.items.map((item) => (
                    <div
                      key={`${order.id}-${item.name}`}
                      className="flex items-center justify-between gap-4 border border-[#f3eadb]/10 bg-black/20 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-[#f8f0e3]">
                        {item.name}
                      </span>
                      <span className="text-[#f3eadb]/62">
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#f8f0e3] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white disabled:hover:bg-[#f8f0e3] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FiMail
                    aria-hidden="true"
                    className={isResending ? "size-4 animate-pulse" : "size-4"}
                  />
                  {isResending ? "Resending" : "Resend"}
                </button>
                {resendError ? (
                  <p className="mt-2 text-xs leading-5 text-red-200">
                    {resendError}
                  </p>
                ) : null}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onRefund(order)}
                  disabled={!canRefund || isRefunding}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    !canRefund
                      ? "cursor-not-allowed border-[#f3eadb]/10 bg-[#f3eadb]/5 text-[#f3eadb]/34"
                      : "border-red-300/22 bg-red-400/4.5 text-red-100 hover:border-red-200/38 hover:bg-red-400/8 disabled:cursor-wait disabled:opacity-70",
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
                {refundError ? (
                  <p className="mt-2 text-xs leading-5 text-red-200">
                    {refundError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
