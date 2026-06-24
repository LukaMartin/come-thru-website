"use client";

import Image from "next/image";
import { useActionState } from "react";
import type {
  AdminGalleryMutationState,
  updateGalleryImageAction,
} from "@/lib/admin-gallery-actions";
import type { Database } from "@/lib/database.types";
import { useActionToast } from "@/hooks/use-action-toast";

type GalleryImageRow =
  Database["public"]["Tables"]["site_gallery_images"]["Row"];

type AdminGalleryImageFormProps = {
  action: typeof updateGalleryImageAction;
  image?: GalleryImageRow;
  slot: number;
};

const initialState: AdminGalleryMutationState = {};
const inputClass =
  "rounded-xl border border-admin-border bg-black/20 px-4 py-3 text-sm text-admin-text outline-none transition placeholder:text-admin-subtle focus:border-admin-border-strong focus:bg-black/30 file:mr-4 file:rounded-lg file:border-0 file:bg-admin-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-admin-primary-text";
const labelClass = "grid gap-2 text-sm font-medium text-admin-muted";

export function AdminGalleryImageForm({
  action,
  image,
  slot,
}: AdminGalleryImageFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const previewUrl = image?.image_url.trim();

  useActionToast(state, isPending);

  return (
    <form action={formAction} className="grid grid-cols-[18rem_minmax(0,1fr)] gap-5">
      <input type="hidden" name="slot" value={slot} />

      <div className="overflow-hidden rounded-2xl border border-admin-border bg-black/20">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={image?.alt ?? `Gallery slot ${slot}`}
            width={512}
            height={384}
            unoptimized
            className="aspect-4/3 h-full min-h-44 w-full object-cover"
          />
        ) : (
          <div className="flex aspect-4/3 min-h-44 items-center justify-center p-5 text-center text-sm text-admin-muted">
            No image yet.
          </div>
        )}
      </div>

      <div className="grid content-start gap-4">
        <div className="grid grid-cols-2 gap-4">
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

        <label className="flex items-center gap-3 text-sm font-medium text-admin-muted">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={image?.is_active ?? true}
            className="size-4 accent-admin-primary"
          />
          Show this slot on the homepage
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-xl bg-admin-primary px-5 py-2.5 text-sm font-medium text-admin-primary-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save image"}
        </button>
      </div>
    </form>
  );
}
