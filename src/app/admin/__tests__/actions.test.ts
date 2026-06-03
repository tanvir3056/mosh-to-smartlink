// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();
const mockRedirect = vi.fn();
const mockRequireUserSession = vi.fn();
const mockCreateSongImportDraft = vi.fn();
const mockGetTrackingConfig = vi.fn();
const mockUpdateSongDraft = vi.fn();
const mockResyncEmailLeadsForOwner = vi.fn();
const mockSaveEmailConnectorConfig = vi.fn();
const mockSaveTrackingConfig = vi.fn();
const mockPublishedSongPageTag = vi.fn(() => "published-tag");
const mockFetchSpotifyTrackImport = vi.fn();
const mockBuildImportBundle = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: mockRevalidateTag,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
  signUpUser: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  createSongImportDraft: mockCreateSongImportDraft,
  deleteSongById: vi.fn(),
  getTrackingConfig: mockGetTrackingConfig,
  resyncEmailLeadsForOwner: mockResyncEmailLeadsForOwner,
  saveEmailConnectorConfig: mockSaveEmailConnectorConfig,
  publishedSongPageTag: mockPublishedSongPageTag,
  saveTrackingConfig: mockSaveTrackingConfig,
  updateSongDraft: mockUpdateSongDraft,
}));

vi.mock("@/lib/spotify", () => ({
  fetchSpotifyTrackImport: mockFetchSpotifyTrackImport,
}));

vi.mock("@/lib/matching", () => ({
  buildImportBundle: mockBuildImportBundle,
}));

function buildBaseFormData() {
  const formData = new FormData();
  formData.set("song_id", "song_1");
  formData.set("title", "Track");
  formData.set("artist_name", "Artist");
  formData.set("spotify_track_id", "track_1");
  formData.set("spotify_track_url", "https://open.spotify.com/track/track_1");
  formData.set("artwork_url", "https://images.example.com/track.jpg");
  formData.set("release_year", "2026");
  formData.set("release_date", "2026-04-30");
  formData.set("isrc", "ABC123456789");
  formData.set("duration_ms", "180000");
  formData.set("headline", "Stream now");
  formData.set("slug", "artist-track");
  formData.set("intent", "draft");
  return formData;
}

function setServiceFields(
  formData: FormData,
  service: string,
  options: {
    resolutionMode?: "manual" | "search_fallback";
    url?: string;
    isVisible?: boolean;
    matchStatus?: string;
  },
) {
  if (options.resolutionMode) {
    formData.set(`${service}_resolution_mode`, options.resolutionMode);
  }

  if (options.url !== undefined) {
    formData.set(`${service}_url`, options.url);
  }

  if (options.matchStatus) {
    formData.set(`${service}_match_status`, options.matchStatus);
  }

  if (options.isVisible) {
    formData.set(`${service}_is_visible`, "on");
  }
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns a stable sign-in error when auth throws", async () => {
    const { signInUser } = await import("@/lib/auth");
    const { signInAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("username", "artist");
    formData.set("password", "correct-password");
    vi.mocked(signInUser).mockRejectedValueOnce(new Error("Supabase is unavailable"));

    await expect(
      signInAction({ error: null, success: null }, formData),
    ).resolves.toEqual({
      error: "Sign-in could not be completed. Try again in a moment.",
      success: null,
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test("redirects to admin after successful sign-in", async () => {
    const { signInUser } = await import("@/lib/auth");
    const { signInAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("username", "artist");
    formData.set("password", "correct-password");
    vi.mocked(signInUser).mockResolvedValueOnce({ error: null });

    await signInAction({ error: null, success: null }, formData);

    expect(mockRedirect).toHaveBeenCalledWith("/admin");
  });
});

describe("updateSongAction manual streaming link validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
    });
    mockUpdateSongDraft.mockResolvedValue(undefined);
  });

  test("accepts a visible manual https link", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "youtube_music", {
      resolutionMode: "manual",
      url: "https://music.youtube.com/watch?v=abc",
      isVisible: true,
      matchStatus: "manual",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: null,
      success: "Draft saved.",
    });
    expect(mockUpdateSongDraft).toHaveBeenCalledTimes(1);
  });

  test("passes recovery metadata from the editor form into the save action", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "spotify", {
      url: "https://open.spotify.com/track/track_1",
      isVisible: true,
      matchStatus: "matched",
    });

    await updateSongAction({ error: null, success: null }, formData);

    expect(mockUpdateSongDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        recovery: {
          spotifyTrackId: "track_1",
          spotifyTrackUrl: "https://open.spotify.com/track/track_1",
          releaseYear: 2026,
          releaseDate: "2026-04-30",
          isrc: "ABC123456789",
          explicit: false,
          durationMs: 180000,
        },
      }),
    );
  });

  test("rejects a visible manual link with an invalid string", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "youtube_music", {
      resolutionMode: "manual",
      url: "abc",
      isVisible: true,
      matchStatus: "manual",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: "Check the highlighted service links.",
      success: null,
      fieldErrors: {
        youtube_music: "Enter a valid http or https URL for this service.",
      },
    });
    expect(mockUpdateSongDraft).not.toHaveBeenCalled();
  });

  test("rejects a visible manual link with a non-http protocol", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "amazon_music", {
      resolutionMode: "manual",
      url: "ftp://example.com/track",
      isVisible: true,
      matchStatus: "manual",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: "Check the highlighted service links.",
      success: null,
      fieldErrors: {
        amazon_music: "Enter a valid http or https URL for this service.",
      },
    });
    expect(mockUpdateSongDraft).not.toHaveBeenCalled();
  });

  test("rejects a visible found link edited to an invalid URL", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    formData.set("spotify_original_url", "https://open.spotify.com/track/track_1");
    setServiceFields(formData, "spotify", {
      url: "youtube",
      isVisible: true,
      matchStatus: "matched",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: "Check the highlighted service links.",
      success: null,
      fieldErrors: {
        spotify: "Enter a valid http or https URL for this service.",
      },
    });
    expect(mockUpdateSongDraft).not.toHaveBeenCalled();
  });

  test("does not block hidden manual services with empty URLs", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "tidal", {
      resolutionMode: "manual",
      url: "",
      isVisible: false,
      matchStatus: "unresolved",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: null,
      success: "Draft saved.",
    });
    expect(mockUpdateSongDraft).toHaveBeenCalledTimes(1);
  });

  test("allows hiding a found service without blocking save", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    formData.set("spotify_original_url", "https://open.spotify.com/track/track_1");
    setServiceFields(formData, "spotify", {
      url: "https://open.spotify.com/track/track_1",
      isVisible: false,
      matchStatus: "matched",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: null,
      success: "Draft saved.",
    });
    expect(mockUpdateSongDraft).toHaveBeenCalledTimes(1);
  });

  test("does not require a manual URL in search fallback mode", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "youtube_music", {
      resolutionMode: "search_fallback",
      isVisible: true,
      matchStatus: "search_fallback",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: null,
      success: "Draft saved.",
    });
    expect(mockUpdateSongDraft).toHaveBeenCalledTimes(1);
  });

  test("rejects publishing when no visible destination is ready", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    formData.set("intent", "publish");

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: "Add or show at least one valid streaming destination before publishing.",
      success: null,
    });
    expect(mockUpdateSongDraft).not.toHaveBeenCalled();
  });

  test("refreshes the editor after publishing with a visible search fallback destination", async () => {
    const { publishSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "youtube_music", {
      resolutionMode: "search_fallback",
      isVisible: true,
      matchStatus: "search_fallback",
    });

    const result = await publishSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: null,
      success: "Song page published.",
    });
    expect(mockUpdateSongDraft).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith("/admin/songs/song_1?published=1");
  });

  test("returns a controlled stale draft error when link inserts hit a song foreign key", async () => {
    const { publishSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    setServiceFields(formData, "spotify", {
      url: "https://open.spotify.com/track/track_1",
      isVisible: true,
      matchStatus: "matched",
    });
    mockUpdateSongDraft.mockRejectedValueOnce(
      new Error(
        'insert or update on table "streaming_links" violates foreign key constraint "streaming_links_song_id_fk"',
      ),
    );

    const result = await publishSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: "This song draft is out of date. Reload Backstage and try saving again.",
      success: null,
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe("importSpotifyTrackAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
    });
    mockFetchSpotifyTrackImport.mockResolvedValue({
      spotifyTrackUrl: "https://open.spotify.com/track/track_1",
    });
    mockBuildImportBundle.mockResolvedValue({
      song: {
        spotifyTrackId: "track_1",
      },
      links: [],
      importStatus: "partial",
    });
  });

  test("redirects imported drafts into the editor with confirmation state", async () => {
    const { importSpotifyTrackAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("spotify_url", "https://open.spotify.com/track/track_1");
    mockCreateSongImportDraft.mockResolvedValueOnce("song_1");

    await importSpotifyTrackAction({ error: null, success: null }, formData);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/analytics");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/admin/songs/song_1?imported=1&review=missing-links",
    );
  });

  test("returns a controlled retry message when import link inserts hit a song foreign key", async () => {
    const { importSpotifyTrackAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("spotify_url", "https://open.spotify.com/track/track_1");
    mockCreateSongImportDraft.mockRejectedValueOnce(
      new Error(
        'insert or update on table "songs" violates foreign key constraint on table "streaming_links_song_id_fk": Failed SQL statement: insert into streaming_links (...)',
      ),
    );

    const result = await importSpotifyTrackAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: "Backstage could not finish saving that import. Reload Backstage and try again.",
      success: null,
    });
    expect(result.error).not.toContain("insert into streaming_links");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test("returns an artist-facing message when Spotify lookup fails", async () => {
    const { importSpotifyTrackAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("spotify_url", "https://open.spotify.com/track/track_1");
    mockFetchSpotifyTrackImport.mockRejectedValueOnce(
      new Error("Spotify oEmbed lookup failed."),
    );

    const result = await importSpotifyTrackAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error:
        "Spotify could not be reached. Try again in a moment, or paste a different Spotify track or album link.",
      success: null,
    });
    expect(result.error).not.toContain("oEmbed");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test("uses track-or-album copy when the import URL is missing", async () => {
    const { importSpotifyTrackAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    const result = await importSpotifyTrackAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: "Paste a Spotify track or album URL to start the import.",
      success: null,
    });
    expect(mockFetchSpotifyTrackImport).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe("saveTrackingSettingsAction validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
    });
    mockGetTrackingConfig.mockResolvedValue({
      siteName: "Backstage",
      metaPixelId: null,
      metaPixelEnabled: false,
      metaTestEventCode: null,
      defaultHeadline: "Stream now",
      showArtistName: true,
      previewPlayerDefaultEnabled: true,
      leadCaptureDefaultEnabled: false,
    });
    mockSaveTrackingConfig.mockResolvedValue(undefined);
    mockSaveEmailConnectorConfig.mockResolvedValue(undefined);
  });

  test("saves Claude general settings defaults without touching Mailchimp", async () => {
    const { saveGeneralSettingsAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("site_name", "Hana Vale");
    formData.set("default_headline", "Out now - stream everywhere.");
    formData.set("show_artist_name", "on");
    formData.set("preview_player_default_enabled", "on");
    formData.set("lead_capture_default_enabled", "on");

    const result = await saveGeneralSettingsAction(formData);

    expect(result).toEqual({
      error: null,
      success: "Settings saved.",
    });
    expect(mockSaveTrackingConfig).toHaveBeenCalledWith("user_1", {
      siteName: "Hana Vale",
      metaPixelId: null,
      metaPixelEnabled: false,
      metaTestEventCode: null,
      defaultHeadline: "Out now - stream everywhere.",
      showArtistName: true,
      previewPlayerDefaultEnabled: true,
      leadCaptureDefaultEnabled: true,
    });
    expect(mockSaveEmailConnectorConfig).not.toHaveBeenCalled();
  });

  test("rejects enabling Meta Pixel without a pixel id", async () => {
    const { saveTrackingSettingsAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("site_name", "Backstage");
    formData.set("meta_pixel_enabled", "on");

    const result = await saveTrackingSettingsAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: "Add a valid Meta Pixel ID before enabling tracking.",
      success: null,
      fieldErrors: {
        meta_pixel_id: "Meta Pixel ID is required when tracking is enabled.",
      },
    });
    expect(mockSaveTrackingConfig).not.toHaveBeenCalled();
    expect(mockSaveEmailConnectorConfig).not.toHaveBeenCalled();
  });

  test("rejects a non-numeric Meta Pixel ID", async () => {
    const { saveTrackingSettingsAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("site_name", "Backstage");
    formData.set("meta_pixel_id", "pixel-abc");
    formData.set("meta_pixel_enabled", "on");

    const result = await saveTrackingSettingsAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: "Add a valid Meta Pixel ID before enabling tracking.",
      success: null,
      fieldErrors: {
        meta_pixel_id: "Meta Pixel ID should contain digits only.",
      },
    });
    expect(mockSaveTrackingConfig).not.toHaveBeenCalled();
    expect(mockSaveEmailConnectorConfig).not.toHaveBeenCalled();
  });

  test("saves a valid Meta Pixel configuration", async () => {
    const { saveTrackingSettingsAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("site_name", "Backstage");
    formData.set("meta_pixel_id", "123456789012345");
    formData.set("meta_pixel_enabled", "on");

    const result = await saveTrackingSettingsAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: null,
      success: "Settings saved.",
    });
    expect(mockSaveTrackingConfig).toHaveBeenCalledWith("user_1", {
      siteName: "Backstage",
      metaPixelId: "123456789012345",
      metaPixelEnabled: true,
      metaTestEventCode: null,
      defaultHeadline: "Stream now",
      showArtistName: true,
      previewPlayerDefaultEnabled: true,
      leadCaptureDefaultEnabled: false,
    });
    expect(mockSaveEmailConnectorConfig).toHaveBeenCalledTimes(1);
  });

  test("rejects a Mailchimp API key without a datacenter suffix", async () => {
    const { saveTrackingSettingsAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("site_name", "Backstage");
    formData.set("mailchimp_audience_id", "aud_123");
    formData.set("mailchimp_api_key", "not-a-mailchimp-key");

    const result = await saveTrackingSettingsAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: "Check the Mailchimp settings before saving.",
      success: null,
      fieldErrors: {
        mailchimp_api_key: "Mailchimp API keys must end with a datacenter suffix like -us21.",
      },
    });
    expect(mockSaveTrackingConfig).not.toHaveBeenCalled();
    expect(mockSaveEmailConnectorConfig).not.toHaveBeenCalled();
  });

  test("rejects a new Mailchimp API key without an audience id", async () => {
    const { saveTrackingSettingsAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("site_name", "Backstage");
    formData.set("mailchimp_api_key", "abcd1234-us21");

    const result = await saveTrackingSettingsAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: "Check the Mailchimp settings before saving.",
      success: null,
      fieldErrors: {
        mailchimp_audience_id: "Audience ID is required when adding a Mailchimp API key.",
      },
    });
    expect(mockSaveTrackingConfig).not.toHaveBeenCalled();
    expect(mockSaveEmailConnectorConfig).not.toHaveBeenCalled();
  });

  test("saves valid Mailchimp connector settings", async () => {
    const { saveTrackingSettingsAction } = await import("@/app/admin/actions");
    const formData = new FormData();

    formData.set("site_name", "Backstage");
    formData.set("mailchimp_audience_id", "aud_123");
    formData.set("mailchimp_api_key", "abcd1234-us21");
    formData.set("mailchimp_default_tags", "smart-link, release");
    formData.set("mailchimp_double_opt_in", "on");

    const result = await saveTrackingSettingsAction(
      { error: null, success: null },
      formData,
    );

    expect(result).toEqual({
      error: null,
      success: "Settings saved.",
    });
    expect(mockSaveEmailConnectorConfig).toHaveBeenCalledWith("user_1", {
      provider: "mailchimp",
      audienceId: "aud_123",
      defaultTags: "smart-link, release",
      doubleOptIn: true,
      apiKey: "abcd1234-us21",
      clearApiKey: false,
    });
  });
});

describe("resyncEmailLeadsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
    });
    mockResyncEmailLeadsForOwner.mockResolvedValue({
      attempted: 3,
      synced: 2,
      failed: 1,
      skipped: 0,
    });
  });

  test("runs the lead connector sync and refreshes settings", async () => {
    const { resyncEmailLeadsAction } = await import("@/app/admin/actions");

    const result = await resyncEmailLeadsAction();

    expect(result).toEqual({
      error: null,
      success: "Lead sync refreshed.",
    });
    expect(mockResyncEmailLeadsForOwner).toHaveBeenCalledWith("user_1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/settings");
  });

  test("redirects lead inbox form submissions back with sync feedback state", async () => {
    const { resyncEmailLeadsFormAction } = await import("@/app/admin/actions");

    await resyncEmailLeadsFormAction();

    expect(mockRedirect).toHaveBeenCalledWith("/admin/settings?tab=leads&synced=1");
  });
});
