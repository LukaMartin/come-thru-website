import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/server";
import {
  createTicketQrDataUrl,
  formatEventDateRange,
  hashTicketSecret,
} from "@/lib/tickets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Come Thru | Ticket Details",
  description: "View your Come Thru event ticket.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
};

type TicketPageProps = {
  params: Promise<{
    ticketCode: string;
  }>;
  searchParams?: Promise<{
    secret?: string;
  }>;
};

type TicketRow = Database["public"]["Tables"]["ticketing_tickets"]["Row"];
type EventRow = Pick<
  Database["public"]["Tables"]["ticketing_events"]["Row"],
  "name" | "venue" | "venue_address" | "starts_at" | "ends_at"
>;
type TicketTypeRow = Pick<
  Database["public"]["Tables"]["ticketing_ticket_types"]["Row"],
  "name" | "description"
>;

type TicketWithDetails = TicketRow & {
  ticketing_events: EventRow | null;
  ticketing_ticket_types: TicketTypeRow | null;
};

async function getTicket(ticketCode: string, secret: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ticketing_tickets")
    .select(
      `
        *,
        ticketing_events (
          name,
          venue,
          venue_address,
          starts_at,
          ends_at
        ),
        ticketing_ticket_types (
          name,
          description
        )
      `,
    )
    .eq("ticket_code", ticketCode)
    .eq("secret_hash", hashTicketSecret(secret))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TicketWithDetails | null;
}

export default async function TicketPage({
  params,
  searchParams,
}: TicketPageProps) {
  const [{ ticketCode }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const secret = resolvedSearchParams?.secret;

  if (!secret) {
    return <TicketLookupFailed />;
  }

  const ticket = await getTicket(ticketCode, secret);

  if (!ticket || !ticket.ticketing_events) {
    return <TicketLookupFailed />;
  }

  const qrDataUrl = await createTicketQrDataUrl(ticket.ticket_code, secret);
  const event = ticket.ticketing_events;
  const ticketType = ticket.ticketing_ticket_types;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8">
        <Header />

        <section className="grid gap-6 py-8 md:py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden border border-[#f3eadb]/14 p-5 text-black shadow-2xl shadow-black/40 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.18),transparent_34%)]" />
            <div className="relative mx-auto flex max-w-sm flex-col items-center gap-5">
              <div className="w-full border-2 border-black/70 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR code for ticket ${ticket.ticket_number}`}
                  className="aspect-square w-full"
                />
              </div>
              <div className="w-full border-t-2 border-dashed border-[#f3eadb]/12 pt-5 lg:pt-10 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d7c7ad]/58">
                  Ticket number
                </p>
                <p className="mt-2 font-mono text-xl font-bold tracking-[0.08em] text-[#f8f0e3]">
                  {ticket.ticket_number}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden border-y border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.32),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(215,199,173,0.14),transparent_28%),rgba(13,9,8,0.94)] p-5 shadow-2xl shadow-black/30 md:border md:p-7">
            <div className="pointer-events-none absolute -left-16 top-16 h-52 w-52 rounded-full bg-[#b5482f]/22 blur-3xl" />
            <div className="pointer-events-none absolute right-16 bottom-8 h-48 w-48 rounded-full bg-[#f2ab52]/14 blur-3xl" />

            <div className="relative">
              <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                Ticket details
              </p>

              <h1 className="mt-5 max-w-2xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] md:text-6xl">
                {event.name}
              </h1>

              <dl className="mt-8 grid gap-5 border-y border-[#f3eadb]/12 py-6 text-sm text-[#f3eadb]/70 sm:grid-cols-2">
                <TicketDetail
                  label="Ticket"
                  value={ticketType?.name ?? "Ticket"}
                />
                <TicketDetail
                  label="When"
                  value={formatEventDateRange(event.starts_at, event.ends_at)}
                />
                <TicketDetail label="Where" value={event.venue} />
                <TicketDetail
                  label="Address"
                  value={event.venue_address ?? "Venue address TBA"}
                />
              </dl>

              {ticketType?.description ? (
                <p className="mt-6 max-w-2xl text-sm leading-6 text-[#f3eadb]/62">
                  {ticketType.description}
                </p>
              ) : null}

              {ticket.status === "redeemed" && ticket.redeemed_at ? (
                <p className="mt-6 border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                  This ticket was scanned on{" "}
                  {new Intl.DateTimeFormat("en-AU", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Australia/Sydney",
                  }).format(new Date(ticket.redeemed_at))}
                  .
                </p>
              ) : (
                <p className="mt-6 border border-[#f3eadb]/12 bg-black/18 p-4 text-sm leading-6 text-[#f3eadb]/62">
                  Opening this page does not check you in. Door staff will scan
                  the QR code at entry.
                </p>
              )}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}

function TicketDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58">
        {label}
      </dt>
      <dd className="mt-2 font-medium text-[#f8f0e3]">{value}</dd>
    </div>
  );
}

function TicketLookupFailed() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <section className="flex flex-1 items-center py-8 md:py-12">
          <div className="relative w-full overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.34),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(215,199,173,0.16),transparent_28%),radial-gradient(circle_at_68%_82%,rgba(242,171,82,0.14),transparent_30%),rgba(13,9,8,0.94)] p-6 text-center shadow-2xl shadow-black/30 md:p-10">
            <div className="pointer-events-none absolute -left-16 top-12 h-52 w-52 rounded-full bg-[#b5482f]/22 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-[#d7c7ad]/14 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f2ab52]/12 blur-3xl" />

            <div className="relative mx-auto max-w-2xl">
              <div className="flex items-center justify-center gap-4">
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
                <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                  Ticket link
                </p>
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
              </div>

              <h1 className="mt-6 text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-7xl">
                Invalid ticket
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#f3eadb]/68 md:text-lg md:leading-8">
                This ticket link is missing its secure token or does not match
                an issued ticket.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/event-info"
                  className="inline-flex w-full items-center justify-center border border-[#f3eadb]/18 bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#050505] transition duration-300 hover:bg-white sm:w-auto"
                >
                  Event info
                </Link>
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center border border-[#f3eadb]/18 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8f0e3] transition duration-300 hover:border-[#f8f0e3]/40 hover:bg-[#f8f0e3]/8 sm:w-auto"
                >
                  Back home
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
