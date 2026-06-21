"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
import { requireEnv } from "@/lib/env";
import { sydneyDateTimeLocalToIso } from "@/lib/event-time";
import * as Sentry from "@sentry/nextjs";

export type AdminMutationState = {
  error?: string;
  success?: string;
};

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const requiredText = z.string().trim().min(1, "Required.");

const maxHeroImageSize = 12 * 1024 * 1024;
const heroImageWidth = 720;
const heroImageHeight = 1024;
const webpQuality = 90;
const acceptedHeroImageTypes = new Set(["image/jpeg", "image/png"]);

const eventStatusSchema = z.enum(["draft", "published", "archived"]);

const eventSchema = z
  .object({
    slug: requiredText.regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase words separated by hyphens.",
    ),
    name: requiredText,
    description: nullableText,
    venue: requiredText,
    venue_address: nullableText,
    starts_at: requiredText,
    ends_at: nullableText,
    hero_image_url: nullableText,
    ticket_colours: nullableText,
    is_free: z.boolean(),
    status: eventStatusSchema.optional(),
  })
  .superRefine((value, context) => {
    try {
      sydneyDateTimeLocalToIso(value.starts_at);
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["starts_at"],
        message:
          error instanceof Error
            ? error.message
            : "Use a Sydney local date/time.",
      });
    }

    try {
      if (value.ends_at) {
        sydneyDateTimeLocalToIso(value.ends_at);
      }
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["ends_at"],
        message:
          error instanceof Error
            ? error.message
            : "Use a Sydney local date/time.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    starts_at: sydneyDateTimeLocalToIso(value.starts_at),
    ends_at: value.ends_at ? sydneyDateTimeLocalToIso(value.ends_at) : null,
  }));

const ticketTypeSchema = z
  .object({
    name: requiredText,
    description: nullableText,
    stripe_price_id: nullableText,
    price_cents: z.coerce.number().int().min(0),
    currency: requiredText.transform((value) => value.toLowerCase()),
    capacity: z.coerce.number().int().min(0),
    sales_start_at: nullableText,
    sales_end_at: nullableText,
    sort_order: z.coerce.number().int(),
    active: z.boolean(),
  })
  .superRefine((value, context) => {
    try {
      if (value.sales_start_at) {
        sydneyDateTimeLocalToIso(value.sales_start_at);
      }
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["sales_start_at"],
        message:
          error instanceof Error
            ? error.message
            : "Use a Sydney local date/time.",
      });
    }

    try {
      if (value.sales_end_at) {
        sydneyDateTimeLocalToIso(value.sales_end_at);
      }
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["sales_end_at"],
        message:
          error instanceof Error
            ? error.message
            : "Use a Sydney local date/time.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    sales_start_at: value.sales_start_at
      ? sydneyDateTimeLocalToIso(value.sales_start_at)
      : null,
    sales_end_at: value.sales_end_at
      ? sydneyDateTimeLocalToIso(value.sales_end_at)
      : null,
  }));

const lineupArtistSchema = z.object({
  slot: z.coerce.number().int().min(0).max(5),
  name: nullableText,
  soundcloud_url: nullableText,
});

function formToEventInput(formData: FormData) {
  return eventSchema.parse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description"),
    venue: formData.get("venue"),
    venue_address: formData.get("venue_address"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    hero_image_url: formData.get("hero_image_url"),
    is_free: formData.get("is_free") === "on",
    status: formData.get("status") || undefined,
    ticket_colours: formData.get("ticket_colours"),
  });
}

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

async function uploadEventHeroImage(eventId: string, upload: File) {
  if (!acceptedHeroImageTypes.has(upload.type)) {
    throw new Error("Upload a JPG or PNG hero image.");
  }

  if (upload.size > maxHeroImageSize) {
    throw new Error("Keep source hero images under 12MB.");
  }

  const filename =
    filenameWithoutExtension(safeFilename(upload.name)) || eventId;
  const optimizedImage = await sharp(Buffer.from(await upload.arrayBuffer()))
    .rotate()
    .resize({
      width: heroImageWidth,
      height: heroImageHeight,
      fit: "cover",
      position: "center",
    })
    .webp({ quality: webpQuality })
    .toBuffer();

  const blob = await put(
    `events/${eventId}/hero/${Date.now()}-${filename}.webp`,
    optimizedImage,
    {
      access: "public",
      contentType: "image/webp",
      token: requireEnv("BLOB_READ_WRITE_TOKEN"),
    },
  );

  return blob.url;
}

function formToTicketTypeInput(formData: FormData) {
  return ticketTypeSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    stripe_price_id: formData.get("stripe_price_id"),
    price_cents: formData.get("price_cents"),
    currency: formData.get("currency"),
    capacity: formData.get("capacity"),
    sales_start_at: formData.get("sales_start_at"),
    sales_end_at: formData.get("sales_end_at"),
    sort_order: formData.get("sort_order"),
    active: formData.get("active") === "on",
  });
}

function formToLineupArtistInputs(formData: FormData) {
  return Array.from({ length: 6 }, (_, slot) =>
    lineupArtistSchema.parse({
      slot,
      name: formData.get(`name_${slot}`),
      soundcloud_url: formData.get(`soundcloud_url_${slot}`),
    }),
  );
}

function getActionError(
  error: unknown,
  {
    action,
    eventId,
    ticketTypeId,
  }: {
    action: string;
    eventId?: string;
    ticketTypeId?: string;
  },
) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid form input.";
  }

  Sentry.captureException(error, {
    tags: {
      "admin.action": action,
      "app.area": "admin",
      ...(eventId ? { "event.id": eventId } : {}),
      ...(ticketTypeId ? { "ticket_type.id": ticketTypeId } : {}),
    },
  });

  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createEventDraftAction(
  _state: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  await requireAdmin();
  let newEventId: string | null = null;

  try {
    const input = formToEventInput(formData);
    const { supabase } = await createSessionAuthClient();
    const { data, error } = await supabase
      .from("ticketing_events")
      .insert({
        ...input,
        is_current: false,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/admin/events");
    newEventId = data.id;
  } catch (error) {
    return {
      error: getActionError(error, { action: "event_create_draft" }),
    };
  }

  redirect(`/admin/events/${newEventId}`);
}

export async function updateEventAction(
  eventId: string,
  _state: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  await requireAdmin();

  try {
    const input = formToEventInput(formData);
    const heroImageUpload = formData.get("hero_image_file");
    const heroImageUrl = isUpload(heroImageUpload)
      ? await uploadEventHeroImage(eventId, heroImageUpload)
      : input.hero_image_url;
    const { supabase } = await createSessionAuthClient();
    const { error } = await supabase
      .from("ticketing_events")
      .update({
        ...input,
        hero_image_url: heroImageUrl,
        ...(input.status !== "published" ? { is_current: false } : {}),
      })
      .eq("id", eventId);

    if (error) {
      throw error;
    }

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/event-info");
    return { success: "Event updated." };
  } catch (error) {
    return {
      error: getActionError(error, { action: "event_update", eventId }),
    };
  }
}

export async function createTicketTypeAction(
  eventId: string,
  _state: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  await requireAdmin();

  try {
    const input = formToTicketTypeInput(formData);
    const { supabase } = await createSessionAuthClient();
    const { error } = await supabase
      .from("ticketing_ticket_types")
      .insert({ ...input, event_id: eventId });

    if (error) {
      throw error;
    }

    revalidatePath(`/admin/events/${eventId}`);
    return { success: "Ticket type created." };
  } catch (error) {
    return {
      error: getActionError(error, { action: "ticket_type_create", eventId }),
    };
  }
}

export async function updateTicketTypeAction(
  eventId: string,
  ticketTypeId: string,
  _state: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  await requireAdmin();

  try {
    const input = formToTicketTypeInput(formData);
    const { supabase } = await createSessionAuthClient();
    const { error } = await supabase
      .from("ticketing_ticket_types")
      .update(input)
      .eq("id", ticketTypeId)
      .eq("event_id", eventId);

    if (error) {
      throw error;
    }

    revalidatePath(`/admin/events/${eventId}`);
    return { success: "Ticket type updated." };
  } catch (error) {
    return {
      error: getActionError(error, {
        action: "ticket_type_update",
        eventId,
        ticketTypeId,
      }),
    };
  }
}

export async function updateLineupArtistsAction(
  eventId: string,
  _state: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  await requireAdmin();

  try {
    const input = formToLineupArtistInputs(formData);
    const firstEmptySlot = input.find((artist) => artist.name === null)?.slot;
    const filledAfterEmpty =
      firstEmptySlot !== undefined &&
      input.some((artist) => artist.slot > firstEmptySlot && artist.name);

    if (filledAfterEmpty) {
      return { error: "Fill lineup slots from 0 upward with no gaps." };
    }

    const artistWithUrlOnly = input.find(
      (artist) => !artist.name && artist.soundcloud_url,
    );

    if (artistWithUrlOnly) {
      return {
        error: `Slot ${artistWithUrlOnly.slot} needs a name or no URL.`,
      };
    }

    const artistsToUpsert = input
      .filter((artist) => artist.name)
      .map((artist) => ({
        event_id: eventId,
        slot: artist.slot,
        name: artist.name as string,
        soundcloud_url: artist.soundcloud_url,
      }));
    const slotsToDelete = input
      .filter((artist) => !artist.name)
      .map((artist) => artist.slot);

    const { supabase } = await createSessionAuthClient();

    if (artistsToUpsert.length > 0) {
      const { error } = await supabase
        .from("lineup_artists")
        .upsert(artistsToUpsert, { onConflict: "event_id,slot" });

      if (error) {
        throw error;
      }
    }

    if (slotsToDelete.length > 0) {
      const { error } = await supabase
        .from("lineup_artists")
        .delete()
        .eq("event_id", eventId)
        .in("slot", slotsToDelete);

      if (error) {
        throw error;
      }
    }

    revalidatePath("/event-info");
    revalidatePath(`/admin/events/${eventId}`);
    return { success: "Lineup artists updated." };
  } catch (error) {
    return {
      error: getActionError(error, {
        action: "lineup_artists_update",
        eventId,
      }),
    };
  }
}

export async function publishCurrentEventAction(formData: FormData) {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const { supabase } = await createSessionAuthClient();
  const { error } = await supabase.rpc("ticketing_publish_current_event", {
    p_event_id: eventId,
    p_archive_previous: true,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/event-info");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}`);
}
