import { APP_DOMAIN_HINT, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { BrandMark } from "@/components/brand/brand-mark";

export function BrandLockup({
  className,
  compact = false,
  includeDomain = false,
  tagline = APP_TAGLINE,
}: {
  className?: string;
  compact?: boolean;
  includeDomain?: boolean;
  tagline?: string | null;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className={compact ? "h-10 w-10 rounded-2xl" : undefined} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold tracking-[-0.02em] text-[var(--app-text)]">
            {APP_NAME}
          </span>
          {includeDomain ? (
            <span className="rounded-full border border-[var(--app-line)] bg-white/76 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">
              {APP_DOMAIN_HINT}
            </span>
          ) : null}
        </div>
        {tagline ? (
          <p className="mt-1 text-sm text-[var(--app-muted)]">{tagline}</p>
        ) : null}
      </div>
    </div>
  );
}
