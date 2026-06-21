import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createTicketTypeAction,
  publishCurrentEventAction,
  updateEventAction,
  updateLineupArtistsAction,
  updateTicketTypeAction,
} from "@/lib/admin-events-actions";
import { AdminEventDashboard } from "@/components/AdminEventDashboard";
import type { AdminEventOrder } from "@/components/AdminEventOrders";
import { AdminEventForm } from "@/components/AdminEventForm";
import { AdminLineupArtistsForm } from "@/components/AdminLineupArtistsForm";
import { AdminTicketTypeCard } from "@/components/AdminTicketTypeCard";
import { AdminTicketTypeForm } from "@/components/AdminTicketTypeForm";
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
    stripePaymentIntentId: order.stripe_payment_intent_id,
    items: (orderItemsByOrderId.get(order.id) ?? []).map((item) => ({
      name: ticketTypeById.get(item.ticket_type_id)?.name ?? "Unknown ticket",
      quantity: item.quantity,
    })),
  }));

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 py-8 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8">
        <header className="flex flex-col border-b border-[#f3eadb]/12 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.06em]">
              {event.name}
            </h1>
            <Link
              href="/admin/events"
              className="group relative flex w-fit items-center gap-1.5 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7c7ad] transition-colors duration-300 hover:text-[#f8f0e3] after:absolute after:bottom-0 after:right-0 after:h-px after:w-[calc(100%-1.25rem)] after:bg-current after:transition-all after:duration-400 after:ease-out hover:after:w-full"
            >
              <span className="hover:-mr-5 opacity-0 transition-all duration-300 ease-out group-hover:mr-0 group-hover:opacity-100">
                &larr;
              </span>
              <span>Back to events</span>
            </Link>
          </div>

          <div>
            <p className="mt-4 text-sm text-[#f3eadb]/64">
              {formatEventDateRange(event.starts_at, event.ends_at)}
              {" / "}
              {event.venue}
            </p>
          </div>
        </header>

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
                  className="w-full rounded-md bg-[#f8f0e3] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white"
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
                className="border border-[#f3eadb]/14 bg-black/20 p-5 md:p-6"
              >
                <h3 className="mb-5 text-xl font-black uppercase tracking-[-0.03em]">
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
      </div>
    </main>
  );
}
