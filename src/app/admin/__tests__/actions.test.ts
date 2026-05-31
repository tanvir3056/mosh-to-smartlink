// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();
const mockRedirect = vi.fn();
const mockRequireUserSession = vi.fn();
const mockUpdateSongDraft = vi.fn();
const mockSaveEmailConnectorConfig = vi.fn();
const mockSaveTrackingConfig = vi.fn();
const mockPublishedSongPageTag = vi.fn(() => "published-tag");

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
  createSongImportDraft: vi.fn(),
  deleteSongById: vi.fn(),
  saveEmailConnectorConfig: mockSaveEmailConnectorConfig,
  publishedSongPageTag: mockPublishedSongPageTag,
  saveTrackingConfig: mockSaveTrackingConfig,
  updateSongDraft: mockUpdateSongDraft,
}));

function buildBaseFormData() {
  const formData = new FormData();
  formData.set("song_id", "song_1");
  formData.set("title", "Track");
  formData.set("artist_name", "Artist");
  formData.set("artwork_url", "https://images.example.com/track.jpg");
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

  test("allows publishing with a visible search fallback destination", async () => {
    const { updateSongAction } = await import("@/app/admin/actions");
    const formData = buildBaseFormData();

    formData.set("intent", "publish");
    setServiceFields(formData, "youtube_music", {
      resolutionMode: "search_fallback",
      isVisible: true,
      matchStatus: "search_fallback",
    });

    const result = await updateSongAction({ error: null, success: null }, formData);

    expect(result).toEqual({
      error: null,
      success: "Song page published.",
    });
    expect(mockUpdateSongDraft).toHaveBeenCalledTimes(1);
  });
});

describe("saveTrackingSettingsAction validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
    });
    mockSaveTrackingConfig.mockResolvedValue(undefined);
    mockSaveEmailConnectorConfig.mockResolvedValue(undefined);
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
