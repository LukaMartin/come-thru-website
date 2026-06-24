"use client";

import { useActionState } from "react";
import type { AdminMutationState } from "@/lib/admin-events-actions";
import type { Database } from "@/lib/database.types";
import { useActionToast } from "@/hooks/use-action-toast";

type LineupArtistRow = Database["public"]["Tables"]["lineup_artists"]["Row"];

type AdminLineupArtistsFormProps = {
  action: (
    state: AdminMutationState,
    formData: FormData,
  ) => Promise<AdminMutationState>;
  lineupArtists: LineupArtistRow[];
};

const lineupSlots = [0, 1, 2, 3, 4, 5] as const;
const initialState: AdminMutationState = {};
const inputClass =
  "rounded-xl border border-admin-border bg-black/20 px-4 py-3 text-sm text-admin-text outline-none transition placeholder:text-admin-subtle focus:border-admin-border-strong focus:bg-black/30";
const labelClass = "grid gap-2 text-sm font-medium text-admin-muted";

export function AdminLineupArtistsForm({
  action,
  lineupArtists,
}: AdminLineupArtistsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const artistsBySlot = new Map(
    lineupArtists.map((artist) => [artist.slot, artist]),
  );

  useActionToast(state, isPending);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4">
        {lineupSlots.map((slot) => {
          const artist = artistsBySlot.get(slot);

          return (
            <div
              key={slot}
              className="grid gap-4 rounded-2xl border border-admin-border bg-black/10 p-4 md:grid-cols-[7rem_1fr_1.4fr]"
            >
              <p className="text-xs font-medium text-admin-subtle">
                Slot {slot}
              </p>
              <label className={labelClass}>
                Name
                <input
                  name={`name_${slot}`}
                  defaultValue={artist?.name ?? ""}
                  className={inputClass}
                  autoComplete="off"
                />
              </label>
              <label className={labelClass}>
                SoundCloud URL
                <input
                  name={`soundcloud_url_${slot}`}
                  defaultValue={artist?.soundcloud_url ?? ""}
                  className={inputClass}
                  placeholder="https://on.soundcloud.com/..."
                  autoComplete="off"
                />
              </label>
            </div>
          );
        })}
      </div>

      <p className="text-sm leading-6 text-admin-muted">
        Fill slots from 0 upward. A slot with a name is saved, and an empty name
        deletes that slot.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-xl bg-admin-primary px-5 py-2.5 text-sm font-medium text-admin-primary-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save lineup"}
      </button>
    </form>
  );
}
