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
        "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em]",
        status === "published" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "draft" &&
          "border-amber-200 bg-amber-50 text-amber-700",
        status === "unpublished" &&
          "border-slate-200 bg-slate-50 text-slate-600",
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
