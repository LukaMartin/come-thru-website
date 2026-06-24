"use client";

import { useActionState } from "react";
import type { AdminMutationState } from "@/lib/admin-events-actions";
import type { Database } from "@/lib/database.types";
import { formatSydneyDateTimeLocal } from "@/lib/event-time";
import { useActionToast } from "@/hooks/use-action-toast";

type TicketTypeRow =
  Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];

type AdminTicketTypeFormProps = {
  action: (
    state: AdminMutationState,
    formData: FormData,
  ) => Promise<AdminMutationState>;
  ticketType?: TicketTypeRow;
};

const initialState: AdminMutationState = {};
const inputClass =
  "min-w-0 w-full rounded-xl border border-admin-border bg-black/20 px-4 py-3 text-sm text-admin-text outline-none transition [color-scheme:dark] placeholder:text-admin-subtle focus:border-admin-border-strong focus:bg-black/30";
const labelClass = "grid min-w-0 gap-2 text-sm font-medium text-admin-muted";

export function AdminTicketTypeForm({
  action,
  ticketType,
}: AdminTicketTypeFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isEditing = Boolean(ticketType);

  useActionToast(state, isPending);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Name
          <input
            name="name"
            required
            defaultValue={ticketType?.name ?? ""}
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Stripe price ID
          <input
            name="stripe_price_id"
            defaultValue={ticketType?.stripe_price_id ?? ""}
            className={inputClass}
            placeholder="price_..."
            autoComplete="off"
          />
        </label>
      </div>

      <label className={labelClass}>
        Description
        <textarea
          name="description"
          defaultValue={ticketType?.description ?? ""}
          rows={3}
          className={inputClass}
          autoComplete="off"
        />
      </label>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className={labelClass}>
          Price cents
          <input
            name="price_cents"
            type="number"
            min={0}
            required
            defaultValue={ticketType?.price_cents ?? 0}
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Currency
          <input
            name="currency"
            required
            defaultValue={ticketType?.currency ?? "aud"}
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Capacity
          <input
            name="capacity"
            type="number"
            min={0}
            required
            defaultValue={ticketType?.capacity ?? 0}
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Sort order
          <input
            name="sort_order"
            type="number"
            required
            defaultValue={ticketType?.sort_order ?? 0}
            className={inputClass}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Sales start
          <input
            name="sales_start_at"
            type="datetime-local"
            defaultValue={formatSydneyDateTimeLocal(
              ticketType?.sales_start_at ?? null,
            )}
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <label className={labelClass}>
          Sales end
          <input
            name="sales_end_at"
            type="datetime-local"
            defaultValue={formatSydneyDateTimeLocal(
              ticketType?.sales_end_at ?? null,
            )}
            className={inputClass}
            autoComplete="off"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-admin-muted">
        <input
          name="active"
          type="checkbox"
          defaultChecked={ticketType?.active ?? true}
          className="size-4 accent-admin-primary"
        />
        Active
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-xl bg-admin-primary px-5 py-2.5 text-sm font-medium text-admin-primary-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Saving..."
          : isEditing
            ? "Save ticket type"
            : "Add ticket type"}
      </button>
    </form>
  );
}
