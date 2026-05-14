"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const pinLength = 6;
const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function ScannerPinLock() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(nextPin: string) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: nextPin }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Wrong PIN.");
      }

      router.refresh();
    } catch (loginError) {
      setPin("");
      setError(loginError instanceof Error ? loginError.message : "Wrong PIN.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function enterDigit(digit: string) {
    if (isSubmitting || pin.length >= pinLength) {
      return;
    }

    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    setError(null);

    if (nextPin.length === pinLength) {
      void submit(nextPin);
    }
  }

  function deleteDigit() {
    if (isSubmitting) {
      return;
    }

    setPin((current) => current.slice(0, -1));
    setError(null);
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center py-8">
      <div className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.22),transparent_36%),radial-gradient(circle_at_78%_76%,rgba(215,199,173,0.12),transparent_32%),radial-gradient(circle_at_48%_58%,rgba(242,171,82,0.08),transparent_34%),#080706] p-6 text-center shadow-2xl shadow-black/30">
        <div className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#b5482f]/16 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-48 w-48 rounded-full bg-[#d7c7ad]/10 blur-3xl" />
        <div className="relative">
          <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
            Door scanner
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
            Enter PIN
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#f3eadb]/68">
            Unlock this device to scan tickets.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            {Array.from({ length: pinLength }).map((_, index) => (
              <span
                key={index}
                className={`size-3 rounded-full border ${
                  index < pin.length
                    ? "border-[#d7c7ad] bg-[#d7c7ad]"
                    : "border-[#f3eadb]/20 bg-[#f3eadb]/5"
                }`}
              />
            ))}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {digits.slice(0, 9).map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={isSubmitting}
                onClick={() => enterDigit(digit)}
                className="flex aspect-square items-center justify-center rounded-full border border-[#f3eadb]/12 bg-black/30 text-2xl font-semibold text-[#f8f0e3] transition hover:bg-[#f3eadb]/10 disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
            <div />
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => enterDigit("0")}
              className="flex aspect-square items-center justify-center rounded-full border border-[#f3eadb]/12 bg-black/30 text-2xl font-semibold text-[#f8f0e3] transition hover:bg-[#f3eadb]/10 disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={isSubmitting || pin.length === 0}
              onClick={deleteDigit}
              className="flex aspect-square items-center justify-center rounded-full border border-[#f3eadb]/12 bg-black/30 text-sm font-semibold text-[#f8f0e3] transition hover:bg-[#f3eadb]/10 disabled:opacity-30"
            >
              Delete
            </button>
          </div>

          <div className="mt-6 min-h-5 text-sm">
            {isSubmitting ? <p className="text-[#f3eadb]/58">Unlocking...</p> : null}
            {error ? <p className="text-red-300">{error}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
