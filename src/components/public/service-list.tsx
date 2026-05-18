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
    <div className="deathcore-bone-panel text-[#111113]">
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
                "inline-flex h-[2.375rem] w-24 items-center justify-center rounded-[0.35rem] border text-[0.96rem] font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151922]",
                isReady
                  ? "border-[#a8957c] bg-[#111113] text-[#fff9ec] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] group-hover:border-[#8f1420] group-hover:bg-[#8f1420] group-active:bg-[#5f0e16]"
                  : "border-dashed border-[#b9ac99] bg-[#d5cab8] text-[#6f6659]",
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
                  "group grid min-h-[72px] grid-cols-[180px_96px] items-center justify-between gap-4 px-5 transition-[background-color] duration-200 ease-out hover:bg-white/42 active:bg-[#ede6d8]",
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
