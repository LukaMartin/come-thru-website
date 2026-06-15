import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentElementCheckoutView } from "@/components/PaymentElementCheckoutView";
import { requireEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import CheckoutExitModal from "@/components/CheckoutExitModal";

type CheckoutPageProps = {
  params: Promise<{ orderId: string }>;
};

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
    return <CheckoutExitModal reason="unavailable" orderId={orderId} />;
  }

  if (data.status === "paid") {
    redirect("/success");
  }

  if (data.status !== "pending") {
    return <CheckoutExitModal reason="expired" orderId={orderId} />;
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
    return <CheckoutExitModal reason="expired" orderId={orderId} isAlreadyCancelled={true} />;
  }

  const stripe = createStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(
    data.stripe_payment_intent_id,
  );

  if (!paymentIntent.client_secret) {
    return <CheckoutExitModal reason="unavailable" orderId={orderId} />;
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
    return <CheckoutExitModal reason="unavailable" orderId={orderId} />;
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("ticketing_order_items")
    .select("id, quantity, unit_amount_cents, ticketing_ticket_types(name)")
    .eq("order_id", data.id);

  if (orderItemsError) {
    throw orderItemsError;
  }

  const lineItems = (
    (orderItems ?? []) as unknown as {
      id: string;
      quantity: number;
      unit_amount_cents: number;
      ticketing_ticket_types: { name: string } | null;
    }[]
  ).map(
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
