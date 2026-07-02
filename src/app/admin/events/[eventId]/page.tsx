import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import {
  createTicketTypeAction,
  publishCurrentEventAction,
  updateEventAction,
  updateLineupArtistsAction,
  updateTicketTypeAction,
} from "@/lib/admin-events-actions";
import { AdminEventDashboard } from "@/components/admin/AdminEventDashboard";
import type { AdminEventOrder } from "@/components/admin/AdminEventOrders";
import { AdminEventForm } from "@/components/admin/AdminEventForm";
import { AdminLineupArtistsForm } from "@/components/admin/AdminLineupArtistsForm";
import { AdminTicketTypeCard } from "@/components/admin/AdminTicketTypeCard";
import { AdminTicketTypeForm } from "@/components/admin/AdminTicketTypeForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminShell } from "@/components/admin/AdminShell";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";
import { formatEventDateRange } from "@/lib/tickets";

type EventRow = Database["public"]["Tables"]["ticketing_events"]["Row"];
type TicketTypeRow =
  Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];
type LineupArtistRow = Database["public"]["Tables"]["lineup_artists"]["Row"];
type OrderRow = Database["public"]["Tables"]["ticketing_orders"]["Row"];
type OrderItemRow =
  Database["public"]["Tables"]["ticketing_order_items"]["Row"];

type AdminEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Admin Event | Come Thru",
};

export default async function AdminEventPage({ params }: AdminEventPageProps) {
  await requireAdmin();

  const { eventId } = await params;
  const { supabase } = await createSessionAuthClient();
  const { data: eventData, error: eventError } = await supabase
    .from("ticketing_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  const event = eventData as EventRow | null;

  if (!event) {
    notFound();
  }

  const { data: ticketTypeData, error: ticketTypesError } = await supabase
    .from("ticketing_ticket_types")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (ticketTypesError) {
    throw ticketTypesError;
  }

  const ticketTypes = (ticketTypeData ?? []) as TicketTypeRow[];
  const updateEvent = updateEventAction.bind(null, event.id);
  const updateLineupArtists = updateLineupArtistsAction.bind(null, event.id);
  const createTicketType = createTicketTypeAction.bind(null, event.id);

  const { data: lineupArtistData, error: lineupArtistsError } = await supabase
    .from("lineup_artists")
    .select("*")
    .eq("event_id", event.id)
    .order("slot", { ascending: true });

  if (lineupArtistsError) {
    throw lineupArtistsError;
  }

  const lineupArtists = (lineupArtistData ?? []) as LineupArtistRow[];
  const populatedArtistCount = lineupArtists.filter((artist) =>
    artist.name?.trim(),
  ).length;
  const { data: orderData, error: ordersError } = await supabase
    .from("ticketing_orders")
    .select("*")
    .eq("event_id", event.id)
    .in("status", ["paid", "refunded"])
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw ordersError;
  }

  const orderRows = (orderData ?? []) as OrderRow[];
  const orderIds = orderRows.map((order) => order.id);
  let orderItems: OrderItemRow[] = [];

  if (orderIds.length > 0) {
    const { data: orderItemData, error: orderItemsError } = await supabase
      .from("ticketing_order_items")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (orderItemsError) {
      throw orderItemsError;
    }

    orderItems = (orderItemData ?? []) as OrderItemRow[];
  }

  const ticketTypeById = new Map(
    ticketTypes.map((ticketType) => [ticketType.id, ticketType]),
  );
  const orderItemsByOrderId = orderItems.reduce((itemsByOrderId, item) => {
    const existingItems = itemsByOrderId.get(item.order_id) ?? [];

    existingItems.push(item);
    itemsByOrderId.set(item.order_id, existingItems);

    return itemsByOrderId;
  }, new Map<string, OrderItemRow[]>());
  const orders: AdminEventOrder[] = orderRows.map((order) => ({
    id: order.id,
    reference: order.order_reference,
    email: order.buyer_email,
    name: order.buyer_name,
    status: order.status === "refunded" ? "refunded" : "paid",
    totalCents: order.amount_total_cents,
    currency: order.currency,
    placedAt: order.created_at,
    ticketEmailSentAt: order.ticket_email_sent_at,
    stripePaymentIntentId: order.stripe_payment_intent_id,
    items: (orderItemsByOrderId.get(order.id) ?? []).map((item) => ({
      name: ticketTypeById.get(item.ticket_type_id)?.name ?? "Unknown ticket",
      quantity: item.quantity,
    })),
  }));

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Event editor"
        title={event.name}
        description={`${formatEventDateRange(event.starts_at, event.ends_at)} / ${event.venue}`}
        actions={
          <Link
            href="/admin/events"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-4 py-2.5 text-sm font-medium text-admin-muted transition hover:border-admin-border-strong hover:bg-admin-surface-elevated hover:text-admin-text"
          >
            <FiArrowLeft aria-hidden className="size-4" />
            Back to events
          </Link>
        }
      />

      <section>
        <AdminEventDashboard
          status={event.status}
          isCurrent={event.is_current}
          slug={event.slug}
          artistCount={populatedArtistCount}
          ticketTypeCount={ticketTypes.length}
          orders={orders}
          publishAction={
            event.is_current ? null : (
              <form action={publishCurrentEventAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-admin-primary px-4 py-2.5 text-sm font-medium text-admin-primary-text transition hover:bg-white"
                >
                  Publish as current
                </button>
              </form>
            )
          }
          eventDetails={
            <AdminEventForm action={updateEvent} event={event} mode="edit" />
          }
          artists={
            <AdminLineupArtistsForm
              action={updateLineupArtists}
              lineupArtists={lineupArtists}
            />
          }
          ticketTypes={
            <div className="grid gap-4">
              <div
                key="add-ticket-type"
                className="rounded-2xl border border-admin-border bg-black/10 p-5"
              >
                <h3 className="mb-5 text-base font-semibold tracking-[-0.03em] text-admin-text">
                  Add ticket type
                </h3>
                <AdminTicketTypeForm action={createTicketType} />
              </div>
              {(ticketTypes ?? []).map((ticketType) => (
                <AdminTicketTypeCard
                  key={ticketType.id}
                  action={updateTicketTypeAction.bind(
                    null,
                    event.id,
                    ticketType.id,
                  )}
                  ticketType={ticketType}
                />
              ))}
            </div>
          }
        />
      </section>
    </AdminShell>
  );
}
