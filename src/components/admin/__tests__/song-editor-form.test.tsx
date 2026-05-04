import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SongEditorForm } from "@/components/admin/song-editor-form";
import type { SongPageWithLinks } from "@/lib/types";

vi.mock("@/app/admin/actions", () => ({
  updateSongAction: vi.fn(),
  deleteSongAction: vi.fn(),
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
  links: [
    {
      id: "link_spotify",
      songId: "song_1",
      service: "spotify",
      url: "https://open.spotify.com/track/track_1",
      isVisible: true,
      matchStatus: "matched",
      reviewStatus: "approved",
      matchSource: "spotify_track_url",
      confidence: 1,
      notes: null,
      confidenceReason: "Direct Spotify source.",
      matchedTitle: "Track",
      matchedArtist: "Artist",
      matchedAlbum: "Album",
      matchedDurationMs: 180000,
      matchedReleaseDate: "2026-04-30",
      matchedIsrc: "ABC123456789",
      position: 0,
      createdAt: "2026-04-30T00:00:00.000Z",
      updatedAt: "2026-04-30T00:00:00.000Z",
    },
    {
      id: "link_amazon",
      songId: "song_1",
      service: "amazon_music",
      url: "https://music.amazon.com/search/Artist%20Track",
      isVisible: true,
      matchStatus: "search_fallback",
      reviewStatus: "needs_review",
      matchSource: "service_search",
      confidence: null,
      notes: "Fallback",
      confidenceReason: "Not found confidently.",
      matchedTitle: null,
      matchedArtist: null,
      matchedAlbum: null,
      matchedDurationMs: null,
      matchedReleaseDate: null,
      matchedIsrc: null,
      position: 3,
      createdAt: "2026-04-30T00:00:00.000Z",
      updatedAt: "2026-04-30T00:00:00.000Z",
    },
    {
      id: "link_youtube",
      songId: "song_1",
      service: "youtube_music",
      url: null,
      isVisible: true,
      matchStatus: "unresolved",
      reviewStatus: "unresolved",
      matchSource: "manual_review_required",
      confidence: null,
      notes: "Missing",
      confidenceReason: "No destination set yet.",
      matchedTitle: null,
      matchedArtist: null,
      matchedAlbum: null,
      matchedDurationMs: null,
      matchedReleaseDate: null,
      matchedIsrc: null,
      position: 2,
      createdAt: "2026-04-30T00:00:00.000Z",
      updatedAt: "2026-04-30T00:00:00.000Z",
    },
  ],
  tracking: {
    siteName: "Backstage",
    metaPixelId: null,
    metaPixelEnabled: false,
    metaTestEventCode: null,
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

describe("SongEditorForm missing link review", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("keeps the editor stable when hiding a found service", async () => {
    const user = userEvent.setup();

    render(<SongEditorForm page={PAGE} showMissingLinksReview={false} />);

    const showOnPage = screen.getAllByLabelText("Show on public page")[0];
    expect(showOnPage).toBeChecked();

    await user.click(showOnPage);

    expect(showOnPage).not.toBeChecked();
    expect(screen.getByText("Streaming links")).toBeInTheDocument();
  });

  test("keeps the editor stable when hiding an unresolved service", async () => {
    const user = userEvent.setup();

    render(<SongEditorForm page={PAGE} showMissingLinksReview={false} />);

    const showOnPage = screen.getAllByLabelText("Show on public page")[2];
    expect(showOnPage).toBeChecked();

    await user.click(showOnPage);

    expect(showOnPage).not.toBeChecked();
    expect(screen.getByText("Streaming links")).toBeInTheDocument();
  });

  test("keeps the review popup stable when hiding an unresolved service", async () => {
    const user = userEvent.setup();

    render(<SongEditorForm page={PAGE} showMissingLinksReview />);

    const showOnPage = screen.getAllByLabelText("Show on page")[1];
    expect(showOnPage).toBeChecked();

    await user.click(showOnPage);

    expect(showOnPage).not.toBeChecked();
    expect(screen.getByText("Some music service links were not found.")).toBeInTheDocument();
  });
});
