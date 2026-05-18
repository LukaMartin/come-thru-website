"use client";

import { useEffect, useRef, useState } from "react";
import { TbChevronCompactUp } from "react-icons/tb";
import { twMerge } from "tailwind-merge";

import { CheckoutForm } from "@/components/CheckoutForm";

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
  tickets: TicketOption[];
};

export function CheckoutPanel({
  eventId,
  isFree,
  tickets,
}: CheckoutPanelProps) {
  const [isLowered, setIsLowered] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const touchStartY = useRef<number | null>(null);

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

      const rootFontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const loweredPanelHeight = rootFontSize * 4.65;

      page.style.paddingBottom = `${
        isLowered ? loweredPanelHeight : panel.getBoundingClientRect().height
      }px`;
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
  }, [isLowered]);

  function handleTouchEnd(endY: number) {
    if (touchStartY.current === null) {
      return;
    }

    const swipeDistance = endY - touchStartY.current;
    touchStartY.current = null;

    if (swipeDistance > 36) {
      setIsLowered(true);
    }

    if (swipeDistance < -36) {
      setIsLowered(false);
    }
  }

  return (
    <aside
      ref={panelRef}
      className={twMerge(
        "fixed inset-x-0 bottom-0 z-20 max-h-[70vh] overflow-y-auto rounded-t-4xl border border-[#f3eadb]/14 bg-[#080706]/96 px-5 pt-3 pb-4 shadow-2xl shadow-black/60 backdrop-blur transition-transform duration-300 ease-in-out lg:sticky lg:top-8 lg:inset-auto lg:z-auto lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-none lg:bg-[#080706]/90 small-laptop:p-4.5 lg:p-6",
        isLowered && "translate-y-[calc(100%-4.65rem)]",
      )}
    >
      <button
        type="button"
        aria-label={
          isLowered ? "Expand checkout panel" : "Lower checkout panel"
        }
        aria-expanded={!isLowered}
        onClick={() => setIsLowered((current) => !current)}
        onTouchStart={(event) => {
          touchStartY.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          handleTouchEnd(event.changedTouches[0]?.clientY ?? 0);
        }}
        className="mx-auto mb-3 flex w-full flex-col items-center justify-center gap-0 py-2 text-[#f8f0e3]/70 transition hover:text-[#f8f0e3] lg:hidden"
      >
        <TbChevronCompactUp
          aria-hidden="true"
          className={twMerge(
            "size-11 transition-transform duration-300 ease-in-out -mt-5 -mb-2",
            !isLowered && "rotate-180",
            isFree && "-mb-5",
          )}
        />
        {isLowered && !isFree ? (
          <span className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[#d7c7ad] underline underline-offset-4">
            Get tickets
          </span>
        ) : null}
      </button>

      <div className="mb-3 flex items-center justify-between gap-4 lg:mb-6">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
            Tickets
          </p>
        </div>
        {isFree ? (
          <span
            className={twMerge(
              "inline-flex rounded-full border border-[#d7c7ad]/22 bg-[#d7c7ad]/10 px-3 py-1 text-[0.6rem] md:text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#d7c7ad]",
              isLowered && "hidden lg:block",
            )}
          >
            Free entry
          </span>
        ) : (
          <div>
            <p className="ml-auto whitespace-nowrap text-right text-xs leading-none text-[#f3eadb]/48 lg:text-sm">
              Secure checkout by Stripe
            </p>
          </div>
        )}
      </div>

      <CheckoutForm eventId={eventId} isFree={isFree} tickets={tickets} />
    </aside>
  );
}
