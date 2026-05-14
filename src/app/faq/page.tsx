import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { faqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ | Come Thru",
  description: "Common ticketing and event questions for Come Thru.",
};

export default function FaqPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <section className="py-8 md:py-12">
          <div className="grid gap-8 md:grid-cols-[0.78fr_1.22fr] md:items-end">
            <div>
              <div className="flex items-center gap-4">
                <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                  FAQ
                </p>
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] md:text-7xl">
                Before you come through
              </h1>
            </div>
          </div>

          <div className="mt-10 grid border-t border-[#f3eadb]/12 md:grid-cols-2">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="border-b border-[#f3eadb]/12 py-6 md:px-6 md:odd:border-r"
              >
                <h2 className="text-lg font-semibold text-[#f8f0e3]">
                  {item.question}
                </h2>
                <p className="mt-3 text-base leading-7 text-[#f3eadb]/58">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
