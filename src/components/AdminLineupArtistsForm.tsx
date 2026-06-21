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
  "border border-[#f3eadb]/14 bg-black/35 px-4 py-3 text-sm text-[#f8f0e3] outline-none transition focus:border-[#d7c7ad]/70";
const labelClass = "grid gap-2 text-sm text-[#f3eadb]/72";

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
              className="grid gap-4 border border-[#f3eadb]/10 bg-black/20 p-4 md:grid-cols-[7rem_1fr_1.4fr]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d7c7ad]">
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

      <p className="text-sm leading-6 text-[#f3eadb]/58">
        Fill slots from 0 upward. A slot with a name is saved, and an empty name
        deletes that slot.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save lineup"}
      </button>
    </form>
  );
}
