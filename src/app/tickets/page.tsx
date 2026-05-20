import Image from "next/image";
import { FaSoundcloud } from "react-icons/fa";

import { CheckoutPanel } from "@/components/CheckoutPanel";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCurrentEvent, getTicketCountsByType } from "@/lib/events";
import { formatEventDateRange } from "@/lib/tickets";

export const dynamic = "force-dynamic";

type TicketsPageProps = {
  searchParams?: Promise<{
    view?: string | string[];
  }>;
};

const moreInfoItems = [
  "We acknowledge the true custodians of the land where this event takes place, the Gadigal people of the Eora nation. We pay respect to their Elders past, present, and emerging.",
  "Come Thru is built around respect, consent, and care for the people around you. We have a zero tolerance for negative behaviour, harassment, discrimination, or intimidation. Please be considerate of others at all times, and look out for one another.",
] as const;

const lineupArtists = [
  {
    name: "Come Thru",
    soundcloudUrl: "https://on.soundcloud.com/SPwPfXPEVyZyq3zWuC",
  },
  { name: "ROOF", soundcloudUrl: null },
  {
    name: "Penny",
    soundcloudUrl: "https://on.soundcloud.com/RlRbhj1YFU3Yeq7KYH",
  },
  { name: "Garydose", soundcloudUrl: null },
  { name: "Westconnex", soundcloudUrl: null },
  {
    name: "Luka Brasi",
    soundcloudUrl: "https://on.soundcloud.com/honV7FH0u4JclC5W2S",
  },
] as const;

function getSoundCloudUrl(artist: (typeof lineupArtists)[number]) {
  return (
    artist.soundcloudUrl ??
    `https://soundcloud.com/search?q=${encodeURIComponent(artist.name)}`
  );
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewParam = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams?.view;
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
      className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 text-[#f8f0e3] transition-[padding-bottom] duration-300 ease-out sm:px-6"
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <section className="grid items-start gap-6 pt-8 small-laptop:gap-5 md:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-stretch">
          <div className="order-2 overflow-hidden border border-[#f3eadb]/14 bg-[#11100d] shadow-2xl shadow-black/40 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:h-full lg:bg-[#080706]">
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
                  width={1200}
                  height={1500}
                  priority
                  unoptimized
                  className="hidden h-full w-full object-cover saturate-[0.82] lg:block"
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

          <div className="contents lg:col-start-2 lg:row-start-1 lg:block">
            <CheckoutPanel
              eventId={event.id}
              initialDrawerOpen={viewParam === "tickets"}
              isFree={event.is_free}
              tickets={tickets}
            />
          </div>

          <div className="order-1 relative overflow-hidden border-y border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.32),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(215,199,173,0.14),transparent_28%),radial-gradient(circle_at_68%_82%,rgba(242,171,82,0.14),transparent_30%),radial-gradient(circle_at_28%_76%,rgba(172,67,43,0.18),transparent_28%),rgba(13,9,8,0.94)] p-5 shadow-2xl shadow-black/30 md:p-6 lg:col-start-2 lg:row-start-2 lg:border small-laptop:p-4.5">
            <div className="pointer-events-none absolute -left-16 top-16 h-52 w-52 rounded-full bg-[#b5482f]/22 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 top-12 h-44 w-44 rounded-full bg-[#d7c7ad]/14 blur-3xl" />
            <div className="pointer-events-none absolute right-20 bottom-8 h-48 w-48 rounded-full bg-[#f2ab52]/14 blur-3xl" />
            <div className="pointer-events-none absolute left-20 bottom-12 h-40 w-40 rounded-full bg-[#b5482f]/16 blur-3xl" />
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

          <div className="order-3 relative overflow-hidden border border-[#f3eadb]/14 bg-[linear-gradient(180deg,rgba(255,119,0,0.06),transparent_46%),rgba(8,7,6,0.96)] p-5 shadow-2xl shadow-black/30 small-laptop:p-4.5 md:p-6 lg:col-start-2 lg:row-start-3">
            <div className="pointer-events-none absolute right-8 top-0 h-px w-28 bg-linear-to-r from-transparent via-[#ff7700]/32 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-8 h-px w-28 bg-linear-to-r from-transparent via-[#ff7700]/35 to-transparent" />
            <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-[#ff7700]/7 blur-2xl" />

            <div className="relative flex items-center justify-between gap-5 border-b border-[#f3eadb]/10 pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                Listen
              </p>
              <FaSoundcloud
                aria-label="SoundCloud"
                className="text-[#ff7700] text-3xl md:text-4xl"
              />
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              {lineupArtists.map((artist) => (
                <a
                  key={artist.name}
                  href={getSoundCloudUrl(artist)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-sm border border-[#f3eadb]/11 bg-[#f3eadb]/3.5 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#f8f0e3]/72 shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition duration-300 ease-out hover:border-[#f3eadb]/24 hover:bg-[#f3eadb]/8 hover:text-[#f8f0e3] hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)] active:border-[#f3eadb]/30 md:text-[0.68rem]"
                >
                  {artist.name}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-2 md:pb-4">
          <div className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_16%_22%,rgba(172,67,43,0.28),transparent_34%),radial-gradient(circle_at_84%_72%,rgba(215,199,173,0.14),transparent_30%),rgba(13,9,8,0.94)] p-5 shadow-2xl shadow-black/30 md:p-8 small-laptop:p-4.5">
            <div className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-[#b5482f]/22 blur-3xl" />
            <div className="pointer-events-none absolute -right-14 bottom-4 h-44 w-44 rounded-full bg-[#d7c7ad]/14 blur-3xl" />
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
