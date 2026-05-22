import type Stripe from "stripe";
import type { Database } from "@/lib/database.types";
import { sendTicketEmail } from "@/lib/email";
import { requireEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import {
  createTicketQrDataUrl,
  createTicketCode,
  createTicketSecret,
  getTicketUrl,
  hashTicketSecret,
} from "@/lib/tickets";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

type TicketType = Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];

type FulfilledTicket = {
  id: string;
  ticket_type_id: string;
  ticket_code: string;
  ticket_number: string;
  ticket_secret: string;
};

type FulfillmentResult = {
  processed: boolean;
  duplicate: boolean;
  capacity_exceeded: boolean;
  failure_reason: string | null;
  event_name: string;
  venue: string;
  venue_address: string | null;
  starts_at: string;
  ends_at: string | null;
  order_reference: string;
  order_total_cents: number;
  order_currency: string;
  ticket_email_status: "pending" | "sent" | "failed" | "skipped";
  tickets: FulfilledTicket[] | null;
};

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

  if (event.type === "checkout.session.completed") {
    const fulfillment = await handleCheckoutCompleted(
      event.id,
      event.type,
      event.data.object as Stripe.Checkout.Session,
    );

    return Response.json({ received: true, ...fulfillment });
  }

  const duplicate = await recordWebhookEvent(event.id, event.type);

  return Response.json({ received: true, duplicate });
}

async function recordWebhookEvent(eventId: string, eventType: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ticketing_webhook_events")
    .insert({
      id: eventId,
      type: eventType,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return true;
    }

    throw error;
  }

  return !data;
}

async function handleCheckoutCompleted(
  webhookEventId: string,
  webhookEventType: string,
  session: Stripe.Checkout.Session,
) {
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

  if (order.stripe_checkout_session_id !== session.id) {
    throw new Error("Stripe session does not match the order.");
  }

  if (order.status !== "pending" && order.status !== "paid") {
    throw new Error(`Order cannot be fulfilled from status ${order.status}.`);
  }

  if (session.payment_status !== "paid") {
    throw new Error("Stripe session is not paid.");
  }

  if (
    session.amount_total !== null &&
    session.amount_total !== order.amount_total_cents
  ) {
    throw new Error("Stripe session amount does not match the pending order.");
  }

  if (
    session.currency &&
    session.currency.toLowerCase() !== order.currency.toLowerCase()
  ) {
    throw new Error(
      "Stripe session currency does not match the pending order.",
    );
  }

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
    ((stripeTicketTypes ?? []) as TicketType[]).map((ticket) => [
      ticket.stripe_price_id,
      ticket,
    ]),
  );

  const orderItems = stripeLineItems.data.map((item) => {
    const priceId = item.price?.id;
    const ticketType = priceId ? ticketTypeByStripePriceId.get(priceId) : null;

    if (!ticketType) {
      throw new Error(
        `No ticket type found for Stripe price ${priceId ?? "unknown"}.`,
      );
    }

    return {
      ticket_type_id: ticketType.id,
      quantity: item.quantity ?? 1,
      unit_amount_cents: item.price?.unit_amount ?? ticketType.price_cents,
    };
  });

  const ticketTypeById = new Map(
    [...ticketTypeByStripePriceId.values()].map((ticket) => [
      ticket.id,
      ticket,
    ]),
  );

  let nextTicketNumber = 1;
  
  const pendingTickets = orderItems.flatMap((item) =>
    Array.from({ length: item.quantity }).map(() => {
      const secret = createTicketSecret();
      const ticketCode = createTicketCode();
      const ticketNumber = `${order.order_reference}-${String(
        nextTicketNumber,
      ).padStart(3, "0")}`;

      nextTicketNumber += 1;

      return {
        secret,
        ticket_type_id: item.ticket_type_id,
        ticket_code: ticketCode,
        ticket_number: ticketNumber,
        secret_hash: hashTicketSecret(secret),
      };
    }),
  );

  const { data: rawFulfillment, error: fulfillmentError } = await supabase
    .rpc("ticketing_fulfill_checkout_session", {
      p_webhook_event_id: webhookEventId,
      p_webhook_event_type: webhookEventType,
      p_order_id: order.id,
      p_stripe_checkout_session_id: session.id,
      p_stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      p_payment_status: session.payment_status,
      p_amount_total_cents: session.amount_total,
      p_currency: session.currency,
      p_buyer_email: buyerEmail,
      p_buyer_name: buyerName,
      p_order_items: orderItems,
      p_tickets: pendingTickets.map((ticket) => ({
        ticket_type_id: ticket.ticket_type_id,
        ticket_code: ticket.ticket_code,
        ticket_number: ticket.ticket_number,
        ticket_secret: ticket.secret,
        secret_hash: ticket.secret_hash,
      })),
    })
    .single();

  if (fulfillmentError) {
    throw fulfillmentError;
  }

  if (!rawFulfillment) {
    throw new Error("Checkout fulfillment did not return a result.");
  }

  const fulfillment = rawFulfillment as FulfillmentResult;
  const fulfilledTickets = (fulfillment.tickets ?? []) as FulfilledTicket[];

  if (fulfilledTickets.length > 0) {
    if (!buyerEmail) {
      await markTicketEmailDelivery(order.id, "skipped");
    } else {
      try {
        const emailTickets = await Promise.all(
          fulfilledTickets.map(async (ticket) => {
            const ticketType = ticketTypeById.get(ticket.ticket_type_id);

            if (!ticketType) {
              throw new Error("Unable to match created ticket to its secret.");
            }

            return {
              code: ticket.ticket_code,
              ticketNumber: ticket.ticket_number,
              qrDataUrl: await createTicketQrDataUrl(
                ticket.ticket_code,
                ticket.ticket_secret,
              ),
              ticketName: ticketType.name,
              ticketUrl: getTicketUrl(ticket.ticket_code, ticket.ticket_secret),
            };
          }),
        );

        await sendTicketEmail({
          to: buyerEmail,
          eventName: fulfillment.event_name,
          venue: fulfillment.venue,
          startsAt: fulfillment.starts_at,
          endsAt: fulfillment.ends_at,
          orderTotalCents: fulfillment.order_total_cents,
          orderReference: fulfillment.order_reference,
          currency: fulfillment.order_currency,
          tickets: emailTickets,
          venueAddress: fulfillment.venue_address ?? "",
        });
        await markTicketEmailDelivery(order.id, "sent");
      } catch (error) {
        try {
          await markTicketEmailDelivery(
            order.id,
            "failed",
            error instanceof Error ? error.message : "Ticket email failed.",
          );
        } catch (deliveryError) {
          Sentry.captureException(deliveryError, {
            tags: {
              "app.area": "stripe_webhook",
              "email.delivery_status": "failed",
              "order.id": order.id,
              "stripe.checkout_session_id": session.id,
              "stripe.event_type": webhookEventType,
              "stripe.webhook_event_id": webhookEventId,
            },
          });
        }

        throw error;
      }
    }
  }

  return {
    duplicate: fulfillment.duplicate,
    processed: fulfillment.processed,
    capacityExceeded: fulfillment.capacity_exceeded,
    failureReason: fulfillment.failure_reason,
  };
}

async function markTicketEmailDelivery(
  orderId: string,
  status: "sent" | "failed" | "skipped",
  error?: string,
) {
  const supabase = createServiceClient();
  const { error: updateError } = await supabase.rpc(
    "ticketing_mark_ticket_email_delivery",
    {
      p_order_id: orderId,
      p_status: status,
      p_error: error ?? null,
    },
  );

  if (updateError) {
    throw updateError;
  }
}
