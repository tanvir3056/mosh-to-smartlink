"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { importSpotifyTrackAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" busy={pending} className="w-full sm:w-auto">
      Import track
    </Button>
  );
}

export function ImportSongForm({ requestedBy }: { requestedBy: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    importSpotifyTrackAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="requested_by" value={requestedBy} />
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Spotify track URL</span>
        <input
          name="spotify_url"
          placeholder="https://open.spotify.com/track/..."
          className="app-input"
        />
      </label>
      <div className="app-note rounded-2xl px-4 py-3 text-sm">
        After import, you land on the review screen. The fan-facing page only goes
        live after you press <span className="font-semibold text-[var(--app-text)]">Publish</span>.
      </div>
      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
    </form>
  );
}
