"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteSongAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function DeleteSubmitButton({
  compact,
}: {
  compact?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      tone={compact ? "ghost" : "danger"}
      busy={pending}
      className={cn(compact && "h-8 min-h-8 px-2 text-[var(--app-red-text)] hover:bg-[var(--app-red-soft)]")}
      title="Delete song"
    >
      <Trash2 className="h-4 w-4" />
      {compact ? <span className="sr-only">Delete song</span> : "Delete song"}
    </Button>
  );
}

export function DeleteSongButton({
  songId,
  songLabel,
  compact = false,
}: {
  songId: string;
  songLabel: string;
  compact?: boolean;
}) {
  return (
    <form
      action={deleteSongAction}
      className={cn("grid gap-2", compact && "w-auto")}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete "${songLabel}"?\n\nThis permanently removes the song page, service links, import history, and first-party analytics for that song.`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="song_id" value={songId} />
      <DeleteSubmitButton compact={compact} />
      {!compact ? (
        <p className="text-xs leading-6 text-[var(--app-muted)]">
          This permanently removes the song, page, links, and analytics tied to it.
        </p>
      ) : null}
    </form>
  );
}
