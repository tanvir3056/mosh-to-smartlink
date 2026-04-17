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
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
        status === "published" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "draft" &&
          "border-amber-200 bg-amber-50 text-amber-700",
        status === "unpublished" &&
          "border-[var(--app-line)] bg-white/75 text-[var(--app-muted)]",
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
