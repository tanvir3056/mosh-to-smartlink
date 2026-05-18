// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SongPageWithLinks } from "@/lib/types";

const mockCookies = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());
const mockGetPublishedSongPage = vi.hoisted(() => vi.fn());
const mockRecordEmailCaptureSubmission = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: mockCookies,
  headers: mockHeaders,
}));

vi.mock("@/lib/data", () => ({
  getPublishedSongPage: mockGetPublishedSongPage,
  recordEmailCaptureSubmission: mockRecordEmailCaptureSubmission,
}));

function buildPublishedPage(): SongPageWithLinks {
  return {
    song: {
      id: "song_1",
      ownerUserId: "user_1",
      spotifyTrackId: "spotify_1",
      spotifyTrackUrl: "https://open.spotify.com/track/spotify_1",
      title: "Track",
      artistName: "Artist",
      albumName: null,
      artworkUrl: "https://images.example.com/artwork.jpg",
      previewUrl: null,
      previewSource: null,
      releaseYear: 2026,
      releaseDate: "2026-05-19",
      isrc: null,
      explicit: false,
      durationMs: null,
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z",
    },
    page: {
      id: "page_1",
      ownerUserId: "user_1",
      songId: "song_1",
      username: "artist",
      slug: "artist-track",
      headline: "Stream now",
      status: "published",
      publishedAt: "2026-05-19T00:00:00.000Z",
      unpublishedAt: null,
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z",
    },
    links: [],
    tracking: {
      siteName: "Backstage",
      metaPixelId: null,
      metaPixelEnabled: false,
      metaTestEventCode: null,
    },
    emailCapture: {
      enabled: true,
      title: "Join the list",
      description: "Get updates.",
      buttonLabel: "Join",
      downloadUrl: "https://downloads.example.com/track.mp3",
      downloadLabel: "Download",
      tag: "track-download",
    },
  };
}

describe("captureEmailLeadAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: vi.fn(),
      set: vi.fn(),
    });
    mockHeaders.mockResolvedValue(new Headers());
    mockGetPublishedSongPage.mockResolvedValue(buildPublishedPage());
    mockRecordEmailCaptureSubmission.mockResolvedValue({
      syncStatus: "not_configured",
    });
  });

  test("returns a recoverable error when the lead cannot be recorded", async () => {
    const { captureEmailLeadAction } = await import("@/app/public-actions");
    const formData = new FormData();

    formData.set("email", "fan@example.com");
    mockRecordEmailCaptureSubmission.mockRejectedValueOnce(new Error("database down"));

    const result = await captureEmailLeadAction(
      {
        username: "artist",
        slug: "artist-track",
        searchString: "utm_source=instagram",
      },
      {
        error: null,
        success: null,
        downloadUrl: null,
        downloadLabel: null,
      },
      formData,
    );

    expect(result).toEqual({
      error: "We could not save that email right now. Please try again.",
      success: null,
      downloadUrl: null,
      downloadLabel: null,
    });
  });
});
