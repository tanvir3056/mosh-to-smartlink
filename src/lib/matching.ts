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

type YouTubeSearchItem = {
  channelTitle?: string;
  id?: string;
  shortBylineText?: string;
  title?: string;
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

function uniqueQueries(queries: Array<string | null | undefined>) {
  return [
    ...new Set(
      queries
        .map((query) => query?.trim())
        .filter((query): query is string => Boolean(query)),
    ),
  ];
}

function getYouTubeItems(value: unknown) {
  return Array.isArray(value) ? (value as YouTubeSearchItem[]) : [];
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

function scoreResolverEntity(
  track: SpotifyTrackImport,
  entity: SonglinkEntity | undefined,
) {
  const titleScore = scoreTextSimilarity(track.title, entity?.title ?? "");
  const artistScore = scoreTextSimilarity(track.artistName, entity?.artistName ?? "");

  return {
    titleScore,
    artistScore,
    weightedScore: titleScore * 0.72 + artistScore * 0.28,
  };
}

function isResolverEntityCompatible(
  track: SpotifyTrackImport,
  entity: SonglinkEntity | undefined,
  service: StreamingService,
) {
  if (!entity?.title || !entity.artistName) {
    return true;
  }

  const { titleScore, artistScore, weightedScore } = scoreResolverEntity(track, entity);

  if (titleScore >= 0.98 && artistScore >= 0.68) {
    return true;
  }

  if (titleScore >= 0.92 && artistScore >= 0.82) {
    return true;
  }

  if (
    (service === "amazon_music" || service === "tidal") &&
    titleScore >= 0.86 &&
    artistScore >= 0.72
  ) {
    return true;
  }

  return weightedScore >= 0.72;
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

function scoreSonglinkEntityForMatch(
  track: SpotifyTrackImport,
  entity: SonglinkEntity | undefined,
) {
  if (!entity) {
    return 0.96;
  }

  return Math.max(scoreResolverEntity(track, entity).weightedScore, 0.82);
}

async function resolveSonglinkMatchesFromUrl(
  track: SpotifyTrackImport,
  sourceUrl: string,
  sourceLabel: string,
) {
  try {
    const payload = await fetchJsonWithTimeout<SonglinkResponse>(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(sourceUrl)}`,
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

      if (
        service !== "spotify" &&
        !isResolverEntityCompatible(track, entity, service)
      ) {
        continue;
      }

      matches[service] = createMatchedMatch(
        service,
        link.url,
        sourceLabel === "spotify"
          ? `songlink_${platform}`
          : `songlink_${platform}_via_${sourceLabel}`,
        scoreSonglinkEntityForMatch(track, entity),
      );
    }

    return matches;
  } catch {
    return {} as Partial<Record<StreamingService, MatchCandidate>>;
  }
}

async function resolveSonglinkMatches(track: SpotifyTrackImport) {
  return resolveSonglinkMatchesFromUrl(track, track.spotifyTrackUrl, "spotify");
}

async function enrichResolvedMatches(
  track: SpotifyTrackImport,
  baseMatches: Partial<Record<StreamingService, MatchCandidate>>,
  seedMatches: MatchCandidate[],
) {
  const enrichmentSeeds = seedMatches.filter(
    (
      candidate,
    ): candidate is MatchCandidate & {
      url: string;
    } =>
      candidate.matchStatus === "matched" &&
      typeof candidate.url === "string" &&
      candidate.service !== "spotify",
  );

  if (enrichmentSeeds.length === 0) {
    return baseMatches;
  }

  const enrichmentPayloads = await Promise.allSettled(
    enrichmentSeeds.map((candidate) =>
      resolveSonglinkMatchesFromUrl(track, candidate.url, candidate.service),
    ),
  );
  const mergedMatches = { ...baseMatches };

  for (const payload of enrichmentPayloads) {
    if (payload.status !== "fulfilled") {
      continue;
    }

    for (const [service, match] of Object.entries(payload.value) as Array<
      [StreamingService, MatchCandidate | undefined]
    >) {
      if (!match?.url) {
        continue;
      }

      const existing = mergedMatches[service];

      if (!existing || existing.matchStatus !== "matched") {
        mergedMatches[service] = match;
      }
    }
  }

  return mergedMatches;
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

  try {
    const evaluateBest = (items: AppleSearchItem[]) =>
      items
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

    const primaryQuery = new URLSearchParams({
      term: buildSearchQuery(track, { includeAlbum: true }),
      entity: "song",
      limit: "8",
    });
    const primaryPayload = await fetchJsonWithTimeout<{
      results?: AppleSearchItem[];
    }>(`https://itunes.apple.com/search?${primaryQuery}`);

    let best = evaluateBest(primaryPayload.results ?? []);

    if (!best?.item.trackViewUrl || best.score < APPLE_MATCH_THRESHOLD) {
      const secondaryQueries = uniqueQueries([
        buildSearchQuery(track),
        `${track.title} ${track.artistName}`,
      ]);
      const secondaryPayloads = await Promise.allSettled(
        secondaryQueries.map((term) =>
          fetchJsonWithTimeout<{
            results?: AppleSearchItem[];
          }>(
            `https://itunes.apple.com/search?${new URLSearchParams({
              term: term ?? "",
              entity: "song",
              limit: "8",
            })}`,
          ),
        ),
      );
      const dedupedItems = new Map<string, AppleSearchItem>();

      for (const item of primaryPayload.results ?? []) {
        if (item.trackViewUrl) {
          dedupedItems.set(item.trackViewUrl, item);
        }
      }

      for (const payload of secondaryPayloads) {
        if (payload.status !== "fulfilled") {
          continue;
        }

        for (const item of payload.value.results ?? []) {
          if (item.trackViewUrl) {
            dedupedItems.set(item.trackViewUrl, item);
          }
        }
      }

      best = evaluateBest([...dedupedItems.values()]);
    }

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

  try {
    const evaluateBest = (items: DeezerSearchItem[]) =>
      items
        .map((item) => ({
          item,
          score: scoreCandidate(track, {
            title: item.title,
            artistName: item.artist?.name,
            albumName: item.album?.title,
          }),
        }))
        .sort((left, right) => right.score - left.score)[0];

    const primaryPayload = await fetchJsonWithTimeout<{
      data?: DeezerSearchItem[];
    }>(
      `https://api.deezer.com/search/track?q=${encodeURIComponent(
        `artist:"${track.artistName}" track:"${track.title}"`,
      )}`,
    );

    let best = evaluateBest(primaryPayload.data ?? []);

    if (!best?.item.link || best.score < DEEZER_MATCH_THRESHOLD) {
      const secondaryQueries = uniqueQueries([
        buildSearchQuery(track, { includeAlbum: true }),
        buildSearchQuery(track),
      ]);
      const secondaryPayloads = await Promise.allSettled(
        secondaryQueries.map((query) =>
          fetchJsonWithTimeout<{
            data?: DeezerSearchItem[];
          }>(
            `https://api.deezer.com/search/track?q=${encodeURIComponent(query ?? "")}`,
          ),
        ),
      );
      const dedupedItems = new Map<string, DeezerSearchItem>();

      for (const item of primaryPayload.data ?? []) {
        if (item.link) {
          dedupedItems.set(item.link, item);
        }
      }

      for (const payload of secondaryPayloads) {
        if (payload.status !== "fulfilled") {
          continue;
        }

        for (const item of payload.value.data ?? []) {
          if (item.link) {
            dedupedItems.set(item.link, item);
          }
        }
      }

      best = evaluateBest([...dedupedItems.values()]);
    }

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
  const normalizedSource = `${normalizedTitle} ${normalizedArtist}`.trim();
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
      normalizedSource,
    )
      ? 0.24
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
    const scoreItems = (items: YouTubeSearchItem[]) =>
      items
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

    const primaryResponse = await YouTubeSearchApi.GetListByKeyword(
      `${buildSearchQuery(track, { includeAlbum: true })} official audio`,
      false,
      6,
      [{ type: "video" }],
    );

    let best = scoreItems(getYouTubeItems(primaryResponse.items));

    if (!best?.item.id || best.score < YOUTUBE_MATCH_THRESHOLD) {
      const secondaryQueries = uniqueQueries([
        `${buildSearchQuery(track)} official audio`,
        `${buildSearchQuery(track)} topic`,
        buildSearchQuery(track),
      ]);
      const secondaryResponses = await Promise.allSettled(
        secondaryQueries.map((query) =>
          YouTubeSearchApi.GetListByKeyword(query, false, 8, [{ type: "video" }]),
        ),
      );
      const dedupedItems = new Map<string, YouTubeSearchItem>();

      for (const item of getYouTubeItems(primaryResponse.items)) {
        if (typeof item.id === "string") {
          dedupedItems.set(item.id, item);
        }
      }

      for (const response of secondaryResponses) {
        if (response.status !== "fulfilled") {
          continue;
        }

        for (const item of getYouTubeItems(response.value.items)) {
          if (typeof item.id === "string") {
            dedupedItems.set(item.id, item);
          }
        }
      }

      best = scoreItems([...dedupedItems.values()]);
    }

    const bestId = typeof best?.item.id === "string" ? best.item.id : null;

    if (!bestId) {
      return createFallbackMatch(
        "youtube_music",
        track,
        "YouTube Music could not be matched confidently.",
      );
    }

    const watchUrl = `https://music.youtube.com/watch?v=${bestId}`;

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
  const initialResolvedMatches = await resolveSonglinkMatches(track);

  const [appleResult, deezerResult, youtubeMusicResult] = await Promise.allSettled([
    matchAppleMusic(track, initialResolvedMatches.apple_music),
    matchDeezer(track, initialResolvedMatches.deezer),
    matchYouTubeMusic(track, initialResolvedMatches.youtube_music),
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

  const resolvedMatches = await enrichResolvedMatches(track, initialResolvedMatches, [
    apple.match,
    deezer.match,
    youtubeMusic,
  ]);

  const links = [
    matchSpotify(track),
    resolvedMatches.apple_music ?? apple.match,
    resolvedMatches.youtube_music ?? youtubeMusic,
    matchAmazonMusic(track, resolvedMatches.amazon_music),
    resolvedMatches.deezer ?? deezer.match,
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
