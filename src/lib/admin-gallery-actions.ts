"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import { requireEnv } from "@/lib/env";

export type AdminGalleryMutationState = {
  error?: string;
  success?: string;
};

const maxSourceImageSize = 12 * 1024 * 1024;
const webpQuality = 90;
const acceptedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const galleryImageSchema = z.object({
  slot: z.coerce.number().int().min(1).max(4),
  image_url: z.string().trim(),
  alt: z.string().trim().min(1, "Alt text is required."),
  is_active: z.boolean(),
});

function isUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function safeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "");
}

function getSlotImageWidth(slot: number) {
  return slot === 1 ? 2000 : 1400;
}

function getGalleryActionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid gallery input.";
  }

  Sentry.captureException(error, {
    tags: {
      "admin.action": "gallery_update",
      "app.area": "admin",
    },
  });

  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function updateGalleryImageAction(
  _state: AdminGalleryMutationState,
  formData: FormData,
): Promise<AdminGalleryMutationState> {
  await requireAdmin();

  try {
    const input = galleryImageSchema.parse({
      slot: formData.get("slot"),
      image_url: formData.get("image_url"),
      alt: formData.get("alt"),
      is_active: formData.get("is_active") === "on",
    });

    let imageUrl = input.image_url;
    const upload = formData.get("image_file");

    if (isUpload(upload)) {
      if (!acceptedImageTypes.has(upload.type)) {
        return { error: "Upload a JPG, PNG, WebP, or GIF image." };
      }

      if (upload.size > maxSourceImageSize) {
        return { error: "Keep source gallery images under 12MB." };
      }

      const filename =
        filenameWithoutExtension(safeFilename(upload.name)) ||
        `slot-${input.slot}`;
      const optimizedImage = await sharp(
        Buffer.from(await upload.arrayBuffer()),
      )
        .rotate()
        .resize({
          width: getSlotImageWidth(input.slot),
          withoutEnlargement: true,
        })
        .webp({ quality: webpQuality })
        .toBuffer();

      const blob = await put(
        `gallery/slot-${input.slot}/${Date.now()}-${filename}.webp`,
        optimizedImage,
        {
          access: "public",
          contentType: "image/webp",
          token: requireEnv("BLOB_READ_WRITE_TOKEN"),
        },
      );

      imageUrl = blob.url;
    }

    if (!imageUrl) {
      return { error: "Upload an image or provide an image URL." };
    }

    const { supabase } = await createSessionAuthClient();
    const { error } = await supabase.from("site_gallery_images").upsert(
      {
        slot: input.slot,
        image_url: imageUrl,
        alt: input.alt,
        is_active: input.is_active,
      },
      { onConflict: "slot" },
    );

    if (error) {
      throw error;
    }

    revalidatePath("/");
    revalidatePath("/admin/gallery");

    return {
      success: `Gallery slot ${input.slot} updated.`,
    };
  } catch (error) {
    return {
      error: getGalleryActionError(error),
    };
  }
}
