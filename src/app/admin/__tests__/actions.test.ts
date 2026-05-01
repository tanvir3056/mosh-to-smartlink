// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();
const mockRedirect = vi.fn();
const mockRequireUserSession = vi.fn();
const mockUpdateSongDraft = vi.fn();
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
  saveEmailConnectorConfig: vi.fn(),
  publishedSongPageTag: mockPublishedSongPageTag,
  saveTrackingConfig: vi.fn(),
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
});
