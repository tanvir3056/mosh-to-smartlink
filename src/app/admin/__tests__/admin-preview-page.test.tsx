import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SongPageWithLinks } from "@/lib/types";

const { mockGetAdminSongPageBySongId, mockRequireUserSession } = vi.hoisted(() => ({
  mockGetAdminSongPageBySongId: vi.fn(),
  mockRequireUserSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
}));

vi.mock("@/lib/data", () => ({
  getAdminSongPageBySongId: mockGetAdminSongPageBySongId,
}));

vi.mock("@/components/public/song-page", () => ({
  PublicSongPage: ({
    editorHref,
    mode,
    page,
  }: {
    editorHref?: string;
    mode?: string;
    page: SongPageWithLinks;
  }) => (
    <div
      data-testid="public-song-page"
      data-editor-href={editorHref}
      data-mode={mode}
    >
      {page.song.title}
    </div>
  ),
}));

const PAGE: SongPageWithLinks = {
  song: {
    id: "song_1",
    ownerUserId: "user_1",
    spotifyTrackId: "track_1",
    spotifyTrackUrl: "https://open.spotify.com/track/track_1",
    title: "Track",
    artistName: "Artist",
    albumName: "Album",
    artworkUrl: "https://images.example.com/track.jpg",
    previewUrl: null,
    previewSource: null,
    releaseYear: 2026,
    releaseDate: "2026-04-30",
    isrc: "ABC123456789",
    explicit: false,
    durationMs: 180000,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  },
  page: {
    id: "page_1",
    ownerUserId: "user_1",
    songId: "song_1",
    username: "artist",
    slug: "artist-track",
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

describe("admin preview page", () => {
  beforeEach(() => {
    mockRequireUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
      loginEmail: "artist@example.com",
    });
    mockGetAdminSongPageBySongId.mockResolvedValue(PAGE);
  });

  test("wraps draft pages in the Claude admin preview chrome", async () => {
    const { default: AdminPreviewPage } = await import("@/app/admin/preview/[songId]/page");

    render(
      await AdminPreviewPage({
        params: Promise.resolve({ songId: "song_1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mockGetAdminSongPageBySongId).toHaveBeenCalledWith("song_1", "user_1");
    expect(screen.getByRole("link", { name: "Back to editor" })).toHaveAttribute(
      "href",
      "/admin/songs/song_1",
    );
    expect(screen.getByText("Draft preview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mobile" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Desktop" })).toHaveAttribute(
      "href",
      "/admin/preview/song_1?device=desktop",
    );
    expect(screen.getByRole("button", { name: "Open live" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen.getByText("The release page itself is unchanged - this is the admin preview wrapper."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("public-song-page")).toHaveAttribute("data-mode", "preview");
    expect(screen.getByTestId("public-song-page")).toHaveAttribute(
      "data-editor-href",
      "/admin/songs/song_1",
    );
  });

  test("uses the desktop frame and live link for published pages", async () => {
    mockGetAdminSongPageBySongId.mockResolvedValue({
      ...PAGE,
      page: {
        ...PAGE.page,
        status: "published",
        publishedAt: "2026-04-30T00:00:00.000Z",
      },
    } satisfies SongPageWithLinks);
    const { default: AdminPreviewPage } = await import("@/app/admin/preview/[songId]/page");

    render(
      await AdminPreviewPage({
        params: Promise.resolve({ songId: "song_1" }),
        searchParams: Promise.resolve({ device: "desktop" }),
      }),
    );

    expect(screen.getByText("Live preview")).toBeInTheDocument();
    expect(screen.getByTestId("admin-preview-device-frame")).toHaveAttribute(
      "data-device",
      "desktop",
    );
    expect(screen.getByRole("link", { name: "Open live" })).toHaveAttribute(
      "href",
      "/artist/artist-track",
    );
  });
});
