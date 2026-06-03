import type { PageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const labels: Record<PageStatus, string> = {
  draft: "Draft",
  published: "Published",
  unpublished: "Unpublished",
};

export function StatusPill({
  status,
  className,
}: {
  status: PageStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-[var(--r-full)] border px-2.5 text-[12.5px] font-[550] tracking-[-0.003em]",
        status === "published" &&
          "border-[var(--app-green-line)] bg-[var(--app-green-soft)] text-[var(--app-green-text)]",
        status === "draft" &&
          "border-[var(--app-amber-line)] bg-[var(--app-amber-soft)] text-[var(--app-amber-text)]",
        status === "unpublished" &&
          "border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]",
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
