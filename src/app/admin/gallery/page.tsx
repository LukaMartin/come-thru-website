import type { Metadata } from "next";
import { updateGalleryImageAction } from "@/lib/admin-gallery-actions";
import { AdminGalleryImageForm } from "@/components/AdminGalleryImageForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminShell } from "@/components/admin/AdminShell";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";

type GalleryImageRow =
  Database["public"]["Tables"]["site_gallery_images"]["Row"];

const gallerySlots = [1, 2, 3, 4] as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Gallery | Come Thru",
};

export default async function AdminGalleryPage() {
  await requireAdmin();

  const { supabase } = await createSessionAuthClient();
  const { data, error } = await supabase
    .from("site_gallery_images")
    .select("*")
    .order("slot", { ascending: true });

  if (error) {
    throw error;
  }

  const imagesBySlot = new Map(
    ((data ?? []) as GalleryImageRow[]).map((image) => [image.slot, image]),
  );

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Gallery"
        description="Manage the four homepage gallery slots. Uploads are optimized and stored in Vercel Blob."
      />

      <section className="grid gap-4">
        {gallerySlots.map((slot) => {
          const image = imagesBySlot.get(slot);
          const isVisible = image?.is_active !== false;

          return (
            <div
              key={slot}
              className="rounded-2xl border border-admin-border bg-admin-surface p-4 shadow-sm shadow-black/20"
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-admin-border pb-3">
                <div>
                  <p className="text-xs font-medium text-admin-subtle">
                    Slot {slot}
                  </p>
                  <h2 className="mt-1 text-base font-semibold tracking-[-0.03em] text-admin-text">
                    Homepage gallery image
                  </h2>
                </div>
                <span
                  className={[
                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                    isVisible
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                      : "border-zinc-500/25 bg-zinc-500/10 text-zinc-300",
                  ].join(" ")}
                >
                  {isVisible ? "Visible" : "Hidden"}
                </span>
              </div>

              <AdminGalleryImageForm
                action={updateGalleryImageAction}
                image={image}
                slot={slot}
              />
            </div>
          );
        })}
      </section>
    </AdminShell>
  );
}
