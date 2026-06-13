"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/tickets";
import { twMerge } from "tailwind-merge";
import { TicketOption } from "@/lib/checkout";
import { MAX_QUANTITY_PER_TRANSACTION } from "@/lib/checkout";

type CheckoutFormProps = {
  eventId: string;
  isFree: boolean;
  tickets: TicketOption[];
};

type QuantityStepperProps = {
  disabled: boolean;
  max: number;
  ticketId: string;
  value: number;
  isSoldOut: boolean;
  onChange: (ticketId: string, quantity: number) => void;
};

function QuantityStepper({
  disabled,
  max,
  ticketId,
  value,
  isSoldOut,
  onChange,
}: QuantityStepperProps) {
  const canDecrease = !disabled && value > 0;
  const canIncrease = !disabled && value < max;

  return (
    <div
      className={twMerge(
        "flex h-10 shrink-0 items-center rounded-full border border-[#f3eadb]/12 bg-black/50 p-1 shadow-inner shadow-white/5 lg:h-12",
        isSoldOut && "opacity-35",
      )}
    >
      <button
        type="button"
        disabled={!canDecrease}
        aria-label="Decrease ticket quantity"
        onClick={() => onChange(ticketId, Math.max(value - 1, 0))}
        className="flex size-8 items-center justify-center rounded-full text-lg font-semibold leading-none text-[#f8f0e3] transition duration-300 hover:bg-[#f3eadb]/10 disabled:cursor-not-allowed disabled:text-[#f3eadb]/24 lg:size-10 disabled:hover:bg-transparent"
      >
        −
      </button>
      <span className="w-7 text-center text-sm font-semibold text-[#f8f0e3] lg:w-9 lg:text-base">
        {value}
      </span>
      <button
        type="button"
        disabled={!canIncrease}
        aria-label="Increase ticket quantity"
        onClick={() => onChange(ticketId, Math.min(value + 1, max))}
        className="flex size-8 items-center justify-center rounded-full text-lg font-semibold leading-none text-[#f8f0e3] transition duration-300 hover:bg-[#f3eadb]/10 disabled:cursor-not-allowed disabled:text-[#f3eadb]/24 lg:size-10 disabled:hover:bg-transparent"
      >
        +
      </button>
    </div>
  );
}

export function CheckoutForm({ eventId, isFree, tickets }: CheckoutFormProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const total = useMemo(
    () =>
      tickets.reduce(
        (sum, ticket) =>
          sum + (quantities[ticket.id] ?? 0) * ticket.price_cents,
        0,
      ),
    [quantities, tickets],
  );
  const isSoldOut = tickets.every(
    (ticket) => ticket.capacity - ticket.sold <= 0,
  );
  const saleWindow = useMemo(() => {
    const ticket = tickets[0];

    return {
      startsAt: ticket?.sales_start_at
        ? new Date(ticket.sales_start_at).getTime()
        : null,
      endsAt: ticket?.sales_end_at
        ? new Date(ticket.sales_end_at).getTime()
        : null,
    };
  }, [tickets]);
  const isSaleActive =
    (saleWindow.startsAt !== null && currentTime >= saleWindow.startsAt) &&
    (saleWindow.endsAt !== null && currentTime <= saleWindow.endsAt);

  useEffect(() => {
    const nextBoundary = [saleWindow.startsAt, saleWindow.endsAt]
      .filter((time): time is number => time !== null && time > currentTime)
      .sort((a, b) => a - b)[0];

    if (!nextBoundary) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setCurrentTime(Date.now()),
      nextBoundary - currentTime,
    );

    return () => window.clearTimeout(timeoutId);
  }, [currentTime, saleWindow.endsAt, saleWindow.startsAt]);

  async function startCheckout() {
    if (!isSaleActive) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const items = tickets
      .map((ticket) => ({
        ticketTypeId: ticket.id,
        quantity: quantities[ticket.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items }),
      });

      const payload = (await response.json()) as {
        checkoutPath?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutPath) {
        throw new Error(payload.error ?? "Unable to start checkout.");
      }

      window.location.href = payload.checkoutPath;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout failed.",
      );
      setIsLoading(false);
    }
  }

  if (isFree) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden border border-[#f3eadb]/12 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.34),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(215,199,173,0.16),transparent_28%),rgba(0,0,0,0.28)] p-4 lg:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[#d7c7ad]/18 blur-2xl" />
          <div className="relative">
            <p className="text-sm leading-6 text-[#f3eadb]/62 md:text-base md:leading-8 small-laptop:leading-7">
              This event is free to attend, there are no ticket options or
              payment steps. Check the event details, bring your friends and
              come through.
            </p>
          </div>
        </div>
        <p className="px-2 text-center text-[0.7rem] leading-5 text-[#f3eadb]/42 lg:text-xs">
          Entry is still subject to venue capacity and door policy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1 lg:space-y-4">
        {tickets.map((ticket) => {
          const remaining = Math.max(ticket.capacity - ticket.sold, 0);
          const selected = quantities[ticket.id] ?? 0;
          const maxQuantity = Math.min(remaining, MAX_QUANTITY_PER_TRANSACTION);
          const isTicketSoldOut = remaining === 0;

          return (
            <div
              key={ticket.id}
              className={twMerge(
                "border border-[#f3eadb]/12 bg-black/24 p-3 transition duration-300 lg:p-5",
                isTicketSoldOut && "border-[#f3eadb]/8 bg-black/14",
              )}
            >
              <div className="flex items-center justify-between gap-3 lg:gap-4">
                <div className="min-w-0">
                  <h3
                    className={twMerge(
                      "text-base font-semibold leading-tight text-[#f8f0e3] lg:text-xl",
                      isTicketSoldOut && "text-[#f8f0e3]/55",
                    )}
                  >
                    {ticket.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[#d7c7ad]">
                      {formatMoney(ticket.price_cents, ticket.currency)}
                    </p>
                    {isTicketSoldOut ? (
                      <span className="rounded-full border border-red-300/20 bg-red-400/10 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-red-200">
                        Sold out
                      </span>
                    ) : null}
                  </div>
                  {ticket.description ? (
                    <p className="mt-1 text-xs text-[#f3eadb]/52 lg:text-sm">
                      {ticket.description}
                    </p>
                  ) : null}
                </div>

                <QuantityStepper
                  disabled={isTicketSoldOut || !isSaleActive || isLoading}
                  max={maxQuantity}
                  ticketId={ticket.id}
                  value={selected}
                  isSoldOut={isTicketSoldOut}
                  onChange={(ticketId, quantity) =>
                    setQuantities((current) => ({
                      ...current,
                      [ticketId]: quantity,
                    }))
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-[#f3eadb]/12 bg-[#070605] pt-4 lg:pt-5">
        {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}

        <button
          type="button"
          disabled={isSoldOut || !isSaleActive || total === 0 || isLoading}
          onClick={startCheckout}
          className="w-full rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 small-laptop:py-3 lg:py-4 lg:text-base"
        >
          {isSoldOut
            ? "Sold Out"
            : !isSaleActive
              ? "Sales Closed"
              : isLoading
                ? "Opening checkout..."
                : `Checkout · ${formatMoney(total)}`}
        </button>
        <p className="mt-2 px-2 text-center text-[0.7rem] leading-5 text-[#f3eadb]/42 lg:text-xs">
          By purchasing a ticket, you agree to the{" "}
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-[#f8f0e3] transition duration-300"
          >
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-[#f8f0e3] transition duration-300"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
