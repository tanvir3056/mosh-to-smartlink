"use client";

import { ServiceIcon } from "@/components/service-icon";
import {
  SERVICE_CTAS,
  SERVICE_HINTS,
  SERVICE_LABELS,
  STREAMING_SERVICES,
} from "@/lib/constants";
import type { SongPageWithLinks } from "@/lib/types";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function ServiceList({
  page,
  searchString,
  mode = "live",
}: {
  page: SongPageWithLinks;
  searchString: string;
  mode?: "live" | "preview";
}) {
  const byService = new Map(page.links.map((link) => [link.service, link]));
  const isPreview = mode === "preview";

  return (
    <div className="bg-[var(--app-surface)] text-[var(--app-surface-text)]">
      {STREAMING_SERVICES.map((service, index) => {
        const link = byService.get(service);
        const isReady = Boolean(link?.url);
        const liveHref = `/go/${page.page.slug}/${service}${searchString ? `?${searchString}` : ""}`;
        const href = isReady ? (isPreview ? (link?.url ?? undefined) : liveHref) : undefined;
        const helperText =
          link?.matchStatus === "search_fallback"
            ? "Search-result fallback"
            : isReady
              ? SERVICE_HINTS[service]
              : "Link unavailable";

        return (
          <div
            key={service}
            className={cn(
              "flex items-center gap-3 px-4 py-4 transition hover:bg-[#f3f4ee] sm:px-5",
              index !== 0 && "border-t border-[var(--app-surface-line)]",
            )}
          >
            <ServiceIcon service={service} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold tracking-[-0.02em]">
                {SERVICE_LABELS[service]}
              </div>
              <div className="text-xs text-[var(--app-surface-muted)]">
                {helperText}
              </div>
            </div>
            {isReady ? (
              <a
                href={href}
                data-testid={`service-link-${service}`}
                target={isPreview ? "_blank" : undefined}
                rel={isPreview ? "noreferrer" : undefined}
                className="inline-flex min-h-11 min-w-24 items-center justify-center rounded-2xl border border-[#d9dfd5] bg-white px-4 text-sm font-semibold text-[#233128] shadow-[0_1px_0_rgba(255,255,255,0.7),0_8px_16px_rgba(53,69,56,0.06)] transition hover:border-[#bcc8bc] hover:bg-[#f6f8f3]"
                onClick={() => {
                  if (!isPreview && page.tracking.metaPixelEnabled && window.fbq) {
                    window.fbq("trackCustom", "StreamingServiceClick", {
                      service,
                      song: page.song.title,
                      artist: page.song.artistName,
                      slug: page.page.slug,
                    });
                  }
                }}
              >
                {SERVICE_CTAS[service]}
              </a>
            ) : (
              <span
                data-testid={`service-link-${service}`}
                className="inline-flex min-h-11 min-w-24 items-center justify-center rounded-2xl border border-dashed border-[#d3d8d0] px-4 text-sm font-medium text-[#778178]"
              >
                Unavailable
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
