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

const USER_ID = "user_test_owner";
const USERNAME = "north-vale";
const LOGIN_EMAIL = "north-vale@users.backstage.local";

beforeEach(() => {
  process.env.POSTGRES_URL = "";
  process.env.LOCAL_DB_PATH = "memory://";
  process.env.ADMIN_EMAIL = "admin@local.test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  Object.assign(globalThis, {
    __ffmDatabaseRuntimePromise: undefined,
  });
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("core data flow", () => {
  test("imports, publishes, records analytics, and exposes the public page", async () => {
    const {
      createAccountOwner,
      createSongImportDraft,
      deleteSongById,
      getAdminSongPageBySongId,
      getPublishedSongPage,
      updateSongDraft,
      recordVisit,
      recordClickBySlug,
      getAnalyticsSnapshot,
    } = await import("@/lib/data");

    await createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
    });

    const songId = await createSongImportDraft(IMPORT_BUNDLE, USERNAME, USER_ID);
    const adminPage = await getAdminSongPageBySongId(songId, USER_ID);

    expect(adminPage).not.toBeNull();
    expect(await getPublishedSongPage(USERNAME, adminPage!.page.slug)).toBeNull();

    await updateSongDraft({
      ownerUserId: USER_ID,
      songId,
      title: adminPage!.song.title,
      artistName: adminPage!.song.artistName,
      albumName: adminPage!.song.albumName,
      artworkUrl: adminPage!.song.artworkUrl,
      previewUrl: adminPage!.song.previewUrl,
      headline: "Stream now",
      slug: adminPage!.page.slug,
      status: "published",
      emailCapture: {
        enabled: false,
        title: null,
        description: null,
        buttonLabel: null,
        downloadUrl: null,
        downloadLabel: null,
        tag: null,
      },
      links: adminPage!.links.map((link) => ({
        service: link.service,
        url: link.url,
        matchStatus: link.matchStatus,
        matchSource: link.matchSource,
        confidence: link.confidence,
        notes: link.notes,
      })),
    });

    const publishedPage = await getPublishedSongPage(USERNAME, adminPage!.page.slug);

    expect(publishedPage?.song.title).toBe("Glass Hearts");
    expect(publishedPage?.page.status).toBe("published");

    const visitId = await recordVisit({
      ownerUserId: USER_ID,
      songId: publishedPage!.song.id,
      pageId: publishedPage!.page.id,
      path: `/${USERNAME}/${publishedPage!.page.slug}`,
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
      username: USERNAME,
      slug: publishedPage!.page.slug,
      service: "spotify",
      context: {
        visitorId: "visitor_1",
        referrer: `http://localhost:3000/${USERNAME}/${publishedPage!.page.slug}`,
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

    const analytics = await getAnalyticsSnapshot(USER_ID);
    expect(analytics.totalVisits).toBe(1);
    expect(analytics.uniqueVisitors).toBe(1);
    expect(analytics.totalClicks).toBe(1);
    expect(analytics.clickThroughRate).toBe(1);
    expect(analytics.referrers[0]?.label).toBe("instagram.com");
    expect(analytics.referrers[0]?.clicks).toBe(0);
    expect(analytics.utms[0]?.source).toBe("instagram");
    expect(analytics.devices[0]?.label).toBe("mobile");
    expect(analytics.daily).toHaveLength(30);

    const deleted = await deleteSongById(songId, USER_ID);
    expect(deleted.slug).toBe(adminPage!.page.slug);
    expect(await getAdminSongPageBySongId(songId, USER_ID)).toBeNull();
    expect(await getPublishedSongPage(USERNAME, adminPage!.page.slug)).toBeNull();

    const analyticsAfterDelete = await getAnalyticsSnapshot(USER_ID);
    expect(analyticsAfterDelete.totalVisits).toBe(0);
    expect(analyticsAfterDelete.totalClicks).toBe(0);
  });

  test("captures email leads and syncs them to Mailchimp when configured", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const {
      createAccountOwner,
      createSongImportDraft,
      getAdminSongPageBySongId,
      getEmailLeadSnapshot,
      getPublishedSongPage,
      recordEmailCaptureSubmission,
      saveEmailConnectorConfig,
      updateSongDraft,
    } = await import("@/lib/data");

    await createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
    });

    await saveEmailConnectorConfig(USER_ID, {
      provider: "mailchimp",
      audienceId: "aud_123",
      defaultTags: "smart-link,release",
      doubleOptIn: false,
      apiKey: "mailchimp-test-us21",
      clearApiKey: false,
    });

    const songId = await createSongImportDraft(IMPORT_BUNDLE, USERNAME, USER_ID);
    const adminPage = await getAdminSongPageBySongId(songId, USER_ID);

    await updateSongDraft({
      ownerUserId: USER_ID,
      songId,
      title: adminPage!.song.title,
      artistName: adminPage!.song.artistName,
      albumName: adminPage!.song.albumName,
      artworkUrl: adminPage!.song.artworkUrl,
      previewUrl: adminPage!.song.previewUrl,
      headline: "Stream now",
      slug: adminPage!.page.slug,
      status: "published",
      emailCapture: {
        enabled: true,
        title: "Download the song for free",
        description: "Join the list and unlock the track.",
        buttonLabel: "Get the download",
        downloadUrl: "https://downloads.example.com/glass-hearts.mp3",
        downloadLabel: "Download Glass Hearts",
        tag: "glass-hearts-download",
      },
      links: adminPage!.links.map((link) => ({
        service: link.service,
        url: link.url,
        matchStatus: link.matchStatus,
        matchSource: link.matchSource,
        confidence: link.confidence,
        notes: link.notes,
      })),
    });

    const publishedPage = await getPublishedSongPage(USERNAME, adminPage!.page.slug);
    const result = await recordEmailCaptureSubmission({
      page: publishedPage!,
      email: "fan@example.com",
      lastVisitId: null,
      context: {
        visitorId: "visitor_lead",
        referrer: "https://instagram.com/reel/demo",
        referrerHost: "instagram.com",
        userAgent: "Mozilla/5.0",
        browserName: "Chrome",
        osName: "macOS",
        deviceType: "mobile",
        country: "NL",
        city: "Amsterdam",
        ipHash: "lead123",
        source: "instagram",
        medium: "organic-social",
        campaign: "download-push",
        term: null,
        content: "reel-1",
      },
    });

    expect(result.lead.email).toBe("fan@example.com");
    expect(result.lead.normalizedEmail).toBe("fan@example.com");
    expect(result.syncStatus).toBe("synced");

    const leadSnapshot = await getEmailLeadSnapshot(USER_ID);
    expect(leadSnapshot.totalLeads).toBe(1);
    expect(leadSnapshot.items[0]?.username).toBe(USERNAME);
    expect(leadSnapshot.items[0]?.slug).toBe(adminPage!.page.slug);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as unknown as Array<
      [unknown, { body?: BodyInit | null }?]
    >;
    const memberCall = calls[0];
    const tagCall = calls[1];

    expect(memberCall).toBeDefined();
    expect(tagCall).toBeDefined();

    if (!memberCall || !tagCall) {
      throw new Error("Expected Mailchimp sync calls to be made.");
    }

    expect(String(memberCall[0])).toContain("/lists/aud_123/members/");
    expect(String(tagCall[0])).toContain("/tags");
    expect(JSON.parse(String(tagCall[1]?.body))).toEqual({
      tags: [
        { name: "smart-link", status: "active" },
        { name: "release", status: "active" },
        { name: "glass-hearts-download", status: "active" },
      ],
    });
  });
});
