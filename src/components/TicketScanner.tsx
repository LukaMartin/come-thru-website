"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

type ScanResult =
  | {
      result: "valid" | "already_redeemed" | "wrong_event" | "invalid" | "refunded" | "cancelled";
      attendee_email?: string | null;
      redeemed_at?: string | null;
    }
  | {
      result: "error";
      message: string;
    };

const resultStyles: Record<string, string> = {
  valid: "border-green-300/30 bg-green-400/15 text-green-100",
  already_redeemed: "border-[#f2ab52]/35 bg-[#f2ab52]/14 text-[#f8e2b8]",
  wrong_event: "border-orange-300/30 bg-orange-400/15 text-orange-100",
  invalid: "border-red-300/30 bg-red-400/15 text-red-100",
  refunded: "border-red-300/30 bg-red-400/15 text-red-100",
  cancelled: "border-red-300/30 bg-red-400/15 text-red-100",
  error: "border-red-300/30 bg-red-400/15 text-red-100",
};

const resultLabels: Record<string, string> = {
  valid: "Valid ticket",
  already_redeemed: "Already redeemed",
  wrong_event: "Wrong event",
  invalid: "Invalid ticket",
  refunded: "Refunded ticket",
  cancelled: "Cancelled ticket",
  error: "Scanner error",
};

type TicketScannerProps = {
  eventId: string;
  eventName: string;
};

export function TicketScanner({ eventId, eventName }: TicketScannerProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const lastScanRef = useRef<{ value: string; scannedAt: number } | null>(null);

  const redeem = useCallback(
    async (qr: string) => {
      const lastScan = lastScanRef.current;

      if (isRedeeming) {
        return;
      }

      if (lastScan?.value === qr && Date.now() - lastScan.scannedAt < 3000) {
        return;
      }

      lastScanRef.current = { value: qr, scannedAt: Date.now() };
      setIsRedeeming(true);

      try {
        const response = await fetch("/api/tickets/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qr,
            eventId,
          }),
        });

        const payload = (await response.json()) as ScanResult & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to redeem ticket.");
        }

        setResult(payload);
        navigator.vibrate?.(payload.result === "valid" ? 80 : [80, 80, 80]);
      } catch (error) {
        setResult({
          result: "error",
          message: error instanceof Error ? error.message : "Scan failed.",
        });
      } finally {
        setIsRedeeming(false);
      }
    },
    [eventId, isRedeeming],
  );

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "ticket-reader",
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        rememberLastUsedCamera: true,
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        void redeem(decodedText);
      },
      () => {},
    );

    return () => {
      void scanner.clear();
    };
  }, [redeem]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] pb-12 md:pb-0">
      <section className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.16),transparent_34%),radial-gradient(circle_at_80%_76%,rgba(242,171,82,0.08),transparent_32%),rgba(8,7,6,0.9)] p-5 shadow-2xl shadow-black/30 md:p-6">
        <div className="pointer-events-none absolute -left-16 top-16 h-52 w-52 rounded-full bg-[#b5482f]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-8 h-44 w-44 rounded-full bg-[#f2ab52]/8 blur-3xl" />
        <div className="relative mb-4 border border-[#f3eadb]/12 bg-black/28 p-4 text-center text-sm text-[#f3eadb]/68">
          <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58">
            Current event
          </p>
          <p className="mt-2 font-semibold text-[#f8f0e3]">{eventName}</p>
        </div>

        <div
          className={`relative border p-6 text-center ${result ? resultStyles[result.result] : "border-[#f3eadb]/12 bg-black/32 text-[#f3eadb]/68"}`}
        >
          <p className="text-3xl font-black uppercase leading-none tracking-[-0.04em]">
            {result ? resultLabels[result.result] : "Ready to scan"}
          </p>
          {result && "attendee_email" in result && result.attendee_email ? (
            <p className="mt-2 text-sm opacity-80">{result.attendee_email}</p>
          ) : null}
          {result && "message" in result ? (
            <p className="mt-2 text-sm opacity-80">{result.message}</p>
          ) : null}
          {isRedeeming ? <p className="mt-2 text-sm opacity-80">Checking...</p> : null}
        </div>
      </section>

      <section className="border border-[#f3eadb]/14 bg-[#f8f0e3] p-3 text-black shadow-2xl shadow-black/30">
        <div id="ticket-reader" />
      </section>
    </div>
  );
}
