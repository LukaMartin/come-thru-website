import type Stripe from "stripe";
import type { Database } from "@/lib/database.types";
import { sendTicketEmail } from "@/lib/email";
import { requireEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";
import {
  createTicketCode,
  createTicketQrDataUrl,
  createTicketSecret,
  getTicketUrl,
  hashTicketSecret,
} from "@/lib/tickets";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

type TicketType = Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];
type OrderItem = Database["public"]["Tables"]["ticketing_order_items"]["Row"];

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
  ticket_colours: string | null;
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

  if (event.type === "payment_intent.succeeded") {
    const fulfillment = await handlePaymentIntentSucceeded(
      event.id,
      event.type,
      event.data.object as Stripe.PaymentIntent,
      stripe,
    );

    return Response.json({ received: true, ...fulfillment });
  }

  if (
    event.type === "payment_intent.payment_failed" ||
    event.type === "payment_intent.canceled"
  ) {
    const cancellation = await handlePaymentIntentStopped(
      event.id,
      event.type,
      event.data.object as Stripe.PaymentIntent,
    );

    return Response.json({ received: true, ...cancellation });
  }

  const duplicate = await recordWebhookEvent(event.id, event.type);

  return Response.json({ received: true, duplicate });
}

async function handlePaymentIntentStopped(
  webhookEventId: string,
  webhookEventType: string,
  paymentIntent: Stripe.PaymentIntent,
) {
  const duplicate = await recordWebhookEvent(webhookEventId, webhookEventType);

  if (duplicate) {
    return { duplicate };
  }

  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    return { duplicate, cancelled: false };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc(
    "ticketing_cancel_checkout_reservation",
    {
      p_order_id: orderId,
      p_reason: paymentIntent.status === "canceled" ? "cancelled" : "failed",
      p_stripe_checkout_session_id: null,
    },
  );

  if (error) {
    throw error;
  }

  return { duplicate, cancelled: true };
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

async function handlePaymentIntentSucceeded(
  webhookEventId: string,
  webhookEventType: string,
  paymentIntent: Stripe.PaymentIntent,
  stripeClient?: ReturnType<typeof createStripeClient>,
) {
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    throw new Error("PaymentIntent is missing order_id metadata.");
  }

  const stripe = stripeClient ?? createStripeClient();
  const supabase = createServiceClient();
  const { email: buyerEmail, name: buyerName } = await getPaymentBuyerDetails(
    stripe,
    paymentIntent,
  );

  const { data: order, error: orderError } = await supabase
    .from("ticketing_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError) {
    throw orderError;
  }

  if (order.stripe_payment_intent_id !== paymentIntent.id) {
    throw new Error("Stripe payment intent does not match the order.");
  }

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Stripe payment intent is not succeeded.");
  }

  if (paymentIntent.amount_received !== order.amount_total_cents) {
    throw new Error("Stripe payment amount does not match the pending order.");
  }

  if (paymentIntent.currency.toLowerCase() !== order.currency.toLowerCase()) {
    throw new Error(
      "Stripe payment currency does not match the pending order.",
    );
  }

  const { data: reservedOrderItems, error: orderItemsError } = await supabase
    .from("ticketing_order_items")
    .select("*")
    .eq("order_id", order.id);

  if (orderItemsError) {
    throw orderItemsError;
  }

  const orderItems = (reservedOrderItems ?? []) as OrderItem[];
  const ticketTypeIds = [
    ...new Set(orderItems.map((item) => item.ticket_type_id)),
  ];

  if (ticketTypeIds.length === 0) {
    throw new Error("Checkout reservation has no order items.");
  }

  const { data: orderTicketTypes, error: ticketTypesError } = await supabase
    .from("ticketing_ticket_types")
    .select("*")
    .eq("event_id", order.event_id)
    .in("id", ticketTypeIds);

  if (ticketTypesError) {
    throw ticketTypesError;
  }

  const ticketTypes = (orderTicketTypes ?? []) as TicketType[];
  const ticketTypeById = new Map(
    ticketTypes.map((ticket) => [ticket.id, ticket]),
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
    .rpc("ticketing_fulfill_payment_intent", {
      p_webhook_event_id: webhookEventId,
      p_webhook_event_type: webhookEventType,
      p_order_id: order.id,
      p_stripe_payment_intent_id: paymentIntent.id,
      p_payment_status: paymentIntent.status,
      p_amount_total_cents: paymentIntent.amount_received,
      p_currency: paymentIntent.currency,
      p_buyer_email: buyerEmail,
      p_buyer_name: buyerName,
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
    throw new Error("Payment fulfillment did not return a result.");
  }

  const fulfillment = rawFulfillment as FulfillmentResult;
  const fulfilledTickets = (fulfillment.tickets ?? []) as FulfilledTicket[];

  if (fulfillment.failure_reason === "reservation_expired") {
    await refundPaymentIntent(
      stripe,
      paymentIntent.id,
      order.id,
      "reservation_expired",
    );
  }

  if (fulfillment.capacity_exceeded) {
    await refundPaymentIntent(
      stripe,
      paymentIntent.id,
      order.id,
      "capacity_exceeded",
    );
  }

  if (fulfilledTickets.length > 0) {
    if (!buyerEmail) {
      await markTicketEmailDelivery(order.id, "skipped", undefined, supabase);
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
          ticketColours: fulfillment.ticket_colours ?? "",
        });
        await markTicketEmailDelivery(order.id, "sent", undefined, supabase);
      } catch (error) {
        try {
          await markTicketEmailDelivery(
            order.id,
            "failed",
            error instanceof Error ? error.message : "Ticket email failed.",
            supabase,
          );
        } catch (deliveryError) {
          Sentry.captureException(deliveryError, {
            tags: {
              "app.area": "stripe_webhook",
              "email.delivery_status": "failed",
              "order.id": order.id,
              "stripe.event_type": webhookEventType,
              "stripe.payment_intent_id": paymentIntent.id,
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

async function getPaymentBuyerDetails(
  stripe: ReturnType<typeof createStripeClient>,
  paymentIntent: Stripe.PaymentIntent,
) {
  const latestCharge = paymentIntent.latest_charge;

  if (typeof latestCharge === "string") {
    const charge = await stripe.charges.retrieve(latestCharge);

    return {
      email:
        charge.billing_details.email ?? paymentIntent.receipt_email ?? null,
      name: charge.billing_details.name ?? null,
    };
  }

  if (latestCharge && typeof latestCharge !== "string") {
    return {
      email:
        latestCharge.billing_details.email ??
        paymentIntent.receipt_email ??
        null,
      name: latestCharge.billing_details.name ?? null,
    };
  }

  return {
    email: paymentIntent.receipt_email ?? null,
    name: null,
  };
}

async function refundPaymentIntent(
  stripe: ReturnType<typeof createStripeClient>,
  paymentIntentId: string,
  orderId: string,
  reason: "reservation_expired" | "capacity_exceeded",
) {
  await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      metadata: {
        order_id: orderId,
        reason,
      },
    },
    {
      idempotencyKey: `ticketing-${orderId}-${reason}`,
    },
  );
}

async function markTicketEmailDelivery(
  orderId: string,
  status: "sent" | "failed" | "skipped",
  error?: string,
  supabaseClient?: ReturnType<typeof createServiceClient>,
) {
  const supabase = supabaseClient ?? createServiceClient();
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
