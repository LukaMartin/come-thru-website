import { createStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const supabase = createServiceClient();
  const { orderId, email } = await request.json();

  const { data: order, error: orderError } = await supabase
    .from("ticketing_orders")
    .select("stripe_payment_intent_id")
    .eq("id", orderId)
    .single();

  if (orderError) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  try {
    await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
      receipt_email: email,
    });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "Failed to update payment intent." },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
