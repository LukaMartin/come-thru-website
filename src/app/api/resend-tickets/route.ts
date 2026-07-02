import { getAdminAuthState } from "@/lib/admin-auth";
import { markTicketEmailDelivery, sendTicketEmail } from "@/lib/email";
import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/server";
import {
  createTicketQrDataUrl,
  decryptTicketSecret,
  getTicketResendAvailability,
  getTicketUrl,
  type EncryptedTicketSecret,
} from "@/lib/tickets";
import { z } from "zod";

const resendTicketsSchema = z.object({
  orderId: z.uuid(),
});

type TicketStatus =
  Database["public"]["Tables"]["ticketing_tickets"]["Row"]["status"];

type ResendEvent = {
  name: string;
  venue: string;
  venue_address: string | null;
  starts_at: string;
  ends_at: string | null;
  ticket_colours: string | null;
};

type ResendTicketSecret = {
  ticket_secret_version: number;
  ticket_secret_algorithm: "aes-256-gcm";
  ticket_secret_iv: string;
  ticket_secret_ciphertext: string;
  ticket_secret_auth_tag: string;
};

type ResendTicket = {
  id: string;
  ticket_code: string;
  ticket_number: string;
  status: TicketStatus;
  ticketing_ticket_types: {
    name: string;
  } | null;
  ticketing_ticket_email_secrets:
    | ResendTicketSecret
    | ResendTicketSecret[]
    | null;
};

type ResendOrder = {
  id: string;
  buyer_email: string | null;
  status: Database["public"]["Tables"]["ticketing_orders"]["Row"]["status"];
  amount_total_cents: number;
  currency: string;
  order_reference: string;
  ticket_email_sent_at: string | null;
  ticketing_events: ResendEvent | ResendEvent[] | null;
  ticketing_tickets: ResendTicket[];
};

export async function POST(request: Request) {
  const auth = await getAdminAuthState();

  if (auth.status !== "admin") {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = resendTicketsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid resend tickets request." },
      { status: 400 },
    );
  }

  const { orderId } = parsed.data;

  const supabase = createServiceClient();
  const { data: rawOrder, error: orderError } = await supabase
    .from("ticketing_orders")
    .select(
      `
        id,
        buyer_email,
        status,
        amount_total_cents,
        currency,
        order_reference,
        ticket_email_sent_at,
        ticketing_events!inner (
          name,
          venue,
          venue_address,
          starts_at,
          ends_at,
          ticket_colours
        ),
        ticketing_tickets!inner (
          id,
          ticket_code,
          ticket_number,
          status,
          ticketing_ticket_types!inner (
            name
          ),
          ticketing_ticket_email_secrets!inner (
            ticket_secret_version,
            ticket_secret_algorithm,
            ticket_secret_iv,
            ticket_secret_ciphertext,
            ticket_secret_auth_tag
          )
        )
      `,
    )
    .eq("id", orderId)
    .in("ticketing_tickets.status", ["valid", "redeemed"])
    .single();

  if (orderError) {
    throw orderError;
  }

  const order = rawOrder as unknown as ResendOrder;
  const event = Array.isArray(order.ticketing_events)
    ? order.ticketing_events[0]
    : order.ticketing_events;

  if (!event) {
    return Response.json(
      { error: "Order event was not found." },
      { status: 404 },
    );
  }

  if (order.status !== "paid") {
    return Response.json(
      { error: "Only paid orders can have tickets resent." },
      { status: 409 },
    );
  }

  if (!order.buyer_email) {
    return Response.json(
      { error: "Order has no buyer email." },
      { status: 409 },
    );
  }

  if (order.ticketing_tickets.length === 0) {
    return Response.json(
      { error: "Order has no resendable tickets." },
      { status: 409 },
    );
  }

  const resendAvailability = getTicketResendAvailability(
    order.ticket_email_sent_at,
  );

  if (!resendAvailability.canResend) {
    return Response.json(
      {
        error: "Tickets can only be resent once every 12 hours.",
        nextResendAvailableAt: resendAvailability.nextResendAvailableAt,
      },
      { status: 429 },
    );
  }

  try {
    const tickets = await Promise.all(
      order.ticketing_tickets.map(async (ticket) => {
        const secret = Array.isArray(ticket.ticketing_ticket_email_secrets)
          ? ticket.ticketing_ticket_email_secrets[0]
          : ticket.ticketing_ticket_email_secrets;

        if (!ticket.ticketing_ticket_types || !secret) {
          throw new Error("Ticket email payload is incomplete.");
        }

        const encryptedSecretValues: EncryptedTicketSecret = {
          version: secret.ticket_secret_version,
          algorithm: secret.ticket_secret_algorithm,
          iv: secret.ticket_secret_iv,
          ciphertext: secret.ticket_secret_ciphertext,
          authTag: secret.ticket_secret_auth_tag,
        };

        const ticketSecret = decryptTicketSecret(encryptedSecretValues);

        return {
          code: ticket.ticket_code,
          ticketNumber: ticket.ticket_number,
          qrDataUrl: await createTicketQrDataUrl(
            ticket.ticket_code,
            ticketSecret,
          ),
          ticketName: ticket.ticketing_ticket_types.name,
          ticketUrl: getTicketUrl(ticket.ticket_code, ticketSecret),
        };
      }),
    );

    await sendTicketEmail({
      to: order.buyer_email,
      eventName: event.name,
      venue: event.venue,
      venueAddress: event.venue_address ?? "",
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      orderTotalCents: order.amount_total_cents,
      orderReference: order.order_reference,
      currency: order.currency,
      tickets,
      ticketColours: event.ticket_colours ?? "",
    });

    await markTicketEmailDelivery(order.id, "sent", undefined, supabase);

    return Response.json({
      resent: true,
      orderId: order.id,
      ticketCount: tickets.length,
      to: order.buyer_email,
      ticketEmailSentAt: new Date().toISOString(),
    });
  } catch (error) {
    throw error;
  }
}
