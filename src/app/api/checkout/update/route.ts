import { createStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const updateSchema = z.object({
  orderId: z.uuid(),
  email: z.email("Enter a valid email address.").max(254),
  name: z.string().trim().min(1).max(160),
});

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const supabase = createServiceClient();

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid update request." }, { status: 400 });
  }

  const { orderId, email, name } = parsed.data;

  const { data: order, error: orderError } = await supabase
    .from("ticketing_orders")
    .select("stripe_payment_intent_id, status")
    .eq("id", orderId)
    .single();

  if (orderError) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.status !== "pending") {
    return Response.json({ error: "Order is not pending." }, { status: 409 });
  }

  try {
    await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
      receipt_email: email,
      metadata: {
        buyer_email: email,
        buyer_name: name,
      },
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
