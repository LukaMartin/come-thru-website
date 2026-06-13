import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  orderId: z.uuid(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = statusSchema.safeParse({
    orderId: url.searchParams.get("orderId"),
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid checkout status request." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ticketing_orders")
    .select("id, status, reserved_until, stripe_payment_intent_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return Response.json({
      expired: true,
      reason: "unavailable",
    });
  }

  if (data.status === "paid") {
    return Response.json({
      expired: false,
      redirectTo: "/success",
      status: data.status,
    });
  }

  if (data.status !== "pending") {
    return Response.json({
      expired: true,
      reason: "expired",
      status: data.status,
    });
  }

  const reservedUntil = data.reserved_until
    ? new Date(data.reserved_until).getTime()
    : 0;
  const expired = reservedUntil <= Date.now();

  if (!expired) {
    return Response.json({
      expired: false,
      reservedUntil: data.reserved_until,
      status: data.status,
    });
  }

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

  if (data.stripe_payment_intent_id) {
    try {
      await createStripeClient().paymentIntents.cancel(
        data.stripe_payment_intent_id,
      );
    } catch {
      // It may already be processing/succeeded/canceled; DB expiry is authoritative.
    }
  }

  return Response.json({
    expired: true,
    reason: "expired",
    status: "cancelled",
  });
}
