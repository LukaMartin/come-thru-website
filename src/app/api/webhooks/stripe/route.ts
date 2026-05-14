import type Stripe from "stripe";
import { sendTicketEmail } from "@/lib/email";
import { requireEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import {
  createTicketQrDataUrl,
  createTicketSecret,
  getTicketUrl,
  hashTicketSecret,
} from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook.";
    return Response.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("ticketing_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  const { error: webhookError } = await supabase
    .from("ticketing_webhook_events")
    .insert({
      id: event.id,
      type: event.type,
    });

  if (webhookError) {
    throw webhookError;
  }

  return Response.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id ?? session.client_reference_id;

  if (!orderId) {
    throw new Error("Stripe session is missing order_id metadata.");
  }

  const stripe = createStripeClient();
  const supabase = createServiceClient();
  const buyerEmail =
    session.customer_details?.email ?? session.customer_email ?? null;
  const buyerName = session.customer_details?.name ?? null;

  const { data: order, error: orderError } = await supabase
    .from("ticketing_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError) {
    throw orderError;
  }

  if (order.status === "paid") {
    return;
  }

  const { data: event, error: eventError } = await supabase
    .from("ticketing_events")
    .select("*")
    .eq("id", order.event_id)
    .single();

  if (eventError) {
    throw eventError;
  }

  const { data: existingOrderItems, error: orderItemsError } = await supabase
    .from("ticketing_order_items")
    .select("*")
    .eq("order_id", order.id);

  if (orderItemsError) {
    throw orderItemsError;
  }

  let orderItems = existingOrderItems ?? [];

  if (orderItems.length === 0) {
    const stripeLineItems = await stripe.checkout.sessions.listLineItems(
      session.id,
      {
        limit: 100,
      },
    );
    const stripePriceIds = [
      ...new Set(
        stripeLineItems.data
          .map((item) => item.price?.id)
          .filter((priceId): priceId is string => Boolean(priceId)),
      ),
    ];

    if (stripePriceIds.length === 0) {
      throw new Error("Stripe session has no line item price IDs.");
    }

    const { data: stripeTicketTypes, error: stripeTicketTypesError } =
      await supabase
        .from("ticketing_ticket_types")
        .select("*")
        .eq("event_id", order.event_id)
        .in("stripe_price_id", stripePriceIds);

    if (stripeTicketTypesError) {
      throw stripeTicketTypesError;
    }

    const ticketTypeByStripePriceId = new Map(
      (stripeTicketTypes ?? []).map((ticket) => [
        ticket.stripe_price_id,
        ticket,
      ]),
    );
    const rows = stripeLineItems.data.map((item) => {
      const priceId = item.price?.id;
      const ticketType = priceId
        ? ticketTypeByStripePriceId.get(priceId)
        : null;

      if (!ticketType) {
        throw new Error(
          `No ticket type found for Stripe price ${priceId ?? "unknown"}.`,
        );
      }

      return {
        order_id: order.id,
        ticket_type_id: ticketType.id,
        quantity: item.quantity ?? 1,
        unit_amount_cents: item.price?.unit_amount ?? ticketType.price_cents,
      };
    });

    const { data: createdOrderItems, error: createOrderItemsError } =
      await supabase.from("ticketing_order_items").insert(rows).select();

    if (createOrderItemsError) {
      throw createOrderItemsError;
    }

    orderItems = createdOrderItems ?? [];
  }

  const ticketTypeIds = [
    ...new Set(orderItems.map((item) => item.ticket_type_id)),
  ];
  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from("ticketing_ticket_types")
    .select("*")
    .in("id", ticketTypeIds);

  if (ticketTypesError) {
    throw ticketTypesError;
  }

  const ticketTypeById = new Map(
    (ticketTypes ?? []).map((ticket) => [ticket.id, ticket]),
  );
  const pendingTickets = (orderItems ?? []).flatMap((item) =>
    Array.from({ length: item.quantity }).map(() => {
      const secret = createTicketSecret();
      return {
        secret,
        row: {
          order_id: order.id,
          ticket_type_id: item.ticket_type_id,
          event_id: order.event_id,
          secret_hash: hashTicketSecret(secret),
          attendee_email: buyerEmail,
          attendee_name: buyerName,
        },
      };
    }),
  );

  const { data: tickets, error: ticketInsertError } = await supabase
    .from("ticketing_tickets")
    .insert(pendingTickets.map((ticket) => ticket.row))
    .select();

  if (ticketInsertError) {
    throw ticketInsertError;
  }

  const { error: updateOrderError } = await supabase
    .from("ticketing_orders")
    .update({
      status: "paid",
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      amount_total_cents: session.amount_total ?? order.amount_total_cents,
      currency: session.currency ?? order.currency,
    })
    .eq("id", order.id);

  if (updateOrderError) {
    throw updateOrderError;
  }

  if (buyerEmail && tickets) {
    const emailTickets = await Promise.all(
      tickets.map(async (ticket, index) => {
        const secret = pendingTickets[index]?.secret;
        const ticketType = ticketTypeById.get(ticket.ticket_type_id);

        if (!secret || !ticketType) {
          throw new Error("Unable to match created ticket to its secret.");
        }

        return {
          code: ticket.ticket_code,
          ticketNumber: ticket.ticket_number,
          qrDataUrl: await createTicketQrDataUrl(ticket.ticket_code, secret),
          ticketName: ticketType.name,
          ticketUrl: getTicketUrl(ticket.ticket_code, secret),
        };
      }),
    );

    await sendTicketEmail({
      to: buyerEmail,
      eventName: event.name,
      venue: event.venue,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      orderTotalCents: session.amount_total ?? order.amount_total_cents,
      currency: session.currency ?? order.currency,
      tickets: emailTickets,
      venueAddress: event.venue_address,
    });
  }
}
