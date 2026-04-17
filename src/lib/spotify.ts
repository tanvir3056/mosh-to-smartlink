import type { SpotifyTrackImport } from "@/lib/types";
import { extractMetaTag, normalizeSpotifyTrackUrl } from "@/lib/utils";

function extractDocumentTitle(html: string) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

async function fetchSpotifyOEmbed(trackUrl: string) {
  const response = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`,
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

async function fetchSpotifyTrackHtml(trackUrl: string) {
  const response = await fetch(trackUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error("Spotify track page lookup failed.");
  }

  return response.text();
}

export async function fetchSpotifyTrackImport(
  spotifyTrackUrl: string,
): Promise<SpotifyTrackImport> {
  const normalized = normalizeSpotifyTrackUrl(spotifyTrackUrl);

  if (!normalized) {
    throw new Error("Enter a valid Spotify track URL.");
  }

  const [oembed, html] = await Promise.all([
    fetchSpotifyOEmbed(normalized.url),
    fetchSpotifyTrackHtml(normalized.url),
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
  const releaseYear = Number.parseInt(descriptionParts?.[3] ?? "", 10);
  const previewUrl =
    html.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[^"\\\s<]+/)?.[0] ?? null;

  return {
    spotifyTrackId: normalized.trackId,
    spotifyTrackUrl: normalized.url,
    title: ogTitle,
    artistName,
    albumName,
    artworkUrl: oembed.thumbnail_url ?? "",
    previewUrl,
    releaseYear: Number.isFinite(releaseYear) ? releaseYear : null,
    explicit: false,
    durationMs: null,
    rawSource: {
      oembed,
      ogDescription,
    },
  };
}
