import Image from "next/image";

import { CheckoutPanel } from "@/components/CheckoutPanel";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCurrentEvent, getTicketCountsByType } from "@/lib/events";
import { formatEventDateRange } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const moreInfoItems = [
  "We acknowledge the true custodians of the land where this event takes place, the Gadigal people of the Eora nation. We pay respect to their Elders past, present, and emerging.",
  "Come Thru is built around respect, consent, and care for the people around you. We have a zero tolerance for negative behaviour, harassment, discrimination, or intimidation. Please be considerate of others at all times, and look out for one another.",
] as const;

export default async function TicketsPage() {
  const event = await getCurrentEvent();

  if (!event) {
    throw new Error("No current event found.");
  }

  const ticketTypes = event.ticketing_ticket_types ?? [];
  const soldCounts = await getTicketCountsByType(
    ticketTypes.map((ticket) => ticket.id),
  );
  const tickets = ticketTypes.map((ticket) => ({
    ...ticket,
    sold:
      soldCounts.get(ticket.id) ??
      ("sold" in ticket && typeof ticket.sold === "number" ? ticket.sold : 0),
  }));
  const eventImageUrl = event.hero_image_url?.trim();

  return (
    <main
      data-tickets-page
      className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 text-[#f8f0e3] transition-[padding-bottom] duration-300 ease-out sm:px-6"
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <section className="grid items-stretch gap-6 pt-8 md:pt-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 overflow-hidden border border-[#f3eadb]/14 bg-[#11100d] shadow-2xl shadow-black/40 lg:relative lg:order-1 lg:h-full">
            {eventImageUrl ? (
              <>
                <Image
                  src={eventImageUrl}
                  alt={event.name}
                  width={1200}
                  height={1500}
                  priority
                  unoptimized
                  className="h-auto w-full lg:hidden"
                />
                <Image
                  src={eventImageUrl}
                  alt={event.name}
                  fill
                  sizes="(min-width: 1024px) 54vw, 100vw"
                  priority
                  unoptimized
                  className="hidden object-cover saturate-[0.82] lg:block"
                />
              </>
            ) : (
              <div className="flex aspect-4/5 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(172,67,43,0.18),transparent_38%),#080706] p-8 text-center lg:h-full lg:aspect-auto">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                    Next event
                  </p>
                  <h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.04em]">
                    {event.name}
                  </h1>
                </div>
              </div>
            )}
          </div>

          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <CheckoutPanel
              eventId={event.id}
              isFree={event.is_free}
              tickets={tickets}
            />

            <div className="-order-1 relative overflow-hidden border-y border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.16),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(215,199,173,0.07),transparent_28%),radial-gradient(circle_at_68%_82%,rgba(242,171,82,0.06),transparent_30%),radial-gradient(circle_at_28%_76%,rgba(172,67,43,0.08),transparent_28%),rgba(8,7,6,0.9)] small-laptop:p-4.5 p-5 shadow-2xl shadow-black/30 md:p-8 lg:order-0 lg:border">
              <div className="pointer-events-none absolute -left-16 top-16 h-52 w-52 rounded-full bg-[#b5482f]/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-12 top-12 h-44 w-44 rounded-full bg-[#d7c7ad]/7 blur-3xl" />
              <div className="pointer-events-none absolute right-20 bottom-8 h-48 w-48 rounded-full bg-[#f2ab52]/6 blur-3xl" />
              <div className="pointer-events-none absolute left-20 bottom-12 h-40 w-40 rounded-full bg-[#b5482f]/7 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                    Event details
                  </p>
                </div>
                <h1 className="mt-6 max-w-3xl text-[clamp(2.6rem,13vw,4.5rem)] font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-6xl small-laptop:text-5xl lg:text-7xl">
                  {event.name}
                </h1>
                {event.description ? (
                  <p className="mt-6 max-w-2xl text-base leading-7 text-[#f3eadb]/68 md:leading-8 small-laptop:leading-7">
                    {event.description}
                  </p>
                ) : null}
                <div className="mt-8 grid gap-4 border-t border-[#f3eadb]/12 pt-5 text-sm text-[#f3eadb]/68 sm:grid-cols-2">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58">
                      When
                    </p>
                    <p className="mt-2 font-medium text-[#f8f0e3]">
                      {formatEventDateRange(event.starts_at, event.ends_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58">
                      Where
                    </p>
                    <p className="mt-2 font-medium text-[#f8f0e3]">
                      {event.venue}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-2 md:pb-4">
          <div className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_16%_22%,rgba(172,67,43,0.14),transparent_34%),radial-gradient(circle_at_84%_72%,rgba(215,199,173,0.07),transparent_30%),rgba(8,7,6,0.9)] small-laptop:p-4.5 p-5 shadow-2xl shadow-black/30 md:p-8">
            <div className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-[#b5482f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-14 bottom-4 h-44 w-44 rounded-full bg-[#d7c7ad]/7 blur-3xl" />
            <p className="relative text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              More info
            </p>
            <div className="relative mt-6 grid gap-5 text-base leading-7 text-[#f3eadb]/72 md:text-base md:leading-8 small-laptop:leading-7">
              {moreInfoItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
