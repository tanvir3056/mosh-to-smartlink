"use client";

import {
  Check,
  ImageIcon,
  Link2,
  ListMusic,
  Loader2,
  Music2,
  Play,
  Sparkles,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { importSpotifyTrackAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const importStages = [
  {
    title: "Metadata",
    body: "Title, artist, album",
    icon: ListMusic,
  },
  {
    title: "Artwork",
    body: "Cover image",
    icon: ImageIcon,
  },
  {
    title: "Preview",
    body: "30-second clip",
    icon: Play,
  },
  {
    title: "Streaming links",
    body: "Matched across services",
    icon: Link2,
  },
];

function isSpotifyImportUrl(value: string) {
  return /open\.spotify\.com\/(track|album)\//i.test(value.trim());
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" busy={pending} disabled={pending} className="w-full sm:w-auto">
      {pending ? null : <Sparkles className="h-4 w-4" />}
      {pending ? "Importing..." : "Import song"}
    </Button>
  );
}

function StageBadge({
  stage,
  state,
}: {
  stage: (typeof importStages)[number];
  state: "idle" | "active" | "done";
}) {
  const Icon = stage.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-[11px] rounded-[10px] border px-3.5 py-3 transition",
        state === "done"
          ? "border-[var(--app-green-line)] bg-[var(--app-green-soft)]"
          : state === "active"
            ? "border-[var(--app-accent-line)] bg-[var(--app-accent-soft)]"
            : "border-[var(--app-line)] bg-[var(--app-panel-muted)]",
      )}
    >
      <span
        className={cn(
          "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] bg-[var(--app-panel)] shadow-[0_1px_2px_oklch(0.2_0.02_270_/_0.05)]",
          state === "done"
            ? "text-[var(--app-green-text)]"
            : state === "active"
              ? "text-[var(--app-accent-text)]"
              : "text-[var(--app-muted-2)]",
        )}
      >
        {state === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <div
          className={cn(
            "text-[13.5px] font-semibold",
            state === "idle" ? "text-[var(--app-muted)]" : "text-[var(--app-text)]",
          )}
        >
          {stage.title}
        </div>
        <div className="text-[11.5px] text-[var(--app-muted-2)]">
          {state === "done" ? "Ready" : state === "active" ? "Fetching..." : stage.body}
        </div>
      </div>
    </div>
  );
}

function ImportProgress({
  started,
  activeIndex,
}: {
  started: boolean;
  activeIndex: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14.5px] font-semibold text-[var(--app-text)]">
          What we pull in
        </h2>
        {started ? (
          <span className="app-chip border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Working...
          </span>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {importStages.map((stage, index) => (
          <StageBadge
            key={stage.title}
            stage={stage}
            state={
              started
                ? activeIndex > index
                  ? "done"
                  : activeIndex === index
                    ? "active"
                    : "idle"
                : "idle"
            }
          />
        ))}
      </section>
    </>
  );
}

export function ImportSongForm({ requestedBy }: { requestedBy: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    importSpotifyTrackAction,
    INITIAL_ACTION_STATE,
  );
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [progressStarted, setProgressStarted] = useState(false);
  const [progressIndex, setProgressIndex] = useState(-1);
  const visibleError = localError ?? state.error;
  const progressActive = progressStarted && !visibleError;

  useEffect(() => {
    if (!progressActive) {
      return;
    }

    const timers = importStages.map((_, index) =>
      window.setTimeout(() => {
        setProgressIndex(Math.min(index + 1, importStages.length));
      }, 700 * (index + 1)),
    );

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [progressActive]);

  return (
    <form
      action={formAction}
      className="grid gap-[18px]"
      noValidate
      onSubmit={(event) => {
        const trimmedUrl = spotifyUrl.trim();

        if (!trimmedUrl || !isSpotifyImportUrl(trimmedUrl)) {
          event.preventDefault();
          setProgressStarted(false);
          setProgressIndex(-1);
          setLocalError(
            "That does not look like a Spotify track or album link. Copy the URL from Share - Copy link.",
          );
          return;
        }

        setLocalError(null);
        setProgressIndex(0);
        setProgressStarted(true);
      }}
    >
      <section className="app-card rounded-[14px] p-6">
        <div className="grid gap-4">
          <input type="hidden" name="requested_by" value={requestedBy} />
          <div className="grid gap-2">
            <label
              htmlFor="spotify-url"
              className="text-sm font-semibold text-[var(--app-text)]"
            >
              Spotify track or album URL
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#1ed760] text-white">
                <Music2 className="h-3.5 w-3.5" />
              </span>
              <input
                id="spotify-url"
                name="spotify_url"
                placeholder="https://open.spotify.com/track/..."
                className="app-input w-full !pl-11 font-mono text-[13px]"
                value={spotifyUrl}
                onChange={(event) => {
                  setSpotifyUrl(event.currentTarget.value);
                  setProgressStarted(false);
                  setProgressIndex(-1);
                  if (localError) {
                    setLocalError(null);
                  }
                }}
                required
                aria-invalid={Boolean(visibleError)}
                aria-describedby="spotify-url-help"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <p id="spotify-url-help" className="text-sm leading-6 text-[var(--app-muted)]">
              Open the song in Spotify, tap{" "}
              <span className="font-semibold text-[var(--app-text)]">
                Share - Copy link
              </span>
              , and paste it here.
            </p>
          </div>
          <FormStateMessage error={visibleError} success={state.success} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton />
            <button
              type="button"
              onClick={() => {
                setSpotifyUrl("https://open.spotify.com/track/4n2c9Jt1Fl3O7g4D2nQbXa");
                setProgressStarted(false);
                setProgressIndex(-1);
                setLocalError(null);
              }}
              className="min-h-10 px-2 text-[13px] font-semibold leading-5 text-[var(--app-accent-text)] transition hover:text-[var(--app-accent-strong)]"
            >
              Use an example link
            </button>
          </div>
        </div>
      </section>

      <ImportProgress started={progressActive} activeIndex={progressIndex} />
    </form>
  );
}
