import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { createOrderReference } from "@/lib/order-reference";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import {
  MAX_QUANTITY_PER_TRANSACTION,
  MIN_QUANTITY_PER_TRANSACTION,
} from "@/lib/checkout";

export const dynamic = "force-dynamic";

type TicketType = Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];
type CheckoutReservationResult = {
  order_id: string;
  amount_total_cents: number;
  currency: string;
  reserved_until: string;
};

const RESERVATION_MINUTES = 10;

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
  const aggregatedItems = aggregateItems(items);
  const itemIds = aggregatedItems.map((item) => item.ticketTypeId);

  if (
    aggregatedItems.some((item) => item.quantity > MAX_QUANTITY_PER_TRANSACTION)
  ) {
    return Response.json(
      { error: "Ticket quantity exceeds the transaction limit." },
      { status: 400 },
    );
  }

  await cancelExpiredReservations(supabase);

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

  const lineItems: {
    ticketType: TicketType;
    quantity: number;
    stripePriceId: string;
    stripeUnitAmount: number;
    stripeCurrency: string;
  }[] = [];

  for (const item of aggregatedItems) {
    const ticketType = ticketTypes.find(
      (ticket) => ticket.id === item.ticketTypeId,
    );

    if (!ticketType) {
      throw new Error("Ticket type not found during checkout.");
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

  const currency = lineItems[0]?.stripeCurrency ?? "aud";

  if (lineItems.some((item) => item.stripeCurrency !== currency)) {
    return Response.json(
      { error: "All selected tickets must use the same currency." },
      { status: 400 },
    );
  }

  let order: Awaited<ReturnType<typeof createReservation>>;

  try {
    order = await createReservation({
      eventId,
      lineItems,
      supabase,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reserve selected tickets.",
      },
      { status: 400 },
    );
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.amount_total_cents,
      currency: order.currency,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        order_id: order.id,
        event_id: eventId,
        reserved_until: order.reserved_until,
      },
    });

    const { error: updateError } = await supabase
      .from("ticketing_orders")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", order.id);

    if (updateError) {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      throw updateError;
    }

    if (!paymentIntent.client_secret) {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      throw new Error("Stripe did not return a payment client secret.");
    }

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      reservedUntil: order.reserved_until,
      checkoutPath: `/checkout/${order.id}`,
    });
  } catch (error) {
    await cancelCheckoutReservation(supabase, order.id, "failed");
    throw error;
  }
}

function aggregateItems(items: z.infer<typeof checkoutSchema>["items"]) {
  const quantities = new Map<string, number>();

  for (const item of items) {
    quantities.set(
      item.ticketTypeId,
      (quantities.get(item.ticketTypeId) ?? 0) + item.quantity,
    );
  }

  return [...quantities.entries()].map(([ticketTypeId, quantity]) => ({
    ticketTypeId,
    quantity,
  }));
}

async function createReservation({
  eventId,
  lineItems,
  supabase,
}: {
  eventId: string;
  lineItems: {
    ticketType: TicketType;
    quantity: number;
    stripePriceId: string;
    stripeUnitAmount: number;
    stripeCurrency: string;
  }[];
  supabase: ReturnType<typeof createServiceClient>;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .rpc("ticketing_create_checkout_reservation", {
        p_event_id: eventId,
        p_order_reference: createOrderReference(),
        p_items: lineItems.map((item) => ({
          ticket_type_id: item.ticketType.id,
          quantity: item.quantity,
          stripe_price_id: item.stripePriceId,
          unit_amount_cents: item.stripeUnitAmount,
          currency: item.stripeCurrency,
        })),
        p_reservation_minutes: RESERVATION_MINUTES,
      })
      .single();

    if (!error) {
      const reservation = data as CheckoutReservationResult;

      return {
        id: reservation.order_id,
        amount_total_cents: reservation.amount_total_cents,
        currency: reservation.currency,
        reserved_until: reservation.reserved_until,
      };
    }

    if (error.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Could not create a unique order reference.");
}

async function cancelExpiredReservations(
  supabase: ReturnType<typeof createServiceClient>,
) {
  const { error } = await supabase.rpc(
    "ticketing_cancel_expired_reservations",
    {
      p_limit: 100,
      p_now: new Date().toISOString(),
    },
  );

  if (error) {
    throw error;
  }
}

async function cancelCheckoutReservation(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  reason: "cancelled" | "failed" = "cancelled",
) {
  const { error } = await supabase.rpc(
    "ticketing_cancel_checkout_reservation",
    {
      p_order_id: orderId,
      p_reason: reason,
      p_stripe_checkout_session_id: null,
    },
  );

  if (error) {
    throw error;
  }
}