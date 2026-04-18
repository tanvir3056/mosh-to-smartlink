import Image from "next/image";

import { SERVICE_LABELS } from "@/lib/constants";
import type { StreamingService } from "@/lib/types";
import { cn } from "@/lib/utils";

type AssetLockupConfig = {
  kind: "asset";
  src: string;
  alt: string;
  width: number;
  height: number;
  imageClassName: string;
  filterClassName?: string;
  label?: never;
  iconClassName?: never;
  textClassName?: never;
};

type IconLabelConfig = {
  kind: "icon_label";
  src: string;
  alt: string;
  width: number;
  height: number;
  label: string;
  iconClassName: string;
  textClassName?: string;
  imageClassName?: never;
  filterClassName?: never;
};

type BrandConfig = AssetLockupConfig | IconLabelConfig;

const BRAND_CONFIG: Record<StreamingService, BrandConfig> = {
  spotify: {
    kind: "asset",
    src: "/streaming-service-assets/spotify-full.png",
    alt: "Spotify logo",
    width: 3432,
    height: 940,
    imageClassName: "w-[8.9rem]",
  },
  apple_music: {
    kind: "icon_label",
    src: "/streaming-service-assets/apple-music.svg",
    alt: "Apple Music icon",
    width: 361,
    height: 361,
    label: "Apple Music",
    iconClassName: "h-[1.72rem] w-[1.72rem] rounded-[0.42rem]",
    textClassName: "text-[1rem] font-semibold tracking-[-0.02em]",
  },
  youtube_music: {
    kind: "icon_label",
    src: "/streaming-service-assets/youtube-music.png",
    alt: "YouTube Music icon",
    width: 144,
    height: 144,
    label: "YouTube Music",
    iconClassName: "h-[1.55rem] w-[1.55rem]",
    textClassName: "text-[1rem] font-semibold tracking-[-0.02em]",
  },
  amazon_music: {
    kind: "asset",
    src: "/streaming-service-assets/amazon-music.svg",
    alt: "Amazon Music logo",
    width: 410,
    height: 82,
    imageClassName: "w-[7.35rem]",
    filterClassName: "brightness-0",
  },
  deezer: {
    kind: "icon_label",
    src: "/streaming-service-assets/deezer-logo.png",
    alt: "Deezer logo",
    width: 240,
    height: 240,
    label: "deezer",
    iconClassName: "h-[1.55rem] w-[1.55rem] rounded-[0.35rem]",
    textClassName: "text-[1rem] font-semibold tracking-[-0.02em]",
  },
  tidal: {
    kind: "icon_label",
    src: "/streaming-service-assets/tidal.png",
    alt: "TIDAL logo",
    width: 48,
    height: 48,
    label: "TIDAL",
    iconClassName: "h-[1.18rem] w-[1.18rem]",
    textClassName: "text-[1rem] font-semibold tracking-[0.2em]",
  },
};

function AssetLockup({
  config,
}: {
  config: AssetLockupConfig;
}) {
  return (
    <Image
      src={config.src}
      alt={config.alt}
      width={config.width}
      height={config.height}
      unoptimized
      draggable={false}
      className={cn(
        "h-auto max-h-[1.85rem] w-auto object-contain object-left",
        config.imageClassName,
        config.filterClassName,
      )}
    />
  );
}

function IconLabelLockup({
  config,
}: {
  config: IconLabelConfig;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Image
        src={config.src}
        alt={config.alt}
        width={config.width}
        height={config.height}
        unoptimized
        draggable={false}
        className={cn("object-contain", config.iconClassName)}
      />
      <span
        className={cn(
          "truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-[#16181d]",
          config.textClassName,
        )}
      >
        {config.label}
      </span>
    </div>
  );
}

export function ServiceIcon({
  service,
  className,
}: {
  service: StreamingService;
  className?: string;
}) {
  const config = BRAND_CONFIG[service];

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      aria-hidden="true"
      title={SERVICE_LABELS[service]}
    >
      {config.kind === "asset" ? (
        <Image
          src={config.src}
          alt=""
          width={config.width}
          height={config.height}
          unoptimized
          draggable={false}
          className={cn("h-6 w-auto object-contain", config.filterClassName)}
        />
      ) : (
        <Image
          src={config.src}
          alt=""
          width={config.width}
          height={config.height}
          unoptimized
          draggable={false}
          className={cn("h-6 w-6 object-contain", config.iconClassName)}
        />
      )}
    </span>
  );
}

export function ServiceBranding({
  service,
  supportingText,
}: {
  service: StreamingService;
  supportingText?: string | null;
}) {
  const config = BRAND_CONFIG[service];

  return (
    <div className="w-[11.25rem] shrink-0">
      <div className="flex h-[1.9rem] items-center">
        {config.kind === "asset" ? (
          <AssetLockup config={config} />
        ) : (
          <IconLabelLockup config={config} />
        )}
      </div>
      {supportingText ? (
        <div className="mt-1 text-[12px] leading-4 text-[#7a7b74]">
          {supportingText}
        </div>
      ) : null}
    </div>
  );
}
