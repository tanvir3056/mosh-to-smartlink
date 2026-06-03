import type { SpotifyTrackImport } from "@/lib/types";
import {
  extractMetaTag,
  normalizeDateOnly,
  normalizeIsrc,
  normalizeSpotifyReleaseUrl,
} from "@/lib/utils";

function extractDocumentTitle(html: string) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function extractJsonLdValue(html: string, field: string) {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(`"${escapedField}"\\s*:\\s*"([^"]+)"`, "i"),
  );

  return match?.[1]?.trim() ?? null;
}

function extractSpotifyIsrc(html: string) {
  const directMatch =
    html.match(/"isrc"\s*:\s*"([A-Za-z0-9-]{10,20})"/i)?.[1] ??
    html.match(/"external_ids"\s*:\s*\{[^}]*"isrc"\s*:\s*"([A-Za-z0-9-]{10,20})"/i)?.[1] ??
    null;

  return normalizeIsrc(directMatch);
}

function extractSpotifyDurationMs(html: string) {
  const metaDuration = extractMetaTag(html, "music:duration");

  if (metaDuration) {
    const seconds = Number.parseFloat(metaDuration);

    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.round(seconds * 1_000);
    }
  }

  const millisMatch =
    html.match(/"duration"\s*:\s*\{\s*"totalMilliseconds"\s*:\s*(\d+)/i)?.[1] ??
    html.match(/"duration_ms"\s*:\s*(\d+)/i)?.[1] ??
    null;

  if (!millisMatch) {
    return null;
  }

  const milliseconds = Number.parseInt(millisMatch, 10);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : null;
}

function extractSpotifyReleaseDate(html: string) {
  return normalizeDateOnly(
    extractMetaTag(html, "music:release_date") ??
      extractMetaTag(html, "music:album_release_date") ??
      extractJsonLdValue(html, "datePublished"),
  );
}

async function fetchSpotifyOEmbed(releaseUrl: string) {
  const response = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(releaseUrl)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Spotify oEmbed lookup failed.");
  }

  return (await response.json()) as {
    title?: string;
    thumbnail_url?: string;
    iframe_url?: string;
  };
}

async function fetchSpotifyReleaseHtml(releaseUrl: string) {
  const response = await fetch(releaseUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error("Spotify page lookup failed.");
  }

  return response.text();
}

export async function fetchSpotifyTrackImport(
  spotifyTrackUrl: string,
): Promise<SpotifyTrackImport> {
  const normalized = normalizeSpotifyReleaseUrl(spotifyTrackUrl);

  if (!normalized) {
    throw new Error("Enter a valid Spotify track or album URL.");
  }

  const [oembed, html] = await Promise.all([
    fetchSpotifyOEmbed(normalized.url),
    fetchSpotifyReleaseHtml(normalized.url),
  ]);

  const ogTitle = extractMetaTag(html, "og:title") ?? oembed.title ?? "Untitled";
  const ogDescription = extractMetaTag(html, "og:description");
  const documentTitle = extractDocumentTitle(html);
  const descriptionParts = ogDescription
    ?.split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  const titleArtistMatch = documentTitle?.match(
    /^(.*?)\s*-\s*song and lyrics by\s*(.*?)\s*\|\s*Spotify$/i,
  );

  const artistName =
    descriptionParts?.[0] ?? titleArtistMatch?.[2]?.trim() ?? "Unknown Artist";
  const albumName = descriptionParts?.[1] ?? null;
  const releaseDate = extractSpotifyReleaseDate(html);
  const releaseYearCandidate =
    releaseDate?.slice(0, 4) ?? descriptionParts?.[3] ?? null;
  const releaseYear = Number.parseInt(releaseYearCandidate ?? "", 10);
  const previewUrl =
    html.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[^"\\\s<]+/)?.[0] ?? null;
  const durationMs = extractSpotifyDurationMs(html);
  const isrc = extractSpotifyIsrc(html);

  return {
    spotifyTrackId: normalized.id,
    spotifyTrackUrl: normalized.url,
    title: ogTitle,
    artistName,
    albumName,
    artworkUrl: oembed.thumbnail_url ?? "",
    previewUrl,
    releaseYear: Number.isFinite(releaseYear) ? releaseYear : null,
    releaseDate,
    isrc,
    explicit: false,
    durationMs,
    rawSource: {
      oembed,
      ogDescription,
      documentTitle,
      isrc,
      releaseDate,
      durationMs,
      spotifyType: normalized.type,
    },
  };
}
