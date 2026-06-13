import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PaymentElementCheckoutView } from "@/components/PaymentElementCheckoutView";
import { requireEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";

type CheckoutPageProps = {
  params: Promise<{ orderId: string }>;
};

type CheckoutExitReason = "expired" | "unavailable";

type OrderItemSummary = {
  id: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
};

function hasReservationExpired(reservedUntil: string) {
  return new Date(reservedUntil).getTime() <= Date.now();
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout | Come Thru",
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { orderId } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ticketing_orders")
    .select(
      "id, event_id, status, reserved_until, stripe_payment_intent_id, amount_total_cents, currency, order_reference",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !data.reserved_until || !data.stripe_payment_intent_id) {
    return <CheckoutStoppedPage reason="unavailable" />;
  }

  if (data.status === "paid") {
    redirect("/success");
  }

  if (data.status !== "pending") {
    return <CheckoutStoppedPage reason="expired" />;
  }

  if (hasReservationExpired(data.reserved_until)) {
    const { error: cancelError } = await supabase.rpc(
      "ticketing_cancel_checkout_reservation",
      {
        p_order_id: data.id,
        p_reason: "cancelled",
        p_stripe_checkout_session_id: null,
      },
    );

    if (cancelError) {
      throw cancelError;
    }

    try {
      await createStripeClient().paymentIntents.cancel(
        data.stripe_payment_intent_id,
      );
    } catch {
      // The timer already cancelled the DB hold; Stripe may have moved states.
    }
    return <CheckoutStoppedPage reason="expired" />;
  }

  const stripe = createStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(
    data.stripe_payment_intent_id,
  );

  if (!paymentIntent.client_secret) {
    return <CheckoutStoppedPage reason="unavailable" />;
  }

  const { data: event, error: eventError } = await supabase
    .from("ticketing_events")
    .select("name")
    .eq("id", data.event_id)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    return <CheckoutStoppedPage reason="unavailable" />;
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("ticketing_order_items")
    .select("id, quantity, unit_amount_cents, ticketing_ticket_types(name)")
    .eq("order_id", data.id);

  if (orderItemsError) {
    throw orderItemsError;
  }

  const lineItems = ((orderItems ?? []) as unknown as {
    id: string;
    quantity: number;
    unit_amount_cents: number;
    ticketing_ticket_types: { name: string } | null;
  }[]).map(
    (item): OrderItemSummary => ({
      id: item.id,
      name: item.ticketing_ticket_types?.name ?? "Ticket",
      quantity: item.quantity,
      unitAmountCents: item.unit_amount_cents,
    }),
  );

  return (
    <main className="min-h-dvh bg-[#050505] text-[#f8f0e3]">
      <PaymentElementCheckoutView
        amountTotalCents={data.amount_total_cents}
        clientSecret={paymentIntent.client_secret}
        currency={data.currency}
        eventName={event.name}
        lineItems={lineItems}
        orderId={data.id}
        orderReference={data.order_reference}
        publishableKey={requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")}
        reservedUntil={data.reserved_until}
      />
    </main>
  );
}

function CheckoutStoppedPage({ reason }: { reason: CheckoutExitReason }) {
  const copy =
    reason === "unavailable"
      ? {
          title: "Checkout unavailable",
          message:
            "This checkout is no longer available. Please start again to purchase tickets.",
        }
      : {
          title: "Reservation expired",
          message:
            "Your 10 minute ticket reservation has ended. Please start again to purchase tickets.",
        };

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <section className="flex flex-1 items-center justify-center py-8 md:py-12">
          <div
            aria-modal="true"
            className="relative w-full max-w-lg overflow-hidden border border-[#f3eadb]/16 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.34),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(215,199,173,0.14),transparent_28%),rgba(13,9,8,0.98)] p-6 text-center shadow-2xl shadow-black/50 md:p-8"
            role="dialog"
          >
            <p className="text-[0.75rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
            {copy.title}
            </p>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-[#f3eadb]/68 md:text-base md:leading-7">
              {copy.message}
            </p>
            <Link
              href="/tickets?view=tickets"
              className="mt-7 inline-flex items-center justify-center bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition duration-300 hover:bg-white rounded-md"
            >
              Start new checkout
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
