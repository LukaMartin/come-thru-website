import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowUpRight, FiCalendar, FiPlus, FiTag } from "react-icons/fi";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminShell } from "@/components/admin/AdminShell";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";
import { formatEventDateRange } from "@/lib/tickets";

type EventRow = Database["public"]["Tables"]["ticketing_events"]["Row"];
type TicketTypeRow =
  Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];
type EventWithTicketTypes = EventRow & {
  ticketing_ticket_types: TicketTypeRow[];
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Events | Come Thru",
};

function statusLabel(event: EventRow) {
  if (event.is_current) {
    return "Current";
  }

  return event.status;
}

function statusPillClass(event: EventRow) {
  if (event.is_current) {
    return "border-sky-400/25 bg-sky-400/10 text-sky-100";
  }

  if (event.status === "published") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export default async function AdminEventsPage() {
  await requireAdmin();

  const { supabase } = await createSessionAuthClient();
  const { data, error } = await supabase
    .from("ticketing_events")
    .select("*, ticketing_ticket_types(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const events = (data ?? []) as EventWithTicketTypes[];
  const currentEventCount = events.filter((event) => event.is_current).length;
  const publishedEventCount = events.filter(
    (event) => event.status === "published",
  ).length;
  const ticketTypeCount = events.reduce(
    (total, event) => total + (event.ticketing_ticket_types?.length ?? 0),
    0,
  );

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Ticketing"
        title="Events"
        description="Manage event setup, ticket inventory, lineup details, orders, and the current published event."
        actions={
          <Link
            href="/admin/events/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-admin-primary px-4 py-2.5 text-sm font-medium text-admin-primary-text transition hover:bg-white"
          >
            <FiPlus aria-hidden className="size-4" />
            New event
          </Link>
        }
      />

      <section className="grid gap-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total events", value: events.length, icon: FiCalendar },
            { label: "Current events", value: currentEventCount, icon: FiTag },
            { label: "Ticket types", value: ticketTypeCount, icon: FiTag },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-admin-border bg-admin-surface p-4 shadow-sm shadow-black/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-admin-muted">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-admin-text">
                    {stat.value}
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-admin-border bg-admin-surface-elevated text-admin-muted">
                  <stat.icon aria-hidden className="size-4" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-admin-border bg-admin-surface shadow-sm shadow-black/20">
          <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-admin-text">
                Event library
              </h2>
              <p className="mt-1 text-xs text-admin-subtle">
                {publishedEventCount} published, {events.length} total
              </p>
            </div>
          </div>

          <div className="grid gap-2 p-3">
            {events.length === 0 ? (
              <div className="grid min-h-56 place-items-center rounded-xl border border-admin-border bg-black/10 p-6 text-center">
                <div>
                  <FiCalendar
                    aria-hidden
                    className="mx-auto size-8 text-admin-subtle"
                  />
                  <p className="mt-4 text-sm font-semibold text-admin-text">
                    No events yet
                  </p>
                  <p className="mt-2 text-xs leading-5 text-admin-muted">
                    Create a draft event to start setting up tickets and lineup.
                  </p>
                </div>
              </div>
            ) : null}

            {events.map((event) => (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 rounded-xl border border-admin-border bg-black/10 p-4 transition duration-500 hover:border-admin-border-strong hover:bg-admin-surface-elevated"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClass(event)}`}
                    >
                      {statusLabel(event)}
                    </span>
                    <span className="truncate text-xs text-admin-subtle">
                      /{event.slug}
                    </span>
                  </div>
                  <h2 className="mt-3 truncate text-lg font-semibold tracking-[-0.03em] text-admin-text">
                    {event.name}
                  </h2>
                  <p className="mt-2 truncate text-sm text-admin-muted">
                    {formatEventDateRange(event.starts_at, event.ends_at)}
                    {" / "}
                    {event.venue}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-admin-muted">
                  {event.ticketing_ticket_types?.length > 0 && (
                    <div className="rounded-xl h-10 flex items-center justify-center border border-admin-border bg-admin-surface px-3 py-2">
                      <p className="text-xs font-medium text-admin-muted ">
                        {event.ticketing_ticket_types?.length ?? 0}{" "}
                        {event.ticketing_ticket_types?.length === 1
                          ? "ticket type"
                          : "ticket types"}
                      </p>
                    </div>
                  )}
                  <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 text-xs font-medium text-admin-muted transition duration-500 group-hover:border-admin-border-strong group-hover:bg-admin-primary group-hover:text-admin-primary-text">
                    Open
                    <FiArrowUpRight aria-hidden className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
