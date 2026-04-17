// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ImportBundle } from "@/lib/types";

const IMPORT_BUNDLE: ImportBundle = {
  song: {
    spotifyTrackId: "demo-track-id-1234567890ab",
    spotifyTrackUrl: "https://open.spotify.com/track/demo-track-id-1234567890ab",
    title: "Glass Hearts",
    artistName: "North Vale",
    albumName: "Glass Hearts",
    artworkUrl: "https://images.example.com/glass-hearts.jpg",
    previewUrl: "https://audio.example.com/glass-hearts-preview.mp3",
    releaseYear: 2026,
    explicit: false,
    durationMs: null,
    rawSource: {
      oembed: {},
      ogDescription: "North Vale · Glass Hearts · Song · 2026",
    },
  },
  links: [
    {
      service: "spotify",
      url: "https://open.spotify.com/track/demo-track-id-1234567890ab",
      matchStatus: "matched",
      matchSource: "spotify_track_url",
      confidence: 1,
      notes: null,
    },
    {
      service: "apple_music",
      url: "https://music.apple.com/us/album/glass-hearts/1?i=1",
      matchStatus: "matched",
      matchSource: "itunes_search",
      confidence: 0.92,
      notes: null,
    },
    {
      service: "youtube_music",
      url: "https://music.youtube.com/watch?v=demo123",
      matchStatus: "search_fallback",
      matchSource: "youtube_search",
      confidence: 0.66,
      notes: "Review before publishing.",
    },
    {
      service: "amazon_music",
      url: "https://music.amazon.com/search/North%20Vale%20Glass%20Hearts",
      matchStatus: "search_fallback",
      matchSource: "amazon_music_search_fallback",
      confidence: 0.45,
      notes: "Fallback",
    },
    {
      service: "deezer",
      url: "https://www.deezer.com/track/1",
      matchStatus: "matched",
      matchSource: "deezer_search",
      confidence: 0.87,
      notes: null,
    },
    {
      service: "tidal",
      url: "https://listen.tidal.com/search?term=North%20Vale%20Glass%20Hearts",
      matchStatus: "search_fallback",
      matchSource: "tidal_search_fallback",
      confidence: 0.45,
      notes: "Fallback",
    },
  ],
  importStatus: "partial",
};

beforeEach(() => {
  process.env.POSTGRES_URL = "";
  process.env.LOCAL_DB_PATH = "memory://";
  process.env.ADMIN_EMAIL = "admin@local.test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  vi.resetModules();
});

describe("core data flow", () => {
  test("imports, publishes, records analytics, and exposes the public page", async () => {
    const {
      createSongImportDraft,
      deleteSongById,
      getAdminSongPageBySongId,
      getPublishedSongPageBySlug,
      updateSongDraft,
      recordVisit,
      recordClickBySlug,
      getAnalyticsSnapshot,
    } = await import("@/lib/data");

    const songId = await createSongImportDraft(IMPORT_BUNDLE, "admin@local.test");
    const adminPage = await getAdminSongPageBySongId(songId);

    expect(adminPage).not.toBeNull();
    expect(await getPublishedSongPageBySlug(adminPage!.page.slug)).toBeNull();

    await updateSongDraft({
      songId,
      title: adminPage!.song.title,
      artistName: adminPage!.song.artistName,
      albumName: adminPage!.song.albumName,
      artworkUrl: adminPage!.song.artworkUrl,
      previewUrl: adminPage!.song.previewUrl,
      headline: "Stream now",
      slug: adminPage!.page.slug,
      status: "published",
      links: adminPage!.links.map((link) => ({
        service: link.service,
        url: link.url,
        matchStatus: link.matchStatus,
        matchSource: link.matchSource,
        confidence: link.confidence,
        notes: link.notes,
      })),
    });

    const publishedPage = await getPublishedSongPageBySlug(adminPage!.page.slug);

    expect(publishedPage?.song.title).toBe("Glass Hearts");
    expect(publishedPage?.page.status).toBe("published");

    const visitId = await recordVisit({
      songId: publishedPage!.song.id,
      pageId: publishedPage!.page.id,
      path: `/${publishedPage!.page.slug}`,
      context: {
        visitorId: "visitor_1",
        referrer: "https://instagram.com",
        referrerHost: "instagram.com",
        userAgent: "Mozilla/5.0",
        browserName: "Chrome",
        osName: "macOS",
        deviceType: "mobile",
        country: "NL",
        city: "Amsterdam",
        ipHash: "abc123",
        source: "instagram",
        medium: "paid-social",
        campaign: "spring-release",
        term: null,
        content: null,
      },
    });

    const click = await recordClickBySlug({
      slug: publishedPage!.page.slug,
      service: "spotify",
      context: {
        visitorId: "visitor_1",
        referrer: `http://localhost:3000/${publishedPage!.page.slug}`,
        referrerHost: "localhost:3000",
        userAgent: "Mozilla/5.0",
        browserName: "Chrome",
        osName: "macOS",
        deviceType: "mobile",
        country: "NL",
        city: "Amsterdam",
        ipHash: "abc123",
        source: "instagram",
        medium: "paid-social",
        campaign: "spring-release",
        term: null,
        content: null,
      },
      lastVisitId: visitId,
      fallbackAttribution: {
        source: "instagram",
        medium: "paid-social",
        campaign: "spring-release",
        term: null,
        content: null,
      },
    });

    expect(click?.destinationUrl).toContain("spotify.com");

    const analytics = await getAnalyticsSnapshot();
    expect(analytics.totalVisits).toBe(1);
    expect(analytics.uniqueVisitors).toBe(1);
    expect(analytics.totalClicks).toBe(1);
    expect(analytics.referrers[0]?.label).toBe("instagram.com");
    expect(analytics.utms[0]?.source).toBe("instagram");

    const deleted = await deleteSongById(songId);
    expect(deleted.slug).toBe(adminPage!.page.slug);
    expect(await getAdminSongPageBySongId(songId)).toBeNull();
    expect(await getPublishedSongPageBySlug(adminPage!.page.slug)).toBeNull();

    const analyticsAfterDelete = await getAnalyticsSnapshot();
    expect(analyticsAfterDelete.totalVisits).toBe(0);
    expect(analyticsAfterDelete.totalClicks).toBe(0);
  });
});
