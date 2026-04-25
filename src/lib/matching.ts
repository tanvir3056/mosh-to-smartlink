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
  collectionName?: string;
  previewUrl?: string;
  releaseDate?: string;
  trackName?: string;
  trackViewUrl?: string;
};

type DeezerSearchItem = {
  album?: {
    title?: string;
  };
  artist?: {
    name?: string;
  };
  link?: string;
  preview?: string;
  title?: string;
};

type SonglinkEntity = {
  artistName?: string;
  title?: string;
};

type SonglinkPlatformLink = {
  entityUniqueId?: string;
  url?: string;
};

type SonglinkResponse = {
  entitiesByUniqueId?: Record<string, SonglinkEntity | undefined>;
  linksByPlatform?: Record<string, SonglinkPlatformLink | undefined>;
};

const MATCH_NETWORK_TIMEOUT_MS = 4_500;
const APPLE_MATCH_THRESHOLD = 0.78;
const APPLE_REVIEW_THRESHOLD = 0.64;
const DEEZER_MATCH_THRESHOLD = 0.76;
const DEEZER_REVIEW_THRESHOLD = 0.62;
const YOUTUBE_MATCH_THRESHOLD = 0.74;
const YOUTUBE_REVIEW_THRESHOLD = 0.62;

const SONG_LINK_PLATFORM_MAP = {
  amazonMusic: "amazon_music",
  appleMusic: "apple_music",
  deezer: "deezer",
  spotify: "spotify",
  tidal: "tidal",
  youtubeMusic: "youtube_music",
} as const satisfies Record<string, StreamingService>;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildSearchQuery(
  track: SpotifyTrackImport,
  options?: {
    includeAlbum?: boolean;
  },
) {
  return [
    track.artistName,
    track.title,
    options?.includeAlbum ? track.albumName : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function createMatchedMatch(
  service: StreamingService,
  url: string,
  matchSource: string,
  confidence: number,
): MatchCandidate {
  return {
    service,
    url,
    matchStatus: "matched",
    matchSource,
    confidence: Number(confidence.toFixed(2)),
    notes: null,
  };
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

function createReviewCandidate(
  service: StreamingService,
  url: string,
  matchSource: string,
  confidence: number,
  notes: string,
): MatchCandidate {
  return {
    service,
    url,
    matchStatus: "search_fallback",
    matchSource,
    confidence: Number(confidence.toFixed(2)),
    notes,
  };
}

function scoreCandidate(
  track: SpotifyTrackImport,
  candidate: {
    albumName?: string | null;
    artistName?: string | null;
    releaseDate?: string | null;
    title?: string | null;
  },
) {
  const titleScore = scoreTextSimilarity(track.title, candidate.title ?? "");
  const artistScore = scoreTextSimilarity(track.artistName, candidate.artistName ?? "");
  const albumScore =
    track.albumName && candidate.albumName
      ? scoreTextSimilarity(track.albumName, candidate.albumName)
      : null;
  const baseScore =
    albumScore === null
      ? titleScore * 0.7 + artistScore * 0.3
      : titleScore * 0.58 + artistScore * 0.28 + albumScore * 0.14;
  const yearBonus =
    track.releaseYear && candidate.releaseDate?.startsWith(String(track.releaseYear))
      ? 0.04
      : 0;

  return Math.min(1, baseScore + yearBonus);
}

function isResolverEntityCompatible(track: SpotifyTrackImport, entity: SonglinkEntity | undefined) {
  if (!entity?.title || !entity.artistName) {
    return true;
  }

  return scoreCandidate(track, entity) >= 0.7;
}

async function fetchJsonWithTimeout<T>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(MATCH_NETWORK_TIMEOUT_MS),
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function resolveSonglinkMatches(track: SpotifyTrackImport) {
  try {
    const payload = await fetchJsonWithTimeout<SonglinkResponse>(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(track.spotifyTrackUrl)}`,
    );
    const linksByPlatform = payload.linksByPlatform ?? {};
    const entitiesByUniqueId = payload.entitiesByUniqueId ?? {};
    const matches: Partial<Record<StreamingService, MatchCandidate>> = {};

    for (const [platform, service] of Object.entries(SONG_LINK_PLATFORM_MAP)) {
      const link = linksByPlatform[platform];

      if (!link?.url) {
        continue;
      }

      const entity = link.entityUniqueId
        ? entitiesByUniqueId[link.entityUniqueId]
        : undefined;

      if (service !== "spotify" && !isResolverEntityCompatible(track, entity)) {
        continue;
      }

      matches[service] = createMatchedMatch(
        service,
        link.url,
        `songlink_${platform}`,
        entity ? scoreCandidate(track, entity) : 0.96,
      );
    }

    return matches;
  } catch {
    return {} as Partial<Record<StreamingService, MatchCandidate>>;
  }
}

async function matchAppleMusic(
  track: SpotifyTrackImport,
  exactMatch?: MatchCandidate,
) {
  if (exactMatch?.url) {
    return {
      match: exactMatch,
      previewUrl: null,
    };
  }

  const query = new URLSearchParams({
    term: buildSearchQuery(track, { includeAlbum: true }),
    entity: "song",
    limit: "8",
  });

  try {
    const payload = await fetchJsonWithTimeout<{
      results?: AppleSearchItem[];
    }>(`https://itunes.apple.com/search?${query}`);

    const best = (payload.results ?? [])
      .map((item) => ({
        item,
        score: scoreCandidate(track, {
          title: item.trackName,
          artistName: item.artistName,
          albumName: item.collectionName,
          releaseDate: item.releaseDate,
        }),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (!best?.item.trackViewUrl) {
      return {
        match: createFallbackMatch(
          "apple_music",
          track,
          "Apple Music could not be matched confidently.",
        ),
        previewUrl: null,
      };
    }

    if (best.score >= APPLE_MATCH_THRESHOLD) {
      return {
        match: createMatchedMatch(
          "apple_music",
          best.item.trackViewUrl,
          "itunes_search",
          best.score,
        ),
        previewUrl: best.item.previewUrl ?? null,
      };
    }

    if (best.score >= APPLE_REVIEW_THRESHOLD) {
      return {
        match: createReviewCandidate(
          "apple_music",
          best.item.trackViewUrl,
          "itunes_search_review",
          best.score,
          "Review this Apple Music match before publishing.",
        ),
        previewUrl: best.item.previewUrl ?? null,
      };
    }
  } catch {
    return {
      match: createFallbackMatch(
        "apple_music",
        track,
        "Apple Music search failed; review suggested results before publishing.",
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

async function matchDeezer(
  track: SpotifyTrackImport,
  exactMatch?: MatchCandidate,
) {
  if (exactMatch?.url) {
    return {
      match: exactMatch,
      previewUrl: null,
    };
  }

  const query = encodeURIComponent(
    `artist:"${track.artistName}" track:"${track.title}"`,
  );

  try {
    const payload = await fetchJsonWithTimeout<{
      data?: DeezerSearchItem[];
    }>(`https://api.deezer.com/search/track?q=${query}`);

    const best = (payload.data ?? [])
      .map((item) => ({
        item,
        score: scoreCandidate(track, {
          title: item.title,
          artistName: item.artist?.name,
          albumName: item.album?.title,
        }),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (!best?.item.link) {
      return {
        match: createFallbackMatch(
          "deezer",
          track,
          "Deezer could not be matched confidently.",
        ),
        previewUrl: null,
      };
    }

    if (best.score >= DEEZER_MATCH_THRESHOLD) {
      return {
        match: createMatchedMatch("deezer", best.item.link, "deezer_search", best.score),
        previewUrl: best.item.preview ?? null,
      };
    }

    if (best.score >= DEEZER_REVIEW_THRESHOLD) {
      return {
        match: createReviewCandidate(
          "deezer",
          best.item.link,
          "deezer_search_review",
          best.score,
          "Review this Deezer match before publishing.",
        ),
        previewUrl: best.item.preview ?? null,
      };
    }
  } catch {
    return {
      match: createFallbackMatch(
        "deezer",
        track,
        "Deezer search failed; review the suggested result before publishing.",
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

function scoreYouTubeCandidate(track: SpotifyTrackImport, item: {
  channelTitle?: string;
  title?: string;
}) {
  const normalizedTitle = normalizeMatchText(item.title ?? "");
  const normalizedArtist = normalizeMatchText(item.channelTitle ?? "");
  const baseScore = scoreCandidate(track, {
    title: item.title,
    artistName: item.channelTitle,
    albumName: null,
  });

  const officialBoost =
    /official|provided to youtube|topic|audio/.test(normalizedTitle) ||
    normalizedArtist.endsWith(" topic")
      ? 0.08
      : 0;
  const noisePenalty =
    /cover|reaction|nightcore|sped up|slowed|karaoke|live|lyrics/.test(
      normalizedTitle,
    )
      ? 0.18
      : 0;

  return clamp(baseScore + officialBoost - noisePenalty, 0, 1);
}

async function matchYouTubeMusic(
  track: SpotifyTrackImport,
  exactMatch?: MatchCandidate,
) {
  if (exactMatch?.url) {
    return exactMatch;
  }

  try {
    const response = await YouTubeSearchApi.GetListByKeyword(
      `${buildSearchQuery(track, { includeAlbum: true })} official audio`,
      false,
      6,
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
          score: scoreYouTubeCandidate(track, {
            title,
            channelTitle,
          }),
        };
      })
      .sort((left, right) => right.score - left.score)[0];

    if (!best?.item.id) {
      return createFallbackMatch(
        "youtube_music",
        track,
        "YouTube Music could not be matched confidently.",
      );
    }

    const watchUrl = `https://music.youtube.com/watch?v=${best.item.id}`;

    if (best.score >= YOUTUBE_MATCH_THRESHOLD) {
      return createMatchedMatch(
        "youtube_music",
        watchUrl,
        "youtube_search",
        best.score,
      );
    }

    if (best.score >= YOUTUBE_REVIEW_THRESHOLD) {
      return createReviewCandidate(
        "youtube_music",
        watchUrl,
        "youtube_search_review",
        best.score,
        "Review this YouTube Music match before publishing.",
      );
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
  return createMatchedMatch("spotify", track.spotifyTrackUrl, "spotify_track_url", 1);
}

function matchAmazonMusic(
  track: SpotifyTrackImport,
  exactMatch?: MatchCandidate,
) {
  return (
    exactMatch ??
    createFallbackMatch(
      "amazon_music",
      track,
      "Amazon Music could not be resolved exactly; review the search fallback before publishing.",
    )
  );
}

function matchTidal(track: SpotifyTrackImport, exactMatch?: MatchCandidate) {
  return (
    exactMatch ??
    createFallbackMatch(
      "tidal",
      track,
      "TIDAL could not be resolved exactly; review the search fallback before publishing.",
    )
  );
}

export async function buildImportBundle(
  track: SpotifyTrackImport,
): Promise<ImportBundle> {
  const resolvedMatches = await resolveSonglinkMatches(track);

  const [appleResult, deezerResult, youtubeMusicResult] = await Promise.allSettled([
    matchAppleMusic(track, resolvedMatches.apple_music),
    matchDeezer(track, resolvedMatches.deezer),
    matchYouTubeMusic(track, resolvedMatches.youtube_music),
  ]);

  const apple =
    appleResult.status === "fulfilled"
      ? appleResult.value
      : {
          match: createFallbackMatch(
            "apple_music",
            track,
            "Apple Music search failed; review the fallback before publishing.",
          ),
          previewUrl: null,
        };

  const deezer =
    deezerResult.status === "fulfilled"
      ? deezerResult.value
      : {
          match: createFallbackMatch(
            "deezer",
            track,
            "Deezer search failed; review the fallback before publishing.",
          ),
          previewUrl: null,
        };

  const youtubeMusic =
    youtubeMusicResult.status === "fulfilled"
      ? youtubeMusicResult.value
      : createFallbackMatch(
          "youtube_music",
          track,
          "YouTube Music search failed; the fallback opens search results instead.",
        );

  const links = [
    matchSpotify(track),
    apple.match,
    youtubeMusic,
    matchAmazonMusic(track, resolvedMatches.amazon_music),
    deezer.match,
    matchTidal(track, resolvedMatches.tidal),
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
