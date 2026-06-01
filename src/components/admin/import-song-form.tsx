"use client";

import { Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { importSpotifyTrackAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" busy={pending} disabled={pending} className="w-full sm:w-auto">
      {pending ? null : <Sparkles className="h-4 w-4" />}
      {pending ? "Importing..." : "Import song"}
    </Button>
  );
}

export function ImportSongForm({ requestedBy }: { requestedBy: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    importSpotifyTrackAction,
    INITIAL_ACTION_STATE,
  );
  const [spotifyUrl, setSpotifyUrl] = useState("");

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <input type="hidden" name="requested_by" value={requestedBy} />
      <div className="grid gap-1.5">
        <label
          htmlFor="spotify-url"
          className="text-sm font-medium text-[var(--app-text)]"
        >
          Spotify track or album URL
        </label>
        <p id="spotify-url-help" className="text-sm leading-6 text-[var(--app-muted)]">
          Open the song in Spotify, tap{" "}
          <span className="font-semibold text-[var(--app-text)]">
            Share - Copy link
          </span>
          , and paste it here.
        </p>
      </div>
      <div className="grid gap-2">
        <input
          id="spotify-url"
          name="spotify_url"
          placeholder="https://open.spotify.com/track/..."
          className="app-input"
          value={spotifyUrl}
          onChange={(event) => setSpotifyUrl(event.currentTarget.value)}
          required
          aria-describedby="spotify-url-help"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <FormStateMessage error={state.error} success={state.success} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <button
          type="button"
          onClick={() =>
            setSpotifyUrl("https://open.spotify.com/track/4n2c9Jt1Fl3O7g4D2nQbXa")
          }
          className="text-[13px] font-semibold text-[var(--app-accent-text)] transition hover:text-[var(--app-accent-strong)]"
        >
          Use an example link
        </button>
      </div>
    </form>
  );
}
