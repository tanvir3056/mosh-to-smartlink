"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteSongAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function DeleteSubmitButton({
  compact,
  inline,
  variant,
  onConfirm,
}: {
  compact?: boolean;
  inline?: boolean;
  variant?: "solid" | "ghost";
  onConfirm?: (event: { preventDefault(): void }) => void;
}) {
  const { pending } = useFormStatus();
  const tone =
    variant === "ghost" ? "danger-ghost" : compact ? "ghost" : "danger";

  return (
    <Button
      type="submit"
      tone={tone}
      formAction={inline ? deleteSongAction : undefined}
      onClick={inline ? onConfirm : undefined}
      busy={pending}
      className={cn(
        compact && "h-8 min-h-8 px-2 text-[var(--app-red-text)] hover:bg-[var(--app-red-soft)]",
        variant === "ghost" && "text-[var(--app-red-text)]",
      )}
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
  inline = false,
  variant = "solid",
}: {
  songId: string;
  songLabel: string;
  compact?: boolean;
  inline?: boolean;
  variant?: "solid" | "ghost";
}) {
  function confirmDelete(event: { preventDefault(): void }) {
    const confirmed = window.confirm(
      `Delete "${songLabel}"?\n\nThis permanently removes the song page, service links, import history, and first-party analytics for that song.`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  if (inline) {
    return (
      <DeleteSubmitButton
        compact={compact}
        inline
        variant={variant}
        onConfirm={confirmDelete}
      />
    );
  }

  return (
    <form
      action={deleteSongAction}
      className={cn("grid gap-2", compact && "w-auto")}
      onSubmit={confirmDelete}
    >
      <input type="hidden" name="song_id" value={songId} />
      <DeleteSubmitButton compact={compact} variant={variant} />
      {!compact && variant !== "ghost" ? (
        <p className="text-xs leading-6 text-[var(--app-muted)]">
          This permanently removes the song, page, links, and analytics tied to it.
        </p>
      ) : null}
    </form>
  );
}
