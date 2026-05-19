import type { Metadata } from "next";
import Link from "next/link";
import { updateGalleryImageAction } from "@/lib/admin-gallery-actions";
import { AdminGalleryImageForm } from "@/components/AdminGalleryImageForm";
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
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 py-8 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f3eadb]/12 pb-6">
          <div>
            <Link
              href="/admin/events"
              className="text-xs uppercase tracking-[0.28em] text-[#d7c7ad] transition hover:text-[#f8f0e3]"
            >
              Back to events
            </Link>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-[-0.06em]">
              Gallery
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#f3eadb]/64">
              Upload homepage gallery images to Vercel Blob.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-[#f3eadb]/18 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f8f0e3] transition hover:bg-[#f3eadb]/10"
          >
            View site
          </Link>
        </header>

        <section className="grid gap-5">
          {gallerySlots.map((slot) => (
            <div
              key={slot}
              className="border border-[#f3eadb]/14 bg-[#080706] p-5 md:p-6"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.35em] text-[#d7c7ad]">
                    Slot {slot}
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">
                    Homepage gallery image
                  </h2>
                </div>
                <p className="text-sm text-[#f3eadb]/50">
                  {imagesBySlot.get(slot)?.is_active === false
                    ? "Hidden"
                    : "Visible"}
                </p>
              </div>

              <AdminGalleryImageForm
                action={updateGalleryImageAction}
                image={imagesBySlot.get(slot)}
                slot={slot}
              />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
