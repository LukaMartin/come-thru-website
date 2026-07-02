"use client";

import { useSyncExternalStore } from "react";
import { getTicketResendAvailability } from "@/lib/tickets";

const TICK_MS = 30_000;

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, TICK_MS);
  return () => clearInterval(id);
}

function getTick() {
  return Math.floor(Date.now() / TICK_MS);
}

export default function useTicketResendAvailability(
  ticketEmailSentAt: string | null,
) {
  const tick = useSyncExternalStore(subscribe, getTick, () => null);

  return tick === null
    ? null
    : getTicketResendAvailability(ticketEmailSentAt, new Date());
}
