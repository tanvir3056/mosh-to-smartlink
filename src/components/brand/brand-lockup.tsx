import { APP_DOMAIN_HINT, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { BrandMark } from "@/components/brand/brand-mark";

export function BrandLockup({
  className,
  compact = false,
  includeDomain = false,
  tagline = APP_TAGLINE,
  tone = "dark",
}: {
  className?: string;
  compact?: boolean;
  includeDomain?: boolean;
  tagline?: string | null;
  tone?: "dark" | "light";
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className={compact ? "h-10 w-10 rounded-2xl" : undefined} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.28em]",
              tone === "dark" ? "text-white" : "text-[var(--app-text)]",
            )}
          >
            {APP_NAME}
          </span>
          {includeDomain ? (
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                tone === "dark"
                  ? "border-white/10 bg-white/6 text-white/72"
                  : "border-[var(--app-line)] bg-white text-[var(--app-muted)]",
              )}
            >
              {APP_DOMAIN_HINT}
            </span>
          ) : null}
        </div>
        {tagline ? (
          <p
            className={cn(
              "mt-1 text-sm",
              tone === "dark" ? "text-white/60" : "text-[var(--app-muted)]",
            )}
          >
            {tagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
