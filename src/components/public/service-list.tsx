"use client";

import { useSearchParams } from "next/navigation";

import { ServiceBranding } from "@/components/service-icon";
import {
  SERVICE_CTAS,
  SERVICE_HINTS,
  STREAMING_SERVICES,
} from "@/lib/constants";
import type { SongPageWithLinks } from "@/lib/types";
import { buildServiceRedirectPath, cn } from "@/lib/utils";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function ServiceList({
  page,
  mode = "live",
}: {
  page: SongPageWithLinks;
  mode?: "live" | "preview";
}) {
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString() ?? "";
  const byService = new Map(page.links.map((link) => [link.service, link]));
  const isPreview = mode === "preview";
  const services = STREAMING_SERVICES.filter((service) => {
    const link = byService.get(service);

    if (link?.isVisible === false) {
      return false;
    }

    return isPreview ? true : Boolean(link?.url);
  });

  return (
    <div className="deathcore-bone-panel text-[#151922]">
      {services.map((service, index) => {
        const link = byService.get(service);
        const isReady = Boolean(link?.url);
        const liveHref = `${buildServiceRedirectPath(page.page.username, page.page.slug, service)}${searchString ? `?${searchString}` : ""}`;
        const href = isReady ? (isPreview ? (link?.url ?? undefined) : liveHref) : undefined;
        const helperText = isPreview
          ? !isReady
            ? "Link missing"
            : link?.matchStatus === "search_fallback"
              ? "Search fallback"
              : SERVICE_HINTS[service]
          : null;
        const ctaLabel =
          link?.matchStatus === "search_fallback"
            ? "Search"
            : SERVICE_CTAS[service];

        const content = (
          <>
            <ServiceBranding
              service={service}
              supportingText={helperText}
              loading="eager"
            />
            <span
              className={cn(
                "inline-flex h-[2.375rem] w-24 items-center justify-center rounded-[0.65rem] border text-[0.96rem] font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151922]",
                isReady
                  ? "border-[#d8d1c4] bg-white text-[#111827] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_18px_rgba(17,24,39,0.08)] group-hover:border-[#bcb4a5] group-hover:bg-[#faf8f2] group-hover:shadow-[0_10px_22px_rgba(17,24,39,0.12)] group-active:translate-y-px group-active:bg-[#f2eee4]"
                  : "border-dashed border-[#d5ccbc] bg-[#f3efe6] text-[#8b8275]",
              )}
            >
              {ctaLabel}
            </span>
          </>
        );

        return (
          <div
            key={service}
            className={cn(index !== 0 && "border-t border-[#cfc0aa]")}
          >
            {isReady ? (
              <a
                href={href}
                data-testid={`service-link-${service}`}
                target={isPreview ? "_blank" : undefined}
                rel={isPreview ? "noreferrer" : undefined}
                className={cn(
                  "group grid min-h-[72px] grid-cols-[180px_96px] items-center justify-between gap-4 px-5 transition-[background-color] duration-200 ease-out hover:bg-white/62 active:bg-[#f4f0e7]",
                  "relative",
                  isPreview && helperText ? "py-3" : "py-0",
                )}
                onClick={() => {
                  if (!isPreview && page.tracking.metaPixelEnabled && window.fbq) {
                    window.fbq("trackCustom", "StreamingServiceClick", {
                      service,
                      song: page.song.title,
                      artist: page.song.artistName,
                      username: page.page.username,
                      slug: page.page.slug,
                    });
                  }
                }}
              >
                {content}
              </a>
            ) : (
              <div
                data-testid={`service-link-${service}`}
                className={cn(
                  "grid min-h-[72px] grid-cols-[180px_96px] items-center justify-between gap-4 px-5",
                  isPreview && helperText ? "py-3" : "py-0",
                )}
              >
                {content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
