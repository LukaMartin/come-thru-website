import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/server";

type EventRow = Database["public"]["Tables"]["ticketing_events"]["Row"];
type TicketTypeRow =
  Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];
type LineupArtistRow = Database["public"]["Tables"]["lineup_artists"]["Row"];

export type EventWithTickets = EventRow & {
  ticketing_ticket_types: TicketTypeRow[];
};

export type LineupArtist = Pick<
  LineupArtistRow,
  "id" | "slot" | "name" | "soundcloud_url"
>;

export async function getCurrentEvent() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ticketing_events")
    .select(
      `
      *,
      ticketing_ticket_types (*)
    `,
    )
    .eq("status", "published")
    .eq("is_current", true)
    .eq("ticketing_ticket_types.active", true)
    .order("sort_order", {
      ascending: true,
      referencedTable: "ticketing_ticket_types",
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as EventWithTickets | null;
}

export async function getTicketCountsByType(
  ticketTypeIds: string[],
  supabaseClient?: ReturnType<typeof createServiceClient>,
) {
  if (ticketTypeIds.length === 0) {
    return new Map<string, number>();
  }

  const supabase = supabaseClient ?? createServiceClient();
  const { data: tickets, error: ticketsError } = await supabase
    .from("ticketing_tickets")
    .select("ticket_type_id")
    .in("ticket_type_id", ticketTypeIds)
    .in("status", ["valid", "redeemed"]);

  if (ticketsError) {
    throw ticketsError;
  }

  const counts = (tickets ?? []).reduce((ticketCounts, ticket) => {
    ticketCounts.set(
      ticket.ticket_type_id,
      (ticketCounts.get(ticket.ticket_type_id) ?? 0) + 1,
    );
    return ticketCounts;
  }, new Map<string, number>());

  const { data: reservations, error: reservationsError } = await supabase
    .from("ticketing_order_items")
    .select(
      `
      ticket_type_id,
      quantity,
      ticketing_orders!inner (
        status,
        reserved_until
      )
    `,
    )
    .in("ticket_type_id", ticketTypeIds)
    .eq("ticketing_orders.status", "pending")
    .gt("ticketing_orders.reserved_until", new Date().toISOString());

  if (reservationsError) {
    throw reservationsError;
  }

  for (const reservation of reservations ?? []) {
    counts.set(
      reservation.ticket_type_id,
      (counts.get(reservation.ticket_type_id) ?? 0) + reservation.quantity,
    );
  }

  return counts;
}

export async function getLineupArtistsByEventId(eventId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("lineup_artists")
    .select("id, slot, name, soundcloud_url")
    .eq("event_id", eventId)
    .order("slot", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as LineupArtist[];
}
