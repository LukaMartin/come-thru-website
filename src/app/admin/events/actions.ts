"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionAuthClient, requireAdmin } from "@/lib/admin-auth";
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
    is_free: z.boolean(),
    status: eventStatusSchema.optional(),
  })
  .superRefine((value, context) => {
    if (Number.isNaN(Date.parse(value.starts_at))) {
      context.addIssue({
        code: "custom",
        path: ["starts_at"],
        message: "Use an ISO date/time with timezone.",
      });
    }

    if (value.ends_at && Number.isNaN(Date.parse(value.ends_at))) {
      context.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "Use an ISO date/time with timezone.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    starts_at: new Date(value.starts_at).toISOString(),
    ends_at: value.ends_at ? new Date(value.ends_at).toISOString() : null,
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
    if (
      value.sales_start_at &&
      Number.isNaN(Date.parse(value.sales_start_at))
    ) {
      context.addIssue({
        code: "custom",
        path: ["sales_start_at"],
        message: "Use an ISO date/time with timezone.",
      });
    }

    if (value.sales_end_at && Number.isNaN(Date.parse(value.sales_end_at))) {
      context.addIssue({
        code: "custom",
        path: ["sales_end_at"],
        message: "Use an ISO date/time with timezone.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    sales_start_at: value.sales_start_at
      ? new Date(value.sales_start_at).toISOString()
      : null,
    sales_end_at: value.sales_end_at
      ? new Date(value.sales_end_at).toISOString()
      : null,
  }));

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
  });
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
    const { supabase } = await createSessionAuthClient();
    const { error } = await supabase
      .from("ticketing_events")
      .update({
        ...input,
        ...(input.status !== "published" ? { is_current: false } : {}),
      })
      .eq("id", eventId);

    if (error) {
      throw error;
    }

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}`);
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

export async function publishCurrentEventAction(formData: FormData) {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const archivePrevious = formData.get("archive_previous") === "on";
  const { supabase } = await createSessionAuthClient();
  const { error } = await supabase.rpc("ticketing_publish_current_event", {
    p_event_id: eventId,
    p_archive_previous: archivePrevious,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}`);
}

export async function archiveEventAction(formData: FormData) {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const { supabase } = await createSessionAuthClient();
  const { error } = await supabase
    .from("ticketing_events")
    .update({ status: "archived", is_current: false })
    .eq("id", eventId);

  if (error) {
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}`);
}
