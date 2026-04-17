import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";

import { SERVICE_SEARCH_URLS } from "@/lib/constants";
import type { StreamingService } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 64);
}

export function parseSpotifyTrackId(value: string) {
  const match = value.match(
    /(?:spotify:track:|open\.spotify\.com\/track\/)([A-Za-z0-9]{22})/,
  );

  return match?.[1] ?? null;
}

export function normalizeSpotifyTrackUrl(value: string) {
  const trackId = parseSpotifyTrackId(value);

  if (!trackId) {
    return null;
  }

  return {
    trackId,
    url: `https://open.spotify.com/track/${trackId}`,
  };
}

export function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

export function extractMetaTag(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  );

  return match ? decodeHtmlEntities(match[1]) : null;
}

export function extractReferrerHost(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return format(new Date(value), "MMM d, yyyy HH:mm");
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function scoreTextSimilarity(left: string, right: string) {
  const a = normalizeMatchText(left);
  const b = normalizeMatchText(right);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (a.includes(b) || b.includes(a)) {
    return 0.92;
  }

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const shared = [...aTokens].filter((token) => bTokens.has(token)).length;
  const total = new Set([...aTokens, ...bTokens]).size;

  return total === 0 ? 0 : shared / total;
}

export function normalizeMatchText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(feat|ft|official|video|audio|lyrics|remastered)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildServiceSearchUrl(
  service: StreamingService,
  query: string,
) {
  const encoded = encodeURIComponent(query);

  switch (service) {
    case "apple_music":
    case "youtube_music":
    case "tidal":
      return `${SERVICE_SEARCH_URLS[service]}?term=${encoded}`;
    default:
      return `${SERVICE_SEARCH_URLS[service]}${encoded}`;
  }
}

export function asNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
