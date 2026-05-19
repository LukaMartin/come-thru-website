import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaSoundcloud } from "react-icons/fa";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCurrentEvent } from "@/lib/events";
import { socialLinks } from "@/lib/site";
import { formatEventDateRange } from "@/lib/tickets";
import { getGalleryImages } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Come Thru | Sydney/Eora Dance Music Events",
  description:
    "Come Thru runs dance music events in Sydney/Eora. Find the next event, buy tickets, and get in touch.",
};

export const dynamic = "force-dynamic";

const eyebrowClass =
  "text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]";
const bodyCopyClass =
  "text-base leading-7 text-[#f3eadb]/78 md:text-lg md:leading-8";
const metaLabelClass =
  "text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58";
const metaValueClass = "mt-2 text-base font-medium text-[#f8f0e3]";

export default async function Home() {
  const [event, galleryImages] = await Promise.all([
    getCurrentEvent(),
    getGalleryImages(),
  ]);

  if (!event) {
    throw new Error("No current event found.");
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <section className="grid items-stretch gap-6 pt-8 md:pt-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative flex min-h-136 flex-col justify-between overflow-hidden border-y border-[#f3eadb]/16 bg-[radial-gradient(circle_at_18%_24%,rgba(172,67,43,0.28),transparent_36%),radial-gradient(circle_at_78%_76%,rgba(215,199,173,0.16),transparent_32%),radial-gradient(circle_at_54%_56%,rgba(242,171,82,0.08),transparent_34%)] px-5 py-8 md:min-h-168 md:px-6 md:py-10 lg:border-l lg:px-8">
            <div className="pointer-events-none absolute -left-16 top-28 h-64 w-64 rounded-full bg-[#b5482f]/22 blur-3xl" />
            <div className="pointer-events-none absolute bottom-8 right-8 h-52 w-52 rounded-full bg-[#d7c7ad]/14 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 bottom-1/4 h-48 w-48 rounded-full bg-[#f2ab52]/8 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] uppercase tracking-[0.34em] text-[#d7c7ad]/70">
                <span>Sydney/Eora</span>
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
              </div>

              <h1 className="mt-8 max-w-4xl text-[clamp(5rem,15.5vw,8.75rem)] small-laptop:text-[clamp(3.15rem,14vw,7.5rem)] font-black uppercase leading-[0.78] tracking-[-0.08em] text-[#f8f0e3]">
                Dance
                <br />
                With
                <br />
                Us
              </h1>
            </div>

            <div className="relative mt-10 grid gap-8 md:grid-cols-2 md:items-end">
              <p className={`max-w-sm ${bodyCopyClass}`}>
                Come Thru brings people together around music, we promote safe
                spaces for people to create memories on the dancefloor.
              </p>

              <div className="flex gap-4 border-t border-[#f3eadb]/12 pt-5 md:justify-self-end md:px-1">
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 text-sm font-medium text-[#f3eadb]/68 transition duration-300 hover:text-[#f8f0e3]"
                >
                  <FaInstagram
                    aria-hidden="true"
                    className="text-lg transition duration-300 group-hover:text-[#d88ca8]"
                  />
                  Instagram
                </a>
                <a
                  href={socialLinks.soundcloud}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 text-sm font-medium text-[#f3eadb]/68 transition duration-300 hover:text-[#f8f0e3]"
                >
                  <FaSoundcloud
                    aria-hidden="true"
                    className="text-xl transition duration-300 group-hover:text-[#ff7700]"
                  />
                  SoundCloud
                </a>
              </div>
            </div>
          </div>

          <aside className="relative min-h-136 overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_78%_16%,rgba(214,97,139,0.24),transparent_32%),radial-gradient(circle_at_16%_84%,rgba(218,82,42,0.34),transparent_38%),radial-gradient(circle_at_52%_56%,rgba(242,171,82,0.16),transparent_36%),#080706] p-5 shadow-2xl shadow-black/40 md:min-h-168 md:p-6">
            <div className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-[#d6618b]/18 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 bottom-8 h-72 w-72 rounded-full bg-[#da522a]/24 blur-3xl" />
            <div className="pointer-events-none absolute right-4 bottom-20 h-56 w-56 rounded-full bg-[#f2ab52]/12 blur-3xl" />
            <div className="pointer-events-none absolute -left-28 top-34 h-44 w-[145%] -rotate-12 bg-[linear-gradient(90deg,transparent,rgba(242,171,82,0.22),rgba(218,82,42,0.24),rgba(214,97,139,0.18),transparent)] blur-xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0_1px,transparent_1px_18px),radial-gradient(circle_at_48%_58%,rgba(5,5,5,0.34),transparent_46%),linear-gradient(180deg,rgba(5,5,5,0.06),rgba(5,5,5,0.46))]" />
            <div className="relative z-10 flex h-full min-h-124 flex-col justify-between border border-[#f3eadb]/18 p-5 md:min-h-156 md:p-7">
              <div className="flex items-start justify-between gap-5">
                <p className={eyebrowClass}>Next event</p>
              </div>

              <div>
                <h2 className="max-w-sm text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] text-[#f8f0e3] md:text-6xl">
                  {event.name}
                </h2>

                <div className="mt-8 grid gap-4 border-y border-[#f3eadb]/16 py-5 sm:grid-cols-2">
                  <div>
                    <p className={metaLabelClass}>When</p>
                    <p className={metaValueClass}>
                      {formatEventDateRange(event.starts_at, event.ends_at)}
                    </p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>Where</p>
                    <p className={metaValueClass}>{event.venue}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href="/tickets"
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white sm:w-fit"
                  >
                    {event.is_free ? "View event" : "Get tickets"}
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="py-8 md:py-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className={eyebrowClass}>Gallery</p>
            <span className="h-px flex-1 bg-[#f3eadb]/12" />
          </div>

          <div className="grid gap-2 md:grid-cols-4 md:gap-3">
            {galleryImages.map((image, index) => (
              <div
                key={image.src}
                className={`group relative min-h-60 overflow-hidden border border-[#f3eadb]/12 bg-[#11100d] ${image.className}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  loading={index === 0 ? "eager" : "lazy"}
                  sizes="(min-width: 1024px) 550px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover opacity-80 saturate-[0.78] transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100 group-hover:saturate-100"
                  unoptimized
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.02),rgba(5,5,5,0.24))]" />
              </div>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
