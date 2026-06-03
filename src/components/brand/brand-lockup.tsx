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
      <BrandMark className={compact ? "h-8 w-8" : undefined} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-[15.5px] font-[650] tracking-[-0.02em]",
              tone === "dark" ? "text-[var(--app-text)]" : "text-[var(--app-text)]",
            )}
          >
            {APP_NAME[0] + APP_NAME.slice(1).toLowerCase()}
          </span>
          {includeDomain ? (
            <span
              className={cn(
                "rounded-[var(--r-full)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-2.5 py-1 text-[11px] font-[550] uppercase tracking-[0.04em] text-[var(--app-muted)]",
              )}
            >
              {APP_DOMAIN_HINT}
            </span>
          ) : null}
        </div>
        {tagline ? (
          <p
            className={cn(
              "mt-0.5 text-[11.5px] text-[var(--app-muted-2)]",
            )}
          >
            {tagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
