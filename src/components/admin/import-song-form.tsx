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
    <Button type="submit" busy={pending} disabled={pending} className="w-full sm:w-auto">
      {pending ? "Importing" : "Import track"}
    </Button>
  );
}

export function ImportSongForm({ requestedBy }: { requestedBy: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    importSpotifyTrackAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="requested_by" value={requestedBy} />
      <div className="grid gap-1.5">
        <p className="text-sm font-medium text-[var(--app-text)]">Spotify track URL</p>
        <p className="text-sm leading-6 text-[var(--app-muted)]">
          Use the released track URL from Spotify.
        </p>
      </div>
      <label className="grid gap-2">
        <input
          name="spotify_url"
          placeholder="https://open.spotify.com/track/..."
          className="app-input"
          required
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      <div className="grid gap-3 rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-soft)]/72 px-4 py-4 text-sm leading-6 text-[var(--app-muted)]">
        <div className="flex flex-wrap gap-2">
          <span className="app-chip">Metadata</span>
          <span className="app-chip">Artwork</span>
          <span className="app-chip">Preview</span>
          <span className="app-chip">Links</span>
        </div>
        <p>
          Import opens review immediately. Nothing goes live until you press{" "}
          <span className="font-semibold text-[var(--app-text)]">Publish</span>.
        </p>
      </div>
      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
    </form>
  );
}
