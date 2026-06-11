import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { getAppUrl } from "@/lib/env";
import { getTicketCountsByType } from "@/lib/events";
import { createOrderReference } from "@/lib/order-reference";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import {
  MAX_QUANTITY_PER_TRANSACTION,
  MIN_QUANTITY_PER_TRANSACTION,
} from "@/lib/checkout";

export const dynamic = "force-dynamic";

type TicketType = Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];

const checkoutSchema = z.object({
  eventId: z.uuid(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.uuid(),
        quantity: z
          .int()
          .min(MIN_QUANTITY_PER_TRANSACTION)
          .max(MAX_QUANTITY_PER_TRANSACTION),
      }),
    )
    .min(MIN_QUANTITY_PER_TRANSACTION),
});

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid checkout request." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const stripe = createStripeClient();
  const { eventId, items } = parsed.data;
  const itemIds = items.map((item) => item.ticketTypeId);

  const { data: event, error: eventError } = await supabase
    .from("ticketing_events")
    .select("*")
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (eventError || !event) {
    return Response.json({ error: "Event is not available." }, { status: 404 });
  }

  const { data: ticketTypeRows, error: ticketTypeError } = await supabase
    .from("ticketing_ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .eq("active", true)
    .in("id", itemIds);

  if (ticketTypeError) {
    throw ticketTypeError;
  }

  const ticketTypes = (ticketTypeRows ?? []) as TicketType[];

  if (ticketTypes.length !== itemIds.length) {
    return Response.json(
      { error: "One or more tickets are unavailable." },
      { status: 400 },
    );
  }

  const now = Date.now();
  const soldCounts = await getTicketCountsByType(itemIds, supabase);
  const lineItems: {
    ticketType: TicketType;
    quantity: number;
    stripePriceId: string;
    stripeUnitAmount: number;
    stripeCurrency: string;
  }[] = [];

  for (const item of items) {
    const ticketType = ticketTypes.find(
      (ticket) => ticket.id === item.ticketTypeId,
    );

    if (!ticketType) {
      throw new Error("Ticket type not found during checkout.");
    }

    const startsAt = ticketType.sales_start_at
      ? new Date(ticketType.sales_start_at).getTime()
      : null;
    const endsAt = ticketType.sales_end_at
      ? new Date(ticketType.sales_end_at).getTime()
      : null;

    if ((startsAt && now < startsAt) || (endsAt && now > endsAt)) {
      return Response.json(
        { error: `${ticketType.name} is not on sale.` },
        { status: 400 },
      );
    }

    const sold = soldCounts.get(ticketType.id) ?? 0;

    if (sold + item.quantity > ticketType.capacity) {
      return Response.json(
        { error: `${ticketType.name} does not have enough tickets left.` },
        { status: 400 },
      );
    }

    const stripePriceId = ticketType.stripe_price_id?.trim();

    if (!stripePriceId) {
      return Response.json(
        { error: `${ticketType.name} is missing a Stripe price ID.` },
        { status: 400 },
      );
    }

    const stripePrice = await stripe.prices.retrieve(stripePriceId);
    const stripeUnitAmount = stripePrice.unit_amount;
    const stripeCurrency = stripePrice.currency.toLowerCase();

    if (stripeUnitAmount === null) {
      return Response.json(
        { error: `${ticketType.name} has an unsupported Stripe price type.` },
        { status: 400 },
      );
    }

    lineItems.push({
      ticketType,
      quantity: item.quantity,
      stripePriceId,
      stripeUnitAmount,
      stripeCurrency,
    });
  }

  const amountTotal = lineItems.reduce(
    (sum, item) => sum + item.stripeUnitAmount * item.quantity,
    0,
  );
  const currency = lineItems[0]?.stripeCurrency ?? "aud";

  if (lineItems.some((item) => item.stripeCurrency !== currency)) {
    return Response.json(
      { error: "All selected tickets must use the same currency." },
      { status: 400 },
    );
  }

  const order = await createPendingOrder({
    amountTotal,
    currency,
    eventId,
    supabase,
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${getAppUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/tickets`,
      customer_creation: "if_required",
      client_reference_id: order.id,
      metadata: {
        order_id: order.id,
        event_id: eventId,
      },
      line_items: lineItems.map((item) => ({
        price: item.stripePriceId,
        quantity: item.quantity,
      })),
    });

    const { error: updateError } = await supabase
      .from("ticketing_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    return Response.json({ url: session.url });
  } catch (error) {
    await supabase
      .from("ticketing_orders")
      .update({ status: "failed" })
      .eq("id", order.id);
    throw error;
  }
}

async function createPendingOrder({
  amountTotal,
  currency,
  eventId,
  supabase,
}: {
  amountTotal: number;
  currency: string;
  eventId: string;
  supabase: ReturnType<typeof createServiceClient>;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("ticketing_orders")
      .insert({
        event_id: eventId,
        amount_total_cents: amountTotal,
        currency,
        order_reference: createOrderReference(),
      })
      .select()
      .single();

    if (!error) {
      return data;
    }

    if (error.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Could not create a unique order reference.");
}
