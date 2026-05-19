import type { Metadata } from "next";
import Link from "next/link";

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

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 py-8 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f3eadb]/12 pb-6">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              Admin
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-[-0.06em]">
              Events
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/gallery"
              className="rounded-full border border-[#f3eadb]/18 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f8f0e3] transition hover:bg-[#f3eadb]/10"
            >
              Gallery
            </Link>
            <Link
              href="/admin/events/new"
              className="rounded-full bg-[#f8f0e3] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white"
            >
              New event
            </Link>
            <Link
              href="/admin/logout"
              className="rounded-full border border-[#f3eadb]/18 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f8f0e3] transition hover:bg-[#f3eadb]/10"
            >
              Log out
            </Link>
          </div>
        </header>

        <section className="grid gap-4">
          {events.length === 0 ? (
            <div className="border border-[#f3eadb]/14 bg-[#080706] p-6 text-sm text-[#f3eadb]/68">
              No events yet.
            </div>
          ) : null}

          {events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/events/${event.id}`}
              prefetch={false}
              className="group grid gap-4 border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.26),transparent_34%),#0d0908] p-5 transition hover:border-[#d7c7ad]/45 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[#f3eadb]/14 px-3 py-1 text-[0.65rem] uppercase tracking-[0.24em] text-[#d7c7ad]">
                    {statusLabel(event)}
                  </span>
                  <span className="text-xs text-[#f3eadb]/50">
                    {event.slug}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-black uppercase leading-none tracking-[-0.04em]">
                  {event.name}
                </h2>
                <p className="mt-3 text-sm text-[#f3eadb]/64">
                  {formatEventDateRange(event.starts_at, event.ends_at)}
                  {" / "}
                  {event.venue}
                </p>
              </div>
              <div className="text-sm text-[#f3eadb]/58 md:text-right">
                <p>{event.ticketing_ticket_types?.length ?? 0} ticket types</p>
                <p className="mt-2 transition group-hover:text-[#f8f0e3]">
                  Edit -&gt;
                </p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
