import YouTubeSearchApi from "youtube-search-api";

import { STREAMING_SERVICES } from "@/lib/constants";
import type {
  ImportBundle,
  MatchCandidate,
  SpotifyTrackImport,
  StreamingService,
} from "@/lib/types";
import {
  buildServiceSearchUrl,
  normalizeMatchText,
  scoreTextSimilarity,
} from "@/lib/utils";

type AppleSearchItem = {
  artistName?: string;
  previewUrl?: string;
  trackName?: string;
  trackViewUrl?: string;
};

type DeezerSearchItem = {
  artist?: {
    name?: string;
  };
  link?: string;
  preview?: string;
  title?: string;
};

function buildSearchQuery(track: SpotifyTrackImport) {
  return `${track.artistName} ${track.title}`;
}

function createFallbackMatch(
  service: StreamingService,
  track: SpotifyTrackImport,
  notes: string,
): MatchCandidate {
  return {
    service,
    url: buildServiceSearchUrl(service, buildSearchQuery(track)),
    matchStatus: "search_fallback",
    matchSource: `${service}_search_fallback`,
    confidence: 0.45,
    notes,
  };
}

function scoreCandidate(
  expectedTitle: string,
  expectedArtist: string,
  candidateTitle: string | undefined,
  candidateArtist: string | undefined,
) {
  const titleScore = scoreTextSimilarity(expectedTitle, candidateTitle ?? "");
  const artistScore = scoreTextSimilarity(expectedArtist, candidateArtist ?? "");
  return titleScore * 0.68 + artistScore * 0.32;
}

async function matchAppleMusic(track: SpotifyTrackImport) {
  const query = new URLSearchParams({
    term: buildSearchQuery(track),
    entity: "song",
    limit: "5",
  });

  try {
    const response = await fetch(`https://itunes.apple.com/search?${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        match: createFallbackMatch(
          "apple_music",
          track,
          "Apple Music search is temporarily unavailable.",
        ),
        previewUrl: null,
      };
    }

    const payload = (await response.json()) as {
      results?: AppleSearchItem[];
    };

    const best = (payload.results ?? [])
      .map((item) => ({
        item,
        score: scoreCandidate(
          track.title,
          track.artistName,
          item.trackName,
          item.artistName,
        ),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (best?.item.trackViewUrl && best.score >= 0.74) {
      return {
        match: {
          service: "apple_music" as const,
          url: best.item.trackViewUrl,
          matchStatus: "matched" as const,
          matchSource: "itunes_search",
          confidence: Number(best.score.toFixed(2)),
          notes: null,
        },
        previewUrl: best.item.previewUrl ?? null,
      };
    }
  } catch {
    return {
      match: createFallbackMatch(
        "apple_music",
        track,
        "Apple Music search failed; review suggested search results before publishing.",
      ),
      previewUrl: null,
    };
  }

  return {
    match: createFallbackMatch(
      "apple_music",
      track,
      "Apple Music could not be matched confidently.",
    ),
    previewUrl: null,
  };
}

async function matchDeezer(track: SpotifyTrackImport) {
  const query = encodeURIComponent(`artist:"${track.artistName}" track:"${track.title}"`);

  try {
    const response = await fetch(`https://api.deezer.com/search/track?q=${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        match: createFallbackMatch(
          "deezer",
          track,
          "Deezer search is temporarily unavailable.",
        ),
        previewUrl: null,
      };
    }

    const payload = (await response.json()) as {
      data?: DeezerSearchItem[];
    };

    const best = (payload.data ?? [])
      .map((item) => ({
        item,
        score: scoreCandidate(
          track.title,
          track.artistName,
          item.title,
          item.artist?.name,
        ),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (best?.item.link && best.score >= 0.7) {
      return {
        match: {
          service: "deezer" as const,
          url: best.item.link,
          matchStatus: "matched" as const,
          matchSource: "deezer_search",
          confidence: Number(best.score.toFixed(2)),
          notes: null,
        },
        previewUrl: best.item.preview ?? null,
      };
    }
  } catch {
    return {
      match: createFallbackMatch(
        "deezer",
        track,
        "Deezer search failed; review the suggested search result before publishing.",
      ),
      previewUrl: null,
    };
  }

  return {
    match: createFallbackMatch(
      "deezer",
      track,
      "Deezer could not be matched confidently.",
    ),
    previewUrl: null,
  };
}

async function matchYouTubeMusic(track: SpotifyTrackImport) {
  try {
    const response = await YouTubeSearchApi.GetListByKeyword(
      `${track.artistName} ${track.title} audio`,
      false,
      5,
      [{ type: "video" }],
    );

    const best = (response.items ?? [])
      .map((item) => {
        const title = typeof item.title === "string" ? item.title : "";
        const channelTitle =
          typeof item.channelTitle === "string"
            ? item.channelTitle
            : typeof item.shortBylineText === "string"
              ? item.shortBylineText
              : "";

        return {
          item,
          score: scoreCandidate(track.title, track.artistName, title, channelTitle),
        };
      })
      .sort((left, right) => right.score - left.score)[0];

    if (best?.item.id && best.score >= 0.66) {
      return {
        service: "youtube_music",
        url: `https://music.youtube.com/watch?v=${best.item.id}`,
        matchStatus: best.score >= 0.76 ? "matched" : "search_fallback",
        matchSource: "youtube_search",
        confidence: Number(best.score.toFixed(2)),
        notes:
          best.score >= 0.76
            ? null
            : "Review this YouTube Music match before publishing.",
      } satisfies MatchCandidate;
    }
  } catch {
    return createFallbackMatch(
      "youtube_music",
      track,
      "YouTube Music search failed; the fallback opens search results instead.",
    );
  }

  return createFallbackMatch(
    "youtube_music",
    track,
    "YouTube Music could not be matched confidently.",
  );
}

function matchSpotify(track: SpotifyTrackImport) {
  return {
    service: "spotify",
    url: track.spotifyTrackUrl,
    matchStatus: "matched",
    matchSource: "spotify_track_url",
    confidence: 1,
    notes: null,
  } satisfies MatchCandidate;
}

function buildStaticServiceMatches(track: SpotifyTrackImport) {
  return [
    createFallbackMatch(
      "amazon_music",
      track,
      "Amazon Music uses a search-result fallback in V1.",
    ),
    createFallbackMatch(
      "tidal",
      track,
      "TIDAL uses a search-result fallback in V1.",
    ),
  ];
}

export async function buildImportBundle(
  track: SpotifyTrackImport,
): Promise<ImportBundle> {
  const [apple, deezer, youtubeMusic] = await Promise.all([
    matchAppleMusic(track),
    matchDeezer(track),
    matchYouTubeMusic(track),
  ]);

  const links = [
    matchSpotify(track),
    apple.match,
    youtubeMusic,
    ...buildStaticServiceMatches(track),
    deezer.match,
  ]
    .sort(
      (left, right) =>
        STREAMING_SERVICES.indexOf(left.service) -
        STREAMING_SERVICES.indexOf(right.service),
    )
    .map((link) => ({
      ...link,
      notes:
        link.notes ??
        (link.matchStatus === "search_fallback"
          ? "Review this fallback before publishing."
          : null),
      confidence: link.confidence ?? null,
      matchSource: link.matchSource,
      service: link.service,
    }));

  const previewUrl =
    track.previewUrl ?? apple.previewUrl ?? deezer.previewUrl ?? null;

  return {
    song: {
      ...track,
      previewUrl,
    },
    links,
    importStatus: links.every((link) => link.matchStatus === "matched")
      ? "succeeded"
      : "partial",
  };
}

export function summarizeMatchQuality(links: MatchCandidate[]) {
  const matchedLinks = links.filter((link) => link.matchStatus === "matched");
  return {
    matchedCount: matchedLinks.length,
    fallbackCount: links.filter((link) => link.matchStatus === "search_fallback")
      .length,
    unresolvedCount: links.filter((link) => link.matchStatus === "unresolved")
      .length,
  };
}

export function buildReviewNotes(track: SpotifyTrackImport, links: MatchCandidate[]) {
  const normalizedTitle = normalizeMatchText(track.title);
  const searchFallbacks = links.filter((link) => link.matchStatus !== "matched");

  if (searchFallbacks.length === 0) {
    return `Imported "${normalizedTitle}" with confident matches across all target services.`;
  }

  return `${searchFallbacks.length} services need manual review before publish.`;
}
