import type { Metadata } from "next";
import Link from "next/link";

import { createEventDraftAction } from "@/lib/admin-events-actions";
import { AdminEventForm } from "@/components/AdminEventForm";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "New Admin Event | Come Thru",
};

export default async function NewAdminEventPage() {
  await requireAdmin();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 py-8 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-5xl gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f3eadb]/12 pb-6">
          <div>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-[-0.06em]">
              New event
            </h1>
            <p className="mt-4 max-w-[55%] text-sm leading-6 text-[#f3eadb]/64">
              New events are created as drafts. Add ticket types and publish it
              as current only when the event is ready to sell.
            </p>
          </div>
          <Link
            href="/admin/events"
            className="group relative flex w-fit items-center gap-1.5 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7c7ad] transition-colors duration-300 hover:text-[#f8f0e3] after:absolute after:bottom-0 after:right-0 after:h-px after:w-[calc(100%-1.25rem)] after:bg-current after:transition-all after:duration-400 after:ease-out hover:after:w-full"
          >
            <span className="hover:-mr-5 opacity-0 transition-all duration-300 ease-out group-hover:mr-0 group-hover:opacity-100">
              &larr;
            </span>
            <span>Back to events</span>
          </Link>
        </header>

        <section className="border border-[#f3eadb]/14 bg-[#080706] p-5 md:p-6">
          <AdminEventForm action={createEventDraftAction} mode="create" />
        </section>
      </div>
    </main>
  );
}
