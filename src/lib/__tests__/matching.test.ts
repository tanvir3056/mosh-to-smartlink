// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mockGetListByKeyword = vi.fn();

vi.mock("youtube-search-api", () => ({
  default: {
    GetListByKeyword: mockGetListByKeyword,
  },
}));

const TRACK = {
  spotifyTrackId: "3n3Ppam7vgaVa1iaRUc9Lp",
  spotifyTrackUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
  title: "Mr. Brightside",
  artistName: "The Killers",
  albumName: "Hot Fuss",
  artworkUrl: "https://i.scdn.co/image/demo",
  previewUrl: "https://audio.example.com/mr-brightside-preview.mp3",
  releaseYear: 2004,
  explicit: false,
  durationMs: null,
  rawSource: {
    oembed: {},
    ogDescription: "The Killers · Hot Fuss · Song · 2004",
  },
} as const;

const ROT_TRACK = {
  ...TRACK,
  spotifyTrackId: "rot1234567890123456789",
  spotifyTrackUrl: "https://open.spotify.com/track/rot1234567890123456789",
  title: "R.O.T.",
  artistName: "WARCRY!",
  albumName: "R.O.T.",
  rawSource: {
    oembed: {},
    ogDescription: "WARCRY! · R.O.T. · Song · 2025",
  },
} as const;

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("buildImportBundle", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetListByKeyword.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("prefers exact cross-service matches before generic fallbacks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url.startsWith("https://api.song.link/")) {
          return jsonResponse({
            entitiesByUniqueId: {
              "AMAZON_SONG::1": {
                title: "Mr. Brightside",
                artistName: "The Killers",
              },
              "DEEZER_SONG::1": {
                title: "Mr. Brightside",
                artistName: "The Killers",
              },
              "TIDAL_SONG::1": {
                title: "Mr. Brightside",
                artistName: "The Killers",
              },
            },
            linksByPlatform: {
              amazonMusic: {
                entityUniqueId: "AMAZON_SONG::1",
                url: "https://music.amazon.com/albums/1?trackAsin=1",
              },
              deezer: {
                entityUniqueId: "DEEZER_SONG::1",
                url: "https://www.deezer.com/track/953097",
              },
              tidal: {
                entityUniqueId: "TIDAL_SONG::1",
                url: "https://listen.tidal.com/track/23273347",
              },
              spotify: {
                url: TRACK.spotifyTrackUrl,
              },
            },
          });
        }

        if (url.startsWith("https://itunes.apple.com/search?")) {
          return jsonResponse({
            results: [
              {
                artistName: "The Killers",
                collectionName: "Hot Fuss",
                previewUrl: "https://audio.example.com/apple-preview.m4a",
                releaseDate: "2004-06-07T07:00:00Z",
                trackName: "Mr. Brightside",
                trackViewUrl: "https://music.apple.com/us/album/hot-fuss/1?i=2",
              },
            ],
          });
        }

        if (url.startsWith("https://api.deezer.com/search/track")) {
          return jsonResponse({
            data: [],
          });
        }

        throw new Error(`Unexpected fetch call: ${url}`);
      }),
    );

    mockGetListByKeyword.mockResolvedValue({
      items: [
        {
          id: "yt-demo-id",
          title: "The Killers - Mr. Brightside (Official Audio)",
          channelTitle: "The Killers - Topic",
        },
      ],
    });

    const { buildImportBundle } = await import("@/lib/matching");
    const bundle = await buildImportBundle(TRACK);
    const byService = Object.fromEntries(bundle.links.map((link) => [link.service, link]));

    expect(byService.amazon_music?.matchStatus).toBe("matched");
    expect(byService.amazon_music?.matchSource).toBe("songlink_amazonMusic");
    expect(byService.deezer?.matchStatus).toBe("matched");
    expect(byService.deezer?.matchSource).toBe("songlink_deezer");
    expect(byService.tidal?.matchStatus).toBe("matched");
    expect(byService.tidal?.matchSource).toBe("songlink_tidal");
    expect(byService.apple_music?.matchStatus).toBe("matched");
    expect(byService.apple_music?.url).toContain("music.apple.com");
    expect(byService.youtube_music?.matchStatus).toBe("matched");
    expect(byService.youtube_music?.url).toContain("music.youtube.com/watch?v=yt-demo-id");
    expect(bundle.song.previewUrl).toBe(TRACK.previewUrl);
  });

  test("keeps search fallbacks only for services that still cannot be resolved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url.startsWith("https://api.song.link/")) {
          return jsonResponse({
            entitiesByUniqueId: {},
            linksByPlatform: {
              spotify: {
                url: TRACK.spotifyTrackUrl,
              },
            },
          });
        }

        if (url.startsWith("https://itunes.apple.com/search?")) {
          return jsonResponse({
            results: [],
          });
        }

        if (url.startsWith("https://api.deezer.com/search/track")) {
          return jsonResponse({
            data: [],
          });
        }

        throw new Error(`Unexpected fetch call: ${url}`);
      }),
    );

    mockGetListByKeyword.mockResolvedValue({
      items: [],
    });

    const { buildImportBundle } = await import("@/lib/matching");
    const bundle = await buildImportBundle(TRACK);
    const byService = Object.fromEntries(bundle.links.map((link) => [link.service, link]));

    expect(byService.spotify?.matchStatus).toBe("matched");
    expect(byService.apple_music?.matchStatus).toBe("search_fallback");
    expect(byService.youtube_music?.matchStatus).toBe("search_fallback");
    expect(byService.amazon_music?.matchStatus).toBe("search_fallback");
    expect(byService.deezer?.matchStatus).toBe("search_fallback");
    expect(byService.tidal?.matchStatus).toBe("search_fallback");
  });

  test("keeps songlink exact matches for punctuation-heavy titles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url.startsWith("https://api.song.link/")) {
          return jsonResponse({
            entitiesByUniqueId: {
              "AMAZON_SONG::ROT": {
                title: "ROT",
                artistName: "WARCRY",
              },
              "TIDAL_SONG::ROT": {
                title: "ROT",
                artistName: "WARCRY",
              },
            },
            linksByPlatform: {
              amazonMusic: {
                entityUniqueId: "AMAZON_SONG::ROT",
                url: "https://music.amazon.com/albums/rot?trackAsin=rot",
              },
              tidal: {
                entityUniqueId: "TIDAL_SONG::ROT",
                url: "https://listen.tidal.com/track/rot",
              },
              spotify: {
                url: ROT_TRACK.spotifyTrackUrl,
              },
            },
          });
        }

        if (url.startsWith("https://itunes.apple.com/search?")) {
          return jsonResponse({
            results: [],
          });
        }

        if (url.startsWith("https://api.deezer.com/search/track")) {
          return jsonResponse({
            data: [],
          });
        }

        throw new Error(`Unexpected fetch call: ${url}`);
      }),
    );

    mockGetListByKeyword.mockResolvedValue({
      items: [],
    });

    const { buildImportBundle } = await import("@/lib/matching");
    const bundle = await buildImportBundle(ROT_TRACK);
    const byService = Object.fromEntries(bundle.links.map((link) => [link.service, link]));

    expect(byService.amazon_music?.matchStatus).toBe("matched");
    expect(byService.amazon_music?.matchSource).toBe("songlink_amazonMusic");
    expect(byService.tidal?.matchStatus).toBe("matched");
    expect(byService.tidal?.matchSource).toBe("songlink_tidal");
  });

  test("broadens Apple and Deezer search before falling back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url.startsWith("https://api.song.link/")) {
          return jsonResponse({
            entitiesByUniqueId: {},
            linksByPlatform: {
              spotify: {
                url: TRACK.spotifyTrackUrl,
              },
            },
          });
        }

        if (url.includes("https://itunes.apple.com/search?") && url.includes("Hot+Fuss")) {
          return jsonResponse({
            results: [],
          });
        }

        if (
          url.includes("https://itunes.apple.com/search?") &&
          url.includes("The+Killers+Mr.+Brightside")
        ) {
          return jsonResponse({
            results: [
              {
                artistName: "The Killers",
                collectionName: "Hot Fuss",
                previewUrl: "https://audio.example.com/apple-preview.m4a",
                releaseDate: "2004-06-07T07:00:00Z",
                trackName: "Mr. Brightside",
                trackViewUrl: "https://music.apple.com/us/album/hot-fuss/1?i=2",
              },
            ],
          });
        }

        if (url.includes('https://api.deezer.com/search/track?q=artist%3A%22The%20Killers%22')) {
          return jsonResponse({
            data: [],
          });
        }

        if (
          url.includes("https://api.deezer.com/search/track?q=The%20Killers%20Mr.%20Brightside")
        ) {
          return jsonResponse({
            data: [
              {
                album: {
                  title: "Hot Fuss",
                },
                artist: {
                  name: "The Killers",
                },
                link: "https://www.deezer.com/track/953097",
                preview: "https://audio.example.com/deezer-preview.mp3",
                title: "Mr. Brightside",
              },
            ],
          });
        }

        throw new Error(`Unexpected fetch call: ${url}`);
      }),
    );

    mockGetListByKeyword.mockResolvedValue({
      items: [],
    });

    const { buildImportBundle } = await import("@/lib/matching");
    const bundle = await buildImportBundle(TRACK);
    const byService = Object.fromEntries(bundle.links.map((link) => [link.service, link]));

    expect(byService.apple_music?.matchStatus).toBe("matched");
    expect(byService.apple_music?.url).toContain("music.apple.com");
    expect(byService.deezer?.matchStatus).toBe("matched");
    expect(byService.deezer?.url).toContain("deezer.com/track");
  });

  test("broadens YouTube Music search before using fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url.startsWith("https://api.song.link/")) {
          return jsonResponse({
            entitiesByUniqueId: {},
            linksByPlatform: {
              spotify: {
                url: TRACK.spotifyTrackUrl,
              },
            },
          });
        }

        if (url.startsWith("https://itunes.apple.com/search?")) {
          return jsonResponse({
            results: [],
          });
        }

        if (url.startsWith("https://api.deezer.com/search/track")) {
          return jsonResponse({
            data: [],
          });
        }

        throw new Error(`Unexpected fetch call: ${url}`);
      }),
    );

    mockGetListByKeyword.mockImplementation(async (query: string) => {
      if (query.includes("official audio") && query.includes("Hot Fuss")) {
        return {
          items: [
            {
              id: "yt-live-id",
              title: "The Killers - Mr. Brightside (Live)",
              channelTitle: "The Killers Live",
            },
          ],
        };
      }

      return {
        items: [
          {
            id: "yt-topic-id",
            title: "Mr. Brightside",
            channelTitle: "The Killers - Topic",
          },
        ],
      };
    });

    const { buildImportBundle } = await import("@/lib/matching");
    const bundle = await buildImportBundle(TRACK);
    const byService = Object.fromEntries(bundle.links.map((link) => [link.service, link]));

    expect(byService.youtube_music?.matchStatus).toBe("matched");
    expect(byService.youtube_music?.url).toContain("yt-topic-id");
    expect(mockGetListByKeyword).toHaveBeenCalledTimes(4);
  });
});
