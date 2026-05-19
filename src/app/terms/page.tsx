import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Terms & Conditions | Come Thru",
  description: "Ticket purchase and event entry terms for Come Thru events.",
};

const sections = [
  {
    title: "1. About These Terms",
    body: [
      "These Terms & Conditions apply when you use this website, buy tickets through this website, or attend a Come Thru event.",
      "By purchasing a ticket, you agree to these terms. If you buy tickets for someone else, you are responsible for making sure they understand and comply with these terms too.",
    ],
  },
  {
    title: "2. Event Information",
    body: [
      "We run dance music events in Sydney/Eora. Event details, including date, time, venue, lineup, ticket types, pricing, and age restrictions, are shown on the relevant event page.",
      "We may update event information where reasonably necessary. If a material change is made, we will take reasonable steps to notify ticket holders using the email address provided at checkout.",
    ],
  },
  {
    title: "3. Tickets",
    body: [
      "Tickets are issued electronically to the email address provided at checkout. You are responsible for entering the correct email address and keeping your ticket secure.",
      "Each ticket contains a unique code or QR code. A ticket may only be scanned once. If a ticket is copied, shared, or forwarded, the first valid scan may be accepted and later scans may be refused.",
      "Unless stated otherwise for a specific event, tickets are general admission and do not guarantee a particular viewing area, seat, set time, or artist appearance.",
    ],
  },
  {
    title: "4. Payment",
    body: [
      "Payments are processed securely through Stripe. We do not store your full card details on our servers.",
      "Ticket prices are shown in Australian dollars unless stated otherwise. Any booking fees, card fees, or taxes displayed at checkout form part of the final purchase price.",
    ],
  },
  {
    title: "5. Refunds",
    body: [
      "Refunds are only available where the event has been cancelled, the event has been rescheduled, or where a refund is required by Australian Consumer Law.",
      "Refunds will not be granted for incorrect purchases, change of mind, or a change in your personal circumstances that prevents you from attending the event.",
      "If an event is cancelled or rescheduled, we will provide instructions to affected ticket holders using the email address provided at checkout.",
      "Nothing in these terms limits any rights you may have under Australian Consumer Law.",
    ],
  },
  {
    title: "6. Transfers and Resale",
    body: [
      "You may give your ticket to another person unless the event page states that tickets are non-transferable.",
    ],
  },
  {
    title: "7. Entry and Conduct",
    body: [
      "Entry is subject to the venue rules, security checks, licensing requirements, and any event-specific conditions. You may need to show valid photo identification, especially where an event is advertised as 18+.",
      "We and the venue may refuse entry or remove a person from an event where reasonably necessary, including for intoxication, unsafe behaviour, harassment, disorderly conduct, failure to follow staff directions, or breach of these terms.",
      "No refund will be provided if you are refused entry or removed because of your conduct or because you fail to meet an advertised entry requirement.",
    ],
  },
  {
    title: "8. Lineups, Venues, and Production",
    body: [
      "Artists, set times, venues, production elements, and event programming may change where reasonably necessary. A change to lineup, set time, or production does not automatically entitle you to a refund unless required by Australian Consumer Law.",
      "We may photograph, film, or record parts of an event for promotional purposes. If you have a concern about being filmed or photographed, please speak to event staff at the venue.",
    ],
  },
  {
    title: "9. Liability",
    body: [
      "To the maximum extent permitted by law, we are not responsible for loss, damage, cost, or expense caused by matters outside our reasonable control, including venue issues, power outages, severe weather, public health directions, transport disruption, or third-party service failures.",
      "Nothing in these terms excludes, restricts, or modifies any consumer guarantee, right, or remedy that cannot be excluded under Australian Consumer Law.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "For ticketing, refund, or event questions, contact us at support@comethru.com.au or through our official Come Thru event channels.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <article className="py-8 md:py-12">
          <div className="grid gap-8 md:grid-cols-[0.78fr_1.22fr] md:items-end">
            <div>
              <div className="flex items-center gap-4">
                <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                  Legal
                </p>
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] md:text-7xl">
                Terms & Conditions
              </h1>
            </div>
          </div>

          <div className="mt-10 border-t border-[#f3eadb]/12">
            {sections.map((section) => (
              <section
                key={section.title}
                className="grid gap-4 border-b border-[#f3eadb]/12 py-7 md:grid-cols-[0.36fr_0.64fr] md:gap-8"
              >
                <h2 className="text-lg font-semibold leading-tight text-[#f8f0e3] md:text-xl">
                  {section.title}
                </h2>
                <div className="space-y-3 text-sm leading-7 text-[#f3eadb]/62 md:text-base md:leading-8">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <Footer />
      </div>
    </main>
  );
}
