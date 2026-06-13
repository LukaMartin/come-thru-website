import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const expireSchema = z
  .object({
    orderId: z.uuid().optional(),
  })
  .refine((value) => value.orderId, {
    message: "orderId is required.",
  });

export async function POST(request: Request) {
  const parsed = expireSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid reservation expiry request." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc(
    "ticketing_cancel_checkout_reservation",
    {
      p_order_id: parsed.data.orderId ?? null,
      p_reason: "cancelled",
      p_stripe_checkout_session_id: null,
    },
  );

  if (error) {
    throw error;
  }

  return Response.json({
    cancelled: (data?.length ?? 0) > 0,
  });
}
