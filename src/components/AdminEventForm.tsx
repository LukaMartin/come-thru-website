"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { AdminMutationState } from "@/lib/admin-events-actions";
import type { Database } from "@/lib/database.types";
import { formatSydneyDateTimeLocal } from "@/lib/event-time";
import { useActionToast } from "@/hooks/use-action-toast";

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
const selectClass =
  "w-full appearance-none border border-[#f3eadb]/14 bg-black/35 px-4 py-3 pr-12 text-sm font-medium text-[#f8f0e3] outline-none transition hover:border-[#f3eadb]/28 focus:border-[#d7c7ad]/70 focus:bg-black/70";
const fileInputClass =
  "border border-[#f3eadb]/14 bg-black/35 px-3 py-2 text-sm text-[#f8f0e3] file:mr-4 file:border-0 file:bg-[#f8f0e3] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black outline-none transition focus:border-[#d7c7ad]/70";
const labelClass = "grid gap-2 text-sm text-[#f3eadb]/72";

export function AdminEventForm({ action, event, mode }: AdminEventFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const previewUrl = event?.hero_image_url?.trim();

  useActionToast(state, isPending);

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
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Name
          <input
            name="name"
            required
            defaultValue={event?.name ?? ""}
            className={inputClass}
            autoComplete="off"
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
          autoComplete="off"
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
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Venue address
          <input
            name="venue_address"
            defaultValue={event?.venue_address ?? ""}
            className={inputClass}
            autoComplete="off"
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
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Ends at
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={formatSydneyDateTimeLocal(event?.ends_at ?? null)}
            className={inputClass}
            autoComplete="off"
          />
        </label>
      </div>

      {mode === "edit" ? (
        <div className="grid gap-4 md:grid-cols-[12rem_1fr] md:items-start">
          <div className="overflow-hidden border border-[#f3eadb]/12 bg-[#11100d]">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={event?.name ?? "Event hero image"}
                width={360}
                height={512}
                unoptimized
                className="aspect-45/64 w-full object-cover opacity-90"
              />
            ) : (
              <div className="flex aspect-45/64 items-center justify-center p-5 text-center text-sm text-[#f3eadb]/50">
                No hero image yet.
              </div>
            )}
          </div>

          <div className="grid content-start gap-4">
            <label className={labelClass}>
              Upload hero image
              <input
                name="hero_image_file"
                type="file"
                accept="image/jpeg,image/png"
                className={fileInputClass}
                autoComplete="off"
              />
              <span className="text-xs leading-5 text-[#f3eadb]/45">
                JPG or PNG, converted to a 720x1024 WebP.
              </span>
            </label>

            <label className={labelClass}>
              Current hero image URL
              <input
                name="hero_image_url"
                defaultValue={event?.hero_image_url ?? ""}
                className={inputClass}
                autoComplete="off"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Hero image URL
            <input
              name="hero_image_url"
              defaultValue={event?.hero_image_url ?? ""}
              className={inputClass}
              autoComplete="off"
            />
          </label>
          <label className={labelClass}>
            Ticket Colours
            <input
              name="ticket_colours"
              defaultValue={event?.ticket_colours ?? ""}
              className={inputClass}
              placeholder="Enter comma-separated hex colours"
              autoComplete="off"
            />
          </label>
        </div>
      )}

      {mode === "edit" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Ticket Colours
            <input
              name="ticket_colours"
              defaultValue={event?.ticket_colours ?? ""}
              className={inputClass}
              autoComplete="off"
            />
          </label>
          <label className={labelClass}>
            Status
            <div className="relative">
              <select
                name="status"
                defaultValue={event?.status ?? "draft"}
                className={selectClass}
              >
                <option className="bg-[#080705] text-[#f8f0e3]" value="draft">
                  Draft
                </option>
                <option
                  className="bg-[#080705] text-[#f8f0e3]"
                  value="published"
                >
                  Published
                </option>
                <option
                  className="bg-[#080705] text-[#f8f0e3]"
                  value="archived"
                >
                  Archived
                </option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#f3eadb]/70"
              >
                <path
                  d="M5 7.5 10 12.5 15 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
          </label>
        </div>
      ) : (
        <input type="hidden" name="status" value="draft" />
      )}

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
      </div>

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
