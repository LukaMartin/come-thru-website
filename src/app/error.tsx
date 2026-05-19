"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        "app.area": "client",
        "error.boundary": "app",
        ...(error.digest ? { "error.digest": error.digest } : {}),
      },
    });
  }, [error]);

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
                  Something snapped
                </p>
                <span className="h-px w-10 bg-[#d7c7ad]/35" />
              </div>

              <h1 className="mt-6 text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-7xl">
                Try again
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#f3eadb]/68 md:text-lg md:leading-8">
                The page hit a temporary issue. Please give it another go, or
                head back to the homepage.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex w-full items-center justify-center border border-[#f3eadb]/18 bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#050505] transition duration-300 hover:bg-white sm:w-auto"
                >
                  Try again
                </button>
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
