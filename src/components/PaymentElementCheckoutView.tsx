"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
  ContactDetailsElement,
  ExpressCheckoutElement,
} from "@stripe/react-stripe-js";
import {
  loadStripe,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { formatMoney } from "@/lib/tickets";
import logoCream from "../../public/logo-cream.png";
import Image from "next/image";
import * as Sentry from "@sentry/nextjs";
import { PiTimerBold } from "react-icons/pi";
import { twMerge } from "tailwind-merge";
import { CheckoutExitReason } from "@/lib/checkout";
import CheckoutExitModal from "./CheckoutExitModal";
import { cancelCheckoutReservationClient } from "@/lib/checkout";
import { useRouter } from "next/navigation";

type CheckoutStatusResponse = {
  expired?: boolean;
  reason?: CheckoutExitReason;
  redirectTo?: string;
};

type CheckoutLineItem = {
  id: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
};

type PaymentElementCheckoutViewProps = {
  amountTotalCents: number;
  clientSecret: string;
  currency: string;
  eventName: string;
  lineItems: CheckoutLineItem[];
  orderId: string;
  orderReference: string;
  publishableKey: string;
  reservedUntil: string;
};

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(Math.ceil(milliseconds / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PaymentElementCheckoutView({
  amountTotalCents,
  clientSecret,
  currency,
  eventName,
  lineItems,
  orderId,
  orderReference,
  publishableKey,
  reservedUntil,
}: PaymentElementCheckoutViewProps) {
  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: "night" as const,
        variables: {
          colorPrimary: "#f8f0e3",
          colorBackground: "#070605",
          colorText: "#f8f0e3",
          colorTextSecondary: "rgba(243, 234, 219, 0.58)",
          colorTextPlaceholder: "rgba(243, 234, 219, 0.34)",
          colorDanger: "#fca5a5",
          colorIconTab: "#d7c7ad",
          borderRadius: "0px",
          fontFamily: "Inter, system-ui, sans-serif",
          spacingUnit: "4px",
        },
        rules: {
          ".Input": {
            backgroundColor: "#050505",
            borderColor: "rgba(243, 234, 219, 0.14)",
            boxShadow: "none",
          },
          ".Input:focus": {
            borderColor: "rgba(248, 240, 227, 0.45)",
            boxShadow: "0 0 0 1px rgba(248, 240, 227, 0.18)",
          },
          ".Tab": {
            backgroundColor: "#050505",
            borderColor: "rgba(243, 234, 219, 0.14)",
          },
          ".Tab--selected": {
            borderColor: "rgba(248, 240, 227, 0.42)",
          },
          ".Label": {
            fontSize: "14px",
          },
        },
      },
    }),
    [clientSecret],
  );

  return (
    <Elements options={options} stripe={stripePromise}>
      <CheckoutContent
        amountTotalCents={amountTotalCents}
        currency={currency}
        eventName={eventName}
        lineItems={lineItems}
        orderId={orderId}
        orderReference={orderReference}
        reservedUntil={reservedUntil}
      />
    </Elements>
  );
}

function CheckoutContent({
  amountTotalCents,
  currency,
  eventName,
  lineItems,
  orderId,
  reservedUntil,
}: Omit<PaymentElementCheckoutViewProps, "clientSecret" | "publishableKey">) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [exitReason, setExitReason] = useState<CheckoutExitReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkReservationStatus() {
      if (isSubmitting) {
        return;
      }

      try {
        const response = await fetch(
          `/api/checkout/status?orderId=${encodeURIComponent(orderId)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          if (!cancelled && Date.now() >= expiresAt) {
            setExitReason("expired");
          }

          return;
        }

        const payload = (await response.json()) as CheckoutStatusResponse;

        if (cancelled) {
          return;
        }

        if (payload.redirectTo) {
          window.location.replace(payload.redirectTo);
          return;
        }

        if (payload.expired) {
          setExitReason(payload.reason ?? "expired");
        }
      } catch {
        if (!cancelled && Date.now() >= expiresAt) {
          setExitReason("expired");
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkReservationStatus();
      }
    }

    const expiresAt = new Date(reservedUntil).getTime();
    const delay = Math.max(expiresAt - Date.now(), 0);
    const initialTickId = window.setTimeout(() => {
      setRemainingTime(formatRemainingTime(expiresAt - Date.now()));
    }, 0);
    const timeoutId = window.setTimeout(() => {
      void checkReservationStatus();
    }, delay);
    const intervalId = window.setInterval(() => {
      setRemainingTime(formatRemainingTime(expiresAt - Date.now()));
    }, 1000);

    void checkReservationStatus();
    window.addEventListener("focus", checkReservationStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTickId);
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkReservationStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [orderId, reservedUntil, isSubmitting]);

  async function confirmPayment(
    event?: StripeExpressCheckoutElementConfirmEvent,
    buyerName?: string,
  ) {
    if (!stripe || !elements || exitReason || isSubmitting) {
      return;
    }

    setError(null);

    const email = event?.billingDetails?.email ?? contactEmail;
    const name = event?.billingDetails?.name ?? buyerName;

    if (!email) {
      setError("Missing email address.");
      return;
    } else if (!name) {
      setError("Missing first and last name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const updateResponse = await fetch("/api/checkout/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, email, name }),
      });

      if (!updateResponse.ok) {
        setError("Could not save checkout details. Please try again.");
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      Sentry.captureException(error);
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
        payment_method_data: {
          billing_details: {
            email,
            name,
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      setIsSubmitting(false);
      Sentry.captureException(error);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      window.location.href = "/success";
      return;
    }

    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setNameError("Enter your first and last name.");
      return;
    }

    setNameError(null);
    await confirmPayment(undefined, `${trimmedFirstName} ${trimmedLastName}`);
  }

  const isBlocked = Boolean(exitReason) || isSubmitting;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-5 py-6 md:gap-6 md:py-10">
        <div className="flex items-center justify-between">
          <Image
            src={logoCream}
            alt="Come Thru Logo"
            width={100}
            height={100}
            priority
            className="h-10 w-auto opacity-90 sm:h-12"
          />
          <button
            onClick={async (e) => {
              e.preventDefault();
              await cancelCheckoutReservationClient(orderId);
              router.push("/event-info?view=tickets");
            }}
            className="group relative flex w-fit items-center gap-1.5 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7c7ad] transition-colors duration-300 hover:text-[#f8f0e3] after:absolute after:bottom-0 after:right-0 after:h-px after:w-[calc(100%-1.25rem)] after:bg-current after:transition-all after:duration-400 after:ease-out hover:after:w-full"
          >
            <span className="hover:-mr-5 opacity-0 transition-all duration-300 ease-out group-hover:mr-0 group-hover:opacity-100">
              &larr;
            </span>
            <span>Back to tickets</span>
          </button>
        </div>

        <div className="grid gap-5">
          <section className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_12%_16%,rgba(172,67,43,0.18),transparent_32%),rgba(8,7,6,0.96)] p-5 shadow-2xl shadow-black/35 md:p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-[#d7c7ad]/7 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-5">
                <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                  Order summary
                </p>
                <div
                  className={twMerge(
                    "flex items-center justify-between w-15 md:w-20",
                    remainingTime &&
                      remainingTime.length > 4 &&
                      "w-[66px] md:w-22",
                  )}
                >
                  <PiTimerBold className="size-4 md:size-5 text-[#f8f0e3]" />
                  <p className="shrink-0 text-lg md:text-2xl font-black leading-none tracking-[-0.06em]">
                    {remainingTime ?? "--:--"}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-[#f3eadb]/12 pt-5">
                <h2 className="text-lg font-black uppercase leading-[0.92] tracking-tighter md:text-2xl">
                  {eventName}
                </h2>
              </div>

              <div className="divide-y divide-[#f3eadb]/10">
                {lineItems.map((item) => (
                  <div
                    className="flex items-start justify-between gap-4 py-4 text-sm"
                    key={item.id}
                  >
                    <div>
                      <p className="text-sm md:text-base font-semibold leading-tight text-[#f8f0e3]">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs md:text-sm text-[#f3eadb]/48">
                        Quantity {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-[#d7c7ad]">
                      {formatMoney(
                        item.unitAmountCents * item.quantity,
                        currency,
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-1 flex items-end justify-between border-t border-[#f3eadb]/14 pt-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7c7ad]">
                  Total
                </p>
                <p className="text-lg md:text-3xl font-black leading-none tracking-tighter">
                  {formatMoney(amountTotalCents, currency)}
                </p>
              </div>
            </div>
          </section>

          <section className="border border-[#f3eadb]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_42%),#080706] p-5 shadow-2xl shadow-black/35 md:p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="border-b border-[#f3eadb]/12 pb-5 flex items-center justify-between ">
                <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                  Payment
                </p>
                <p className="text-xs md:text-sm leading-6 text-[#f3eadb]/52">
                  Secure Stripe checkout.
                </p>
              </div>

              <ExpressCheckoutElement
                onConfirm={(event) => confirmPayment(event)}
                options={{
                  emailRequired: true,
                  billingAddressRequired: true,
                }}
              />

              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-1 block text-[#f8f0e3] text-[13px]"
                      htmlFor="checkout-first-name"
                    >
                      First Name
                    </label>
                    <input
                      autoComplete="given-name"
                      className="w-full border border-[#f3eadb]/14 bg-[#050505] px-3 py-2.5 text-sm text-[#f8f0e3] outline-none transition focus:border-[#f8f0e3]/45"
                      disabled={isBlocked}
                      id="checkout-first-name"
                      onChange={(event) => {
                        setFirstName(event.target.value);
                        if (nameError) {
                          setNameError(null);
                        }
                      }}
                      value={firstName}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-[#f8f0e3] text-[13px]"
                      htmlFor="checkout-last-name"
                    >
                      Last Name
                    </label>
                    <input
                      autoComplete="family-name"
                      className="w-full border border-[#f3eadb]/14 bg-[#050505] px-3 py-2.5 text-sm text-[#f8f0e3] outline-none transition focus:border-[#f8f0e3]/45"
                      disabled={isBlocked}
                      id="checkout-last-name"
                      onChange={(event) => {
                        setLastName(event.target.value);
                        if (nameError) {
                          setNameError(null);
                        }
                      }}
                      value={lastName}
                    />
                  </div>
                  {nameError ? (
                    <p className="text-xs font-medium text-red-300 sm:col-span-2">
                      {nameError}
                    </p>
                  ) : null}
                </div>
                <ContactDetailsElement
                  onChange={(event) => {
                    setContactEmail(event.complete ? event.value.email : null);
                  }}
                />
                <PaymentElement
                  options={{
                    layout: {
                      type: "accordion",
                      defaultCollapsed: false,
                      radios: "always",
                      spacedAccordionItems: true,
                    },
                    wallets: {
                      link: "never",
                    },
                  }}
                />
              </div>

              <button
                className="w-full rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!stripe || !elements || isBlocked}
                type="submit"
              >
                {exitReason
                  ? "Reservation expired"
                  : isSubmitting
                    ? "Processing..."
                    : `Pay ${formatMoney(amountTotalCents, currency)}`}
              </button>
              {error ? (
                <p className="text-xs font-medium text-red-300">{error}</p>
              ) : null}
            </form>
          </section>
        </div>
      </div>

      {exitReason && !isSubmitting ? (
        <CheckoutExitModal reason={exitReason} orderId={orderId} />
      ) : null}
    </main>
  );
}
