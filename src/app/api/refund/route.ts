import { createStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const refundSchema = z.object({
  stripePaymentIntentId: z.string(),
});

export async function POST(request: Request) {
  const parsed = refundSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid refund request." }, { status: 400 });
  }

  const { stripePaymentIntentId } = parsed.data;

  const stripe = createStripeClient();
  const refund = await stripe.refunds.create({
    payment_intent: stripePaymentIntentId,
  });

  if (refund.status === "succeeded") {
    const supabase = createServiceClient();
    const { error: updateError } = await supabase
      .from("ticketing_orders")
      .update({ status: "refunded" })
      .eq("stripe_payment_intent_id", stripePaymentIntentId);

    if (updateError) {
      throw updateError;
    }
  }

  return Response.json({ refund });
}