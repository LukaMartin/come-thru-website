"use client";

import Image from "next/image";
import { useActionState } from "react";
import type {
  AdminGalleryMutationState,
  updateGalleryImageAction,
} from "@/lib/admin-gallery-actions";
import type { Database } from "@/lib/database.types";

type GalleryImageRow =
  Database["public"]["Tables"]["site_gallery_images"]["Row"];

type AdminGalleryImageFormProps = {
  action: typeof updateGalleryImageAction;
  image?: GalleryImageRow;
  slot: number;
};

const initialState: AdminGalleryMutationState = {};
const inputClass =
  "border border-[#f3eadb]/14 bg-black/35 px-4 py-3 text-sm text-[#f8f0e3] outline-none transition focus:border-[#d7c7ad]/70";
const labelClass = "grid gap-2 text-sm text-[#f3eadb]/72";

export function AdminGalleryImageForm({
  action,
  image,
  slot,
}: AdminGalleryImageFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const previewUrl = image?.image_url.trim();

  return (
    <form action={formAction} className="grid gap-5 md:grid-cols-[16rem_1fr]">
      <input type="hidden" name="slot" value={slot} />

      <div className="overflow-hidden border border-[#f3eadb]/12 bg-[#11100d]">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={image?.alt ?? `Gallery slot ${slot}`}
            width={512}
            height={384}
            unoptimized
            className="aspect-4/3 h-full min-h-48 w-full object-cover opacity-90"
          />
        ) : (
          <div className="flex aspect-4/3 min-h-48 items-center justify-center p-5 text-center text-sm text-[#f3eadb]/50">
            No image yet.
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Upload new image
            <input
              name="image_file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Current image URL
            <input
              name="image_url"
              defaultValue={image?.image_url ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <label className={labelClass}>
          Alt text
          <input
            name="alt"
            required
            defaultValue={image?.alt ?? ""}
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-3 text-sm text-[#f3eadb]/72">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={image?.is_active ?? true}
            className="size-4 accent-[#f8f0e3]"
          />
          Show this slot on the homepage
        </label>

        {!isPending && state.error ? (
          <p className="text-sm text-red-300">{state.error}</p>
        ) : null}
        {!isPending && state.success ? (
          <p className="text-sm text-emerald-300">{state.success}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save image"}
        </button>
      </div>
    </form>
  );
}
