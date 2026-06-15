"use client";

import { useActionState } from "react";
import type { AdminMutationState } from "@/lib/admin-events-actions";
import type { Database } from "@/lib/database.types";
import { formatSydneyDateTimeLocal } from "@/lib/event-time";

type EventRow = Database["public"]["Tables"]["ticketing_events"]["Row"];

type AdminEventFormProps = {
  action: (
    state: AdminMutationState,
    formData: FormData,
  ) => Promise<AdminMutationState>;
  event?: EventRow;
  mode: "create" | "edit";
};

const initialState: AdminMutationState = {};
const inputClass =
  "border border-[#f3eadb]/14 bg-black/35 px-4 py-3 text-sm text-[#f8f0e3] outline-none transition focus:border-[#d7c7ad]/70";
const labelClass = "grid gap-2 text-sm text-[#f3eadb]/72";

export function AdminEventForm({ action, event, mode }: AdminEventFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Slug
          <input
            name="slug"
            required
            defaultValue={event?.slug ?? ""}
            className={inputClass}
            placeholder="warehouse-party-june"
          />
        </label>
        <label className={labelClass}>
          Name
          <input
            name="name"
            required
            defaultValue={event?.name ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Description
        <textarea
          name="description"
          defaultValue={event?.description ?? ""}
          rows={4}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Venue
          <input
            name="venue"
            required
            defaultValue={event?.venue ?? ""}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Venue address
          <input
            name="venue_address"
            defaultValue={event?.venue_address ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Starts at
          <input
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={formatSydneyDateTimeLocal(event?.starts_at ?? null)}
            className={inputClass}
            autoComplete="new-password"
          />
        </label>
        <label className={labelClass}>
          Ends at
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={formatSydneyDateTimeLocal(event?.ends_at ?? null)}
            className={inputClass}
            autoComplete="new-password"
          />
        </label>
      </div>

      <label className={labelClass}>
        Hero image URL
        <input
          name="hero_image_url"
          defaultValue={event?.hero_image_url ?? ""}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm text-[#f3eadb]/72">
          <input
            name="is_free"
            type="checkbox"
            defaultChecked={event?.is_free ?? false}
            className="size-4 accent-[#f8f0e3]"
          />
          Free event
        </label>
        {mode === "edit" ? (
          <label className={labelClass}>
            Status
            <select
              name="status"
              defaultValue={event?.status ?? "draft"}
              className={inputClass}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="status" value="draft" />
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-red-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-300">{state.success}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60"
      >
        {isPending
          ? "Saving..."
          : mode === "create"
            ? "Create draft"
            : "Save event"}
      </button>
    </form>
  );
}
