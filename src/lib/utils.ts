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

export function normalizeUsername(value: string) {
  return slugify(value);
}

export function buildPublicSongPath(username: string, slug: string) {
  return `/${username}/${slug}`;
}

export function buildServiceRedirectPath(
  username: string,
  slug: string,
  service: StreamingService,
) {
  return `/go/${username}/${slug}/${service}`;
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

  const aCompact = a.replaceAll(" ", "");
  const bCompact = b.replaceAll(" ", "");

  if (aCompact === bCompact) {
    return 0.98;
  }

  if (aCompact.includes(bCompact) || bCompact.includes(aCompact)) {
    return 0.94;
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
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(feat|ft|featuring|official|video|audio|lyrics|remastered|remaster|mix|version|edit|mono|stereo|deluxe|expanded|anniversary|clean|explicit|bonus|track|album|single|ep|live at|radio edit|original mix)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeIsrc(value: string | null | undefined) {
  const normalized = (value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

  return normalized.length >= 10 ? normalized : null;
}

export function normalizeDateOnly(value: string | null | undefined) {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return null;
  }

  const dateMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);

  if (dateMatch) {
    return dateMatch[1];
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function scoreDurationSimilarity(
  expectedMs: number | null | undefined,
  actualMs: number | null | undefined,
) {
  if (!expectedMs || !actualMs) {
    return null;
  }

  const delta = Math.abs(expectedMs - actualMs);

  if (delta <= 2_000) {
    return 1;
  }

  if (delta <= 5_000) {
    return 0.9;
  }

  if (delta <= 10_000) {
    return 0.72;
  }

  if (delta <= 15_000) {
    return 0.52;
  }

  return 0;
}

export function scoreReleaseDateSimilarity(
  expectedDate: string | null | undefined,
  actualDate: string | null | undefined,
) {
  const left = normalizeDateOnly(expectedDate);
  const right = normalizeDateOnly(actualDate);

  if (!left || !right) {
    return null;
  }

  if (left === right) {
    return 1;
  }

  if (left.slice(0, 7) === right.slice(0, 7)) {
    return 0.9;
  }

  if (left.slice(0, 4) === right.slice(0, 4)) {
    return 0.76;
  }

  const yearDelta = Math.abs(
    Number.parseInt(left.slice(0, 4), 10) - Number.parseInt(right.slice(0, 4), 10),
  );

  return yearDelta === 1 ? 0.42 : 0;
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
