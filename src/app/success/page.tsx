import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function SuccessPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <section className="flex flex-1 items-center py-8 md:py-12">
          <div className="relative w-full overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.16),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(215,199,173,0.07),transparent_28%),radial-gradient(circle_at_68%_82%,rgba(242,171,82,0.06),transparent_30%),rgba(8,7,6,0.9)] p-6 text-center shadow-2xl shadow-black/30 md:p-10">
            <div className="pointer-events-none absolute -left-16 top-12 h-52 w-52 rounded-full bg-[#b5482f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-[#d7c7ad]/7 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <div className="flex items-center justify-center gap-4">
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
                <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                  Payment received
                </p>
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
              </div>
              <h1 className="mt-6 text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-7xl">
                Thank you
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#f3eadb]/68 md:text-lg md:leading-8">
                Your order is confirmed. You will receive an email with your
                tickets shortly, please be sure to check your spam.
              </p>
              <Link
                href="/tickets"
                className="mt-8 inline-flex items-center justify-center border border-[#f3eadb]/18 bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#050505] transition duration-300 hover:bg-white"
              >
                Back to event
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
