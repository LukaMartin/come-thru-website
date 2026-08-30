import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { privacySections } from "@/lib/privacy";
import { twMerge } from "tailwind-merge";

export const metadata: Metadata = {
  title: "Privacy Policy | Come Thru",
  description:
    "How Come Thru handles personal information for event ticketing.",
};

export default function PrivacyPage() {
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
                Privacy Policy
              </h1>
            </div>
          </div>

          <div className="mt-10 border-t border-[#f3eadb]/12">
            {privacySections.map((section, index) => (
              <section
                key={section.title}
                className={twMerge(
                  "grid gap-4 border-b border-[#f3eadb]/12 py-7 md:grid-cols-[0.36fr_0.64fr] md:gap-8",
                  index === privacySections.length - 1 && "border-b-0",
                )}
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
