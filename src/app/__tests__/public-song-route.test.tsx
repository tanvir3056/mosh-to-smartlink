import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { AppSession } from "@/lib/auth";
import type { SongPageWithLinks } from "@/lib/types";

const {
  mockGetAdminSongPageByPublicPathForOwner,
  mockGetPublishedSongPage,
  mockGetUserSession,
  mockNotFound,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetAdminSongPageByPublicPathForOwner: vi.fn(),
  mockGetPublishedSongPage: vi.fn(),
  mockGetUserSession: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockRedirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
  redirect: mockRedirect,
}));

vi.mock("@/lib/auth", () => ({
  getUserSession: mockGetUserSession,
}));

vi.mock("@/lib/data", () => ({
  getAdminSongPageByPublicPathForOwner: mockGetAdminSongPageByPublicPathForOwner,
  getPublishedSongPage: mockGetPublishedSongPage,
}));

vi.mock("@/components/public/song-page", () => ({
  PublicSongPage: ({ page }: { page: SongPageWithLinks }) => (
    <div data-testid="public-song-page">{page.song.title}</div>
  ),
}));

const SESSION: AppSession = {
  userId: "user_1",
  username: "artist",
  loginEmail: "artist@example.com",
  mode: "local",
};

const PAGE: SongPageWithLinks = {
  song: {
    id: "song_1",
    ownerUserId: "user_1",
    spotifyTrackId: "track_1",
    spotifyTrackUrl: "https://open.spotify.com/track/track_1",
    title: "Draft Track",
    artistName: "Artist",
    albumName: "Album",
    artworkUrl: "https://images.example.com/track.jpg",
    previewUrl: null,
    previewSource: null,
    releaseYear: 2026,
    releaseDate: "2026-04-30",
    isrc: null,
    explicit: false,
    durationMs: null,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  },
  page: {
    id: "page_1",
    ownerUserId: "user_1",
    songId: "song_1",
    username: "artist",
    slug: "draft-track",
    headline: "Stream now",
    status: "draft",
    publishedAt: null,
    unpublishedAt: null,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  },
  links: [],
  tracking: {
    siteName: "Backstage",
    metaPixelId: null,
    metaPixelEnabled: false,
    metaTestEventCode: null,
    defaultHeadline: "Stream now",
    showArtistName: true,
    previewPlayerDefaultEnabled: true,
    leadCaptureDefaultEnabled: false,
  },
  emailCapture: {
    enabled: false,
    title: null,
    description: null,
    buttonLabel: null,
    downloadUrl: null,
    downloadLabel: null,
    tag: null,
  },
};

describe("public song route", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAdminSongPageByPublicPathForOwner.mockReset();
    mockGetPublishedSongPage.mockReset();
    mockGetUserSession.mockReset();
    mockNotFound.mockClear();
    mockRedirect.mockClear();
  });

  test("renders published pages through the public output component", async () => {
    mockGetPublishedSongPage.mockResolvedValue(PAGE);

    const { default: PublicSongRoute } = await import("@/app/[username]/[slug]/page");

    render(
      await PublicSongRoute({
        params: Promise.resolve({ username: "artist", slug: "draft-track" }),
      }),
    );

    expect(screen.getByTestId("public-song-page")).toHaveTextContent("Draft Track");
    expect(mockGetUserSession).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test("redirects signed-in owners from their draft public URL to admin preview", async () => {
    mockGetPublishedSongPage.mockResolvedValue(null);
    mockGetUserSession.mockResolvedValue(SESSION);
    mockGetAdminSongPageByPublicPathForOwner.mockResolvedValue(PAGE);

    const { default: PublicSongRoute } = await import("@/app/[username]/[slug]/page");

    await expect(
      PublicSongRoute({
        params: Promise.resolve({ username: "artist", slug: "draft-track" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/preview/song_1");

    expect(mockGetAdminSongPageByPublicPathForOwner).toHaveBeenCalledWith(
      "artist",
      "draft-track",
      "user_1",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/admin/preview/song_1");
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  test("keeps anonymous visitors on the normal not-live path", async () => {
    mockGetPublishedSongPage.mockResolvedValue(null);
    mockGetUserSession.mockResolvedValue(null);

    const { default: PublicSongRoute } = await import("@/app/[username]/[slug]/page");

    await expect(
      PublicSongRoute({
        params: Promise.resolve({ username: "artist", slug: "draft-track" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockGetAdminSongPageByPublicPathForOwner).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
