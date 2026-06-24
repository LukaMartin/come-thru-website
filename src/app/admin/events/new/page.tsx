import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import { AdminEventForm } from "@/components/AdminEventForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminShell } from "@/components/admin/AdminShell";
import { createEventDraftAction } from "@/lib/admin-events-actions";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "New Admin Event | Come Thru",
};

export default async function NewAdminEventPage() {
  await requireAdmin();

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Ticketing"
        title="New event"
        description="Create a draft event first. Add ticket types and publish it as current only when the event is ready to sell."
        actions={
          <Link
            href="/admin/events"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-4 py-2.5 text-sm font-medium text-admin-muted transition hover:border-admin-border-strong hover:bg-admin-surface-elevated hover:text-admin-text"
          >
            <FiArrowLeft aria-hidden className="size-4" />
            Back to events
          </Link>
        }
      />

      <section className="rounded-2xl border border-admin-border bg-admin-surface p-5 shadow-sm shadow-black/20">
        <AdminEventForm action={createEventDraftAction} mode="create" />
      </section>
    </AdminShell>
  );
}
