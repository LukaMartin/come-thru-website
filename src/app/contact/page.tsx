import type { Metadata } from "next";

import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Contact | Come Thru",
  description: "Contact Come Thru for event, booking, and ticket enquiries.",
};

export default function ContactPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <section className="grid gap-8 py-8 md:py-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 small-laptop:gap-10">
          <div className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_20%_20%,rgba(172,67,43,0.38),transparent_36%),radial-gradient(circle_at_78%_76%,rgba(215,199,173,0.22),transparent_32%),radial-gradient(circle_at_48%_58%,rgba(242,171,82,0.16),transparent_34%),#0d0908] p-6 md:p-8">
            <div className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#b5482f]/30 blur-3xl" />
            <div className="pointer-events-none absolute bottom-10 right-10 h-48 w-48 rounded-full bg-[#d7c7ad]/20 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 bottom-1/4 h-40 w-40 rounded-full bg-[#f2ab52]/16 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                  Contact
                </p>
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
              </div>
              <h1 className="mt-6 text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] md:text-7xl small-laptop:text-6xl">
                Send us a message
              </h1>
              <p className="mt-8 max-w-sm text-base leading-7 text-[#f3eadb]/68">
                Event enquiry, collab idea, ticket question, or something else.
                It will land with the Come Thru team.
              </p>
            </div>
          </div>

          <div className="border border-[#f3eadb]/14 bg-[#080706]/82 p-5 shadow-2xl shadow-black/30 md:p-8">
            <p className="mb-6 text-[0.68rem] uppercase tracking-[0.38em] text-[#d7c7ad]/72">
              Enquiry form
            </p>
            <ContactForm />
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
