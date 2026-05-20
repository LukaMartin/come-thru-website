"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { twMerge } from "tailwind-merge";

import { CheckoutForm } from "@/components/CheckoutForm";
import { formatMoney } from "@/lib/tickets";

type TicketOption = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  capacity: number;
  sold: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
};

type CheckoutPanelProps = {
  eventId: string;
  isFree: boolean;
  initialDrawerOpen?: boolean;
  tickets: TicketOption[];
};

function PriceFrom({ price }: { price: string }) {
  return (
    <p className="whitespace-nowrap text-sm font-semibold text-[#f8f0e3] lg:mt-2 lg:text-2xl lg:tracking-[-0.03em]">
      <span className="font-medium text-[#f3eadb]/42 lg:text-base lg:tracking-normal">
        from{" "}
      </span>
      {price}
    </p>
  );
}

export function CheckoutPanel({
  eventId,
  isFree,
  initialDrawerOpen = false,
  tickets,
}: CheckoutPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLElement | null>(null);
  const viewParam = searchParams.get("view");
  const [isDrawerOpen, setIsDrawerOpen] = useState(
    () => !isFree && (viewParam ? viewParam === "tickets" : initialDrawerOpen),
  );
  const sortedTickets = useMemo(
    () =>
      [...tickets].sort(
        (first, second) => first.price_cents - second.price_cents,
      ),
    [tickets],
  );
  const cheapestTicket = sortedTickets[0];
  const cheapestPrice = cheapestTicket
    ? formatMoney(cheapestTicket.price_cents, cheapestTicket.currency)
    : null;

  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-tickets-page]");
    const panel = panelRef.current;

    if (!page || !panel) {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const updatePagePadding = () => {
      if (desktopQuery.matches) {
        page.style.paddingBottom = "";
        return;
      }

      page.style.paddingBottom = `${panel.getBoundingClientRect().height}px`;
    };

    updatePagePadding();

    const resizeObserver = new ResizeObserver(updatePagePadding);
    resizeObserver.observe(panel);
    desktopQuery.addEventListener("change", updatePagePadding);
    window.addEventListener("resize", updatePagePadding);

    return () => {
      resizeObserver.disconnect();
      desktopQuery.removeEventListener("change", updatePagePadding);
      window.removeEventListener("resize", updatePagePadding);
      page.style.paddingBottom = "";
    };
  }, []);

  useEffect(() => {
    if (!isFree || viewParam !== "tickets") {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", "info");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [isFree, pathname, router, searchParams, viewParam]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  function setTicketsView(isOpen: boolean) {
    if (isFree) {
      return;
    }

    setIsDrawerOpen(isOpen);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", isOpen ? "tickets" : "info");
    window.history.replaceState(
      null,
      "",
      `${pathname}?${nextParams.toString()}`,
    );
  }

  if (isFree) {
    return (
      <aside
        ref={panelRef}
        className="fixed inset-x-0 bottom-0 z-20 overflow-hidden border-t border-[#f3eadb]/14 bg-[#100c0a] px-5 py-4 shadow-2xl shadow-black/60 backdrop-blur lg:sticky lg:top-8 lg:inset-auto lg:z-auto lg:border lg:bg-[#080706] md:p-6 small-laptop:p-4.5"
      >
        <div className="pointer-events-none absolute -right-12 -top-14 hidden size-36 rounded-full bg-[#d7c7ad]/5 blur-3xl lg:block" />

        <div className="flex items-center justify-center lg:hidden">
          <div className="flex flex-col items-center gap-y-1">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#d7c7ad]">
              Free entry
            </p>
            <p className="text-sm leading-5 text-[#f3eadb]/52">
              Subject to venue capacity.
            </p>
          </div>
        </div>

        <div className="relative hidden items-center justify-between gap-5 lg:flex">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              Tickets
            </p>
            <p className="mt-2 text-2xl font-bold tracking-[0.03em] text-[#f8f0e3] uppercase">
              Free entry
            </p>
          </div>

          <p className="text-right text-sm leading-5 text-[#f3eadb]/52 self-end mb-1.5">
            Subject to venue capacity.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside
        ref={panelRef}
        className="fixed inset-x-0 bottom-0 z-20 overflow-hidden border-t border-[#f3eadb]/14 bg-[#100c0a] px-5 py-4 shadow-2xl shadow-black/60 lg:sticky lg:top-8 lg:inset-auto lg:z-auto lg:flex lg:items-center lg:justify-between lg:gap-5 lg:border lg:bg-[#080706] lg:p-5"
      >
        <div className="pointer-events-none absolute -right-12 -top-14 hidden size-36 rounded-full bg-[#d7c7ad]/5 blur-3xl lg:block" />
        <div className="relative flex items-center justify-between gap-4 lg:block lg:flex-1">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              Tickets
            </p>
          </div>

          {cheapestPrice ? <PriceFrom price={cheapestPrice} /> : null}
        </div>

        <button
          type="button"
          onClick={() => setTicketsView(true)}
          className="relative mt-4 w-full rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-black shadow-[0_18px_55px_rgba(248,240,227,0.08)] transition duration-300 hover:bg-white lg:mt-0 lg:w-auto lg:min-w-40 lg:px-8 lg:text-[15px]"
        >
          Get tickets
        </button>
      </aside>

      <div
        className={twMerge(
          "fixed inset-0 z-60 bg-black/62 opacity-0 backdrop-blur-md transition duration-300 pointer-events-none",
          isDrawerOpen && "opacity-100 pointer-events-auto",
        )}
        onClick={() => setTicketsView(false)}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Tickets checkout"
        className={twMerge(
          "fixed inset-0 z-70 flex translate-x-full flex-col border-[#f3eadb]/14 bg-[#070605] shadow-2xl shadow-black/70 transition duration-350 ease-in-out lg:inset-y-0 lg:right-0 lg:left-auto lg:w-full lg:max-w-md lg:border-l",
          isDrawerOpen && "translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#f3eadb]/12 px-5 py-4 lg:px-7 lg:py-6">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              Tickets
            </p>
          </div>

          <button
            type="button"
            aria-label="Close tickets drawer"
            onClick={() => setTicketsView(false)}
            className="flex size-10 flex-col items-center justify-center gap-1.5 text-white transition hover:text-[#f8f0e3]/70"
          >
            <span className="h-px w-4 translate-y-[3px] rotate-45 bg-current" />
            <span className="h-px w-4 translate-y-[-4px] -rotate-45 bg-current" />
          </button>
        </div>

        <div className="min-h-0 flex-1 px-5 py-5 lg:px-7 lg:py-6">
          <CheckoutForm
            eventId={eventId}
            isFree={isFree}
            tickets={sortedTickets}
          />
        </div>
      </section>
    </>
  );
}
