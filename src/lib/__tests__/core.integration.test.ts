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
    releaseDate: "2026-03-14",
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
      matchedReleaseDate: "2026-03-14",
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  process.env.POSTGRES_URL = "";
  process.env.LOCAL_DB_PATH = "memory://";
  process.env.ADMIN_EMAIL = "admin@local.test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  process.env.BLOB_READ_WRITE_TOKEN = "";
  Object.assign(globalThis, {
    __ffmDatabaseRuntimePromise: undefined,
  });
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("core data flow", () => {
  test("serializes local write transactions so snapshot refreshes cannot overlap saves", async () => {
    const { dbTransaction } = await import("@/lib/db/driver");
    const firstStarted = createDeferred<void>();
    const releaseFirst = createDeferred<void>();
    const order: string[] = [];

    const firstTransaction = dbTransaction(async () => {
      order.push("first started");
      firstStarted.resolve();
      await releaseFirst.promise;
      order.push("first finished");
    });

    await firstStarted.promise;

    const secondTransaction = dbTransaction(async () => {
      order.push("second started");
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(order).toEqual(["first started"]);

    releaseFirst.resolve();
    await Promise.all([firstTransaction, secondTransaction]);

    expect(order).toEqual(["first started", "first finished", "second started"]);
  });

  test("retries local transactions after stale streaming link foreign key errors", async () => {
    const { dbTransaction } = await import("@/lib/db/driver");
    let attempts = 0;

    await expect(
      dbTransaction(async () => {
        attempts += 1;

        if (attempts === 1) {
          throw new Error(
            'insert or update on table "songs" violates foreign key constraint on table "streaming_links_song_id_fk": Failed SQL statement: insert into streaming_links (...)',
          );
        }

        return "recovered";
      }),
    ).resolves.toBe("recovered");
    expect(attempts).toBe(2);
  });

  test("hydrates local fallback accounts from Blob persistence after a cold start", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";

    let savedSnapshot: string | null = null;
    const putMock = vi.fn(async (_pathname: string, body: string) => {
      savedSnapshot = body;
      return {
        url: "https://blob.example/backstage/local-database-snapshot.json",
        downloadUrl: "https://blob.example/backstage/local-database-snapshot.json",
        pathname: "backstage/local-database-snapshot.json",
        contentType: "application/json",
        contentDisposition: "inline",
      };
    });
    const getMock = vi.fn(async () => {
      if (!savedSnapshot) {
        return null;
      }

      return {
        statusCode: 200,
        stream: new Response(savedSnapshot).body,
        headers: new Headers(),
        blob: {
          url: "https://blob.example/backstage/local-database-snapshot.json",
          downloadUrl: "https://blob.example/backstage/local-database-snapshot.json",
          pathname: "backstage/local-database-snapshot.json",
          contentDisposition: "inline",
          cacheControl: "no-cache",
          uploadedAt: new Date(),
          etag: "snapshot-etag",
          contentType: "application/json",
          size: savedSnapshot.length,
        },
      };
    });

    vi.doMock("@vercel/blob", () => ({
      get: getMock,
      put: putMock,
    }));

    const { createAccountOwner } = await import("@/lib/data");

    await createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
    });

    expect(putMock).toHaveBeenCalled();
    expect(savedSnapshot).toContain(USERNAME);

    Object.assign(globalThis, {
      __ffmDatabaseRuntimePromise: undefined,
    });
    vi.resetModules();
    vi.doMock("@vercel/blob", () => ({
      get: getMock,
      put: putMock,
    }));

    const { getUserByUsername } = await import("@/lib/data");
    await expect(getUserByUsername(USERNAME)).resolves.toMatchObject({
      id: USER_ID,
      username: USERNAME,
    });
  }, 10_000);

  test("ignores orphaned local snapshot links instead of blocking future saves", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";

    let savedSnapshot: string | null = null;
    const corruptSnapshot = JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      tables: {
        app_users: {
          columns: [
            "id",
            "auth_user_id",
            "username",
            "login_email",
            "password_hash",
            "created_at",
            "updated_at",
          ],
          rows: [
            {
              id: USER_ID,
              auth_user_id: null,
              username: USERNAME,
              login_email: LOGIN_EMAIL,
              password_hash: "salt:hash",
              created_at: "2026-06-01T00:00:00.000Z",
              updated_at: "2026-06-01T00:00:00.000Z",
            },
          ],
        },
        streaming_links: {
          columns: [
            "id",
            "song_id",
            "service",
            "url",
            "match_status",
            "review_status",
            "match_source",
            "confidence",
            "notes",
            "confidence_reason",
            "matched_title",
            "matched_artist",
            "matched_album",
            "matched_duration_ms",
            "matched_release_date",
            "matched_isrc",
            "position",
            "is_visible",
          ],
          rows: [
            {
              id: "link_orphan",
              song_id: "song_missing",
              service: "spotify",
              url: "https://open.spotify.com/track/orphan",
              match_status: "matched",
              review_status: "approved",
              match_source: "spotify_track_url",
              confidence: 1,
              notes: null,
              confidence_reason: "Source platform URL.",
              matched_title: "Orphan",
              matched_artist: "Missing Artist",
              matched_album: "Missing Album",
              matched_duration_ms: null,
              matched_release_date: "2026-06-01",
              matched_isrc: null,
              position: 0,
              is_visible: true,
            },
          ],
        },
      },
    });
    const putMock = vi.fn(async (_pathname: string, body: string) => {
      savedSnapshot = body;
      return {
        url: "https://blob.example/backstage/local-database-snapshot.json",
        downloadUrl: "https://blob.example/backstage/local-database-snapshot.json",
        pathname: "backstage/local-database-snapshot.json",
        contentType: "application/json",
        contentDisposition: "inline",
      };
    });
    const getMock = vi.fn(async () => ({
      statusCode: 200,
      stream: new Response(savedSnapshot ?? corruptSnapshot).body,
      headers: new Headers(),
    }));

    vi.doMock("@vercel/blob", () => ({
      get: getMock,
      put: putMock,
    }));

    const { createSongImportDraft, getAdminSongPageBySongId, getUserById } =
      await import("@/lib/data");

    await expect(getUserById(USER_ID)).resolves.toMatchObject({
      id: USER_ID,
      username: USERNAME,
    });

    const songId = await createSongImportDraft(IMPORT_BUNDLE, USERNAME, USER_ID);
    await expect(getAdminSongPageBySongId(songId, USER_ID)).resolves.toMatchObject({
      song: {
        title: "Glass Hearts",
      },
    });

    expect(savedSnapshot).not.toContain("link_orphan");
  }, 10_000);

  test("refreshes Blob-backed local data before write transactions", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";

    let savedSnapshot: string | null = null;
    const putMock = vi.fn(async (_pathname: string, body: string) => {
      savedSnapshot = body;
      return {
        url: "https://blob.example/backstage/local-database-snapshot.json",
        downloadUrl: "https://blob.example/backstage/local-database-snapshot.json",
        pathname: "backstage/local-database-snapshot.json",
        contentType: "application/json",
        contentDisposition: "inline",
      };
    });
    const getMock = vi.fn(async () => {
      if (!savedSnapshot) {
        return null;
      }

      return {
        statusCode: 200,
        stream: new Response(savedSnapshot).body,
        headers: new Headers(),
        blob: {
          url: "https://blob.example/backstage/local-database-snapshot.json",
          downloadUrl: "https://blob.example/backstage/local-database-snapshot.json",
          pathname: "backstage/local-database-snapshot.json",
          contentDisposition: "inline",
          cacheControl: "no-cache",
          uploadedAt: new Date(),
          etag: "snapshot-etag",
          contentType: "application/json",
          size: savedSnapshot.length,
        },
      };
    });

    vi.doMock("@vercel/blob", () => ({
      get: getMock,
      put: putMock,
    }));

    const staleDataRuntime = await import("@/lib/data");

    await staleDataRuntime.createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
    });

    const staleUpdateSongDraft = staleDataRuntime.updateSongDraft;

    Object.assign(globalThis, {
      __ffmDatabaseRuntimePromise: undefined,
    });
    vi.resetModules();
    vi.doMock("@vercel/blob", () => ({
      get: getMock,
      put: putMock,
    }));

    const freshDataRuntime = await import("@/lib/data");
    const songId = await freshDataRuntime.createSongImportDraft(
      IMPORT_BUNDLE,
      USERNAME,
      USER_ID,
    );
    const adminPage = await freshDataRuntime.getAdminSongPageBySongId(
      songId,
      USER_ID,
    );

    expect(adminPage).not.toBeNull();

    await expect(
      staleUpdateSongDraft({
        ownerUserId: USER_ID,
        songId,
        title: "Glass Hearts Updated",
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
          isVisible: link.isVisible,
          matchStatus: link.matchStatus,
          matchSource: link.matchSource,
          confidence: link.confidence,
          notes: link.notes,
        })),
      }),
    ).resolves.toBeUndefined();

    Object.assign(globalThis, {
      __ffmDatabaseRuntimePromise: undefined,
    });
    vi.resetModules();
    vi.doMock("@vercel/blob", () => ({
      get: getMock,
      put: putMock,
    }));

    const verificationRuntime = await import("@/lib/data");
    await expect(
      verificationRuntime.getAdminSongPageBySongId(songId, USER_ID),
    ).resolves.toMatchObject({
      song: {
        title: "Glass Hearts Updated",
      },
    });
  }, 10_000);

  test("imports, publishes, records analytics, and exposes the public page", async () => {
    const {
      createAccountOwner,
      createSongImportDraft,
      deleteSongById,
      getAdminSongPageBySongId,
      getDashboardSnapshot,
      getPublishedSongPage,
      updateSongDraft,
      recordVisit,
      recordClickBySlug,
      getAnalyticsSnapshot,
      saveTrackingConfig,
    } = await import("@/lib/data");

    await createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
    });

    await saveTrackingConfig(USER_ID, {
      siteName: "Backstage",
      metaPixelId: null,
      metaPixelEnabled: false,
      metaTestEventCode: null,
      defaultHeadline: "Out now - stream everywhere.",
      showArtistName: true,
      previewPlayerDefaultEnabled: true,
      leadCaptureDefaultEnabled: true,
    });

    const songId = await createSongImportDraft(IMPORT_BUNDLE, USERNAME, USER_ID);
    const adminPage = await getAdminSongPageBySongId(songId, USER_ID);

    expect(adminPage).not.toBeNull();
    expect(adminPage!.page.headline).toBe("Out now - stream everywhere.");
    expect(adminPage!.emailCapture.enabled).toBe(true);
    expect(adminPage!.song.releaseDate).toBe("2026-03-14");
    expect(
      adminPage!.links.find((link) => link.service === "spotify")?.matchedReleaseDate,
    ).toBe("2026-03-14");
    const dashboard = await getDashboardSnapshot(USER_ID);
    expect(typeof dashboard.songs[0]?.updatedAt).toBe("string");
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
        isVisible: link.service === "tidal" ? false : link.isVisible,
        matchStatus: link.matchStatus,
        matchSource: link.matchSource,
        confidence: link.confidence,
        notes: link.notes,
      })),
    });

    const adminPageAfterSave = await getAdminSongPageBySongId(songId, USER_ID);
    expect(
      adminPageAfterSave?.links.find((link) => link.service === "tidal")?.isVisible,
    ).toBe(false);

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

  test("refuses stale editor saves before inserting streaming links", async () => {
    const { createAccountOwner, updateSongDraft } = await import("@/lib/data");

    await createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
    });

    await expect(
      updateSongDraft({
        ownerUserId: USER_ID,
        songId: "song_missing",
        title: "Missing Song",
        artistName: "North Vale",
        albumName: null,
        artworkUrl: "https://images.example.com/missing.jpg",
        previewUrl: null,
        headline: "Stream now",
        slug: "missing-song",
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
        links: [
          {
            service: "spotify",
            url: "https://open.spotify.com/track/missing",
            matchStatus: "matched",
            matchSource: "spotify_track_url",
            confidence: 1,
            notes: null,
          },
        ],
      }),
    ).rejects.toThrow("This song draft is out of date");
  });

  test("repairs a stale local editor save when recovery metadata is present", async () => {
    const { createAccountOwner, getAdminSongPageBySongId, updateSongDraft } =
      await import("@/lib/data");

    await createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
    });

    await updateSongDraft({
      ownerUserId: USER_ID,
      songId: "song_recovered",
      title: "Recovered Song",
      artistName: "North Vale",
      albumName: "Recovered Album",
      artworkUrl: "https://images.example.com/recovered.jpg",
      previewUrl: null,
      headline: "Stream now",
      slug: "recovered-song",
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
      links: [
        {
          service: "spotify",
          url: "https://open.spotify.com/track/recovered",
          matchStatus: "matched",
          matchSource: "spotify_track_url",
          confidence: 1,
          notes: null,
        },
      ],
      recovery: {
        spotifyTrackId: "recovered",
        spotifyTrackUrl: "https://open.spotify.com/track/recovered",
        releaseYear: 2026,
        releaseDate: "2026-06-01",
        isrc: "RECOVERED1234",
        explicit: false,
        durationMs: 180000,
      },
    });

    const recoveredPage = await getAdminSongPageBySongId("song_recovered", USER_ID);

    expect(recoveredPage).toMatchObject({
      song: {
        title: "Recovered Song",
        spotifyTrackId: "recovered",
      },
      page: {
        slug: "recovered-song",
        status: "published",
      },
    });
    expect(recoveredPage?.links.find((link) => link.service === "spotify")).toMatchObject({
      url: "https://open.spotify.com/track/recovered",
    });
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

  test("re-syncs locally stored email leads after Mailchimp is connected", async () => {
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
      resyncEmailLeadsForOwner,
      saveEmailConnectorConfig,
      updateSongDraft,
    } = await import("@/lib/data");

    await createAccountOwner({
      userId: USER_ID,
      username: USERNAME,
      loginEmail: LOGIN_EMAIL,
      passwordHash: "salt:hash",
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
    await recordEmailCaptureSubmission({
      page: publishedPage!,
      email: "stored-fan@example.com",
      lastVisitId: null,
      context: {
        visitorId: "visitor_stored_lead",
        referrer: null,
        referrerHost: null,
        userAgent: "Mozilla/5.0",
        browserName: "Chrome",
        osName: "macOS",
        deviceType: "mobile",
        country: "NL",
        city: "Amsterdam",
        ipHash: "lead456",
        source: null,
        medium: null,
        campaign: null,
        term: null,
        content: null,
      },
    });

    expect((await getEmailLeadSnapshot(USER_ID)).localOnlyLeads).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();

    await saveEmailConnectorConfig(USER_ID, {
      provider: "mailchimp",
      audienceId: "aud_123",
      defaultTags: "smart-link,release",
      doubleOptIn: false,
      apiKey: "mailchimp-test-us21",
      clearApiKey: false,
    });

    const result = await resyncEmailLeadsForOwner(USER_ID);
    const leadSnapshot = await getEmailLeadSnapshot(USER_ID);

    expect(result).toEqual({
      attempted: 1,
      synced: 1,
      failed: 0,
      skipped: 0,
    });
    expect(leadSnapshot.syncedLeads).toBe(1);
    expect(leadSnapshot.localOnlyLeads).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
