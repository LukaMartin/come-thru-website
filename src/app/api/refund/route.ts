import { createStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminAuthState } from "@/lib/admin-auth";
import { z } from "zod";

const refundSchema = z.object({
  orderId: z.uuid(),
});

export async function POST(request: Request) {
  const auth = await getAdminAuthState();

  if (auth.status !== "admin") {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = refundSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid refund request." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: order, error: orderError } = await supabase
    .from("ticketing_orders")
    .select("id, status, stripe_payment_intent_id")
    .eq("id", parsed.data.orderId)
    .single();

  if (orderError) {
    throw orderError;
  }

  if (order.status === "refunded") {
    return Response.json({ refunded: true, orderId: order.id });
  }

  if (order.status !== "paid") {
    return Response.json(
      { error: "Only paid orders can be refunded." },
      { status: 409 },
    );
  }

  if (!order.stripe_payment_intent_id) {
    return Response.json(
      { error: "Order has no Stripe payment intent." },
      { status: 409 },
    );
  }

  const stripe = createStripeClient();
  const refund = await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent_id,
  });

  if (refund.status === "succeeded") {
    const { error: updateError } = await supabase
      .from("ticketing_orders")
      .update({ status: "refunded" })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    const { error: ticketUpdateError } = await supabase
      .from("ticketing_tickets")
      .update({ status: "refunded" })
      .eq("order_id", order.id)
      .in("status", ["valid", "redeemed"]);

    if (ticketUpdateError) {
      throw ticketUpdateError;
    }
  }

  return Response.json({ refund, orderId: order.id });
}
