import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveEventAction,
  createTicketTypeAction,
  publishCurrentEventAction,
  updateEventAction,
  updateTicketTypeAction,
} from "@/app/admin/events/actions";
import { AdminEventForm } from "@/components/AdminEventForm";
import { AdminTicketTypeForm } from "@/components/AdminTicketTypeForm";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";
import { formatEventDateRange } from "@/lib/tickets";

type EventRow = Database["public"]["Tables"]["ticketing_events"]["Row"];
type TicketTypeRow =
  Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];

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
  const createTicketType = createTicketTypeAction.bind(null, event.id);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 py-8 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8">
        <header className="grid gap-5 border-b border-[#f3eadb]/12 pb-6 md:grid-cols-[1fr_auto]">
          <div>
            <Link
              href="/admin/events"
              className="text-xs uppercase tracking-[0.28em] text-[#d7c7ad] transition hover:text-[#f8f0e3]"
            >
              Back to events
            </Link>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-[-0.06em]">
              {event.name}
            </h1>
            <p className="mt-4 text-sm text-[#f3eadb]/64">
              {formatEventDateRange(event.starts_at, event.ends_at)}
              {" / "}
              {event.venue}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:min-w-72">
            <form action={publishCurrentEventAction} className="grid gap-3">
              <input type="hidden" name="eventId" value={event.id} />
              <label className="flex items-center gap-3 text-sm text-[#f3eadb]/72">
                <input
                  name="archive_previous"
                  type="checkbox"
                  defaultChecked
                  className="size-4 accent-[#f8f0e3]"
                />
                Archive previous current event
              </label>
              <button
                type="submit"
                className="rounded-full bg-[#f8f0e3] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white"
              >
                Publish as current
              </button>
            </form>
            <form action={archiveEventAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <button
                type="submit"
                className="w-full rounded-full border border-[#f3eadb]/18 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f8f0e3] transition hover:bg-[#f3eadb]/10"
              >
                Archive event
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-4">
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-[#f3eadb]/58">
            <span>Status: {event.status}</span>
            <span>Current: {event.is_current ? "yes" : "no"}</span>
            <span>Slug: {event.slug}</span>
          </div>
          <div className="border border-[#f3eadb]/14 bg-[#080706] p-5 md:p-6">
            <h2 className="mb-5 text-2xl font-black uppercase tracking-[-0.04em]">
              Event details
            </h2>
            <AdminEventForm action={updateEvent} event={event} mode="edit" />
          </div>
        </section>

        <section className="grid gap-5">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              Tickets
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.05em]">
              Ticket types
            </h2>
          </div>

          <div className="grid gap-4">
            {(ticketTypes ?? []).map((ticketType) => (
              <div
                key={ticketType.id}
                className="border border-[#f3eadb]/14 bg-[#080706] p-5 md:p-6"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-[-0.03em]">
                      {ticketType.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#f3eadb]/58">
                      {ticketType.active ? "Active" : "Inactive"} / capacity{" "}
                      {ticketType.capacity}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-[#f3eadb]/45">
                    {ticketType.id}
                  </p>
                </div>
                <AdminTicketTypeForm
                  action={updateTicketTypeAction.bind(
                    null,
                    event.id,
                    ticketType.id,
                  )}
                  ticketType={ticketType}
                />
              </div>
            ))}
          </div>

          <div className="border border-[#f3eadb]/14 bg-[#080706] p-5 md:p-6">
            <h3 className="mb-5 text-xl font-black uppercase tracking-[-0.03em]">
              Add ticket type
            </h3>
            <AdminTicketTypeForm action={createTicketType} />
          </div>
        </section>
      </div>
    </main>
  );
}
