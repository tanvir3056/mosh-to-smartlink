import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SongEditorForm } from "@/components/admin/song-editor-form";
import { STREAMING_SERVICES } from "@/lib/constants";
import type { SongPageWithLinks } from "@/lib/types";

vi.mock("@/app/admin/actions", () => ({
  publishSongAction: vi.fn(),
  saveSongDraftAction: vi.fn(),
  unpublishSongAction: vi.fn(),
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

const PAGE_WITH_NO_VISIBLE_DESTINATIONS: SongPageWithLinks = {
  ...PAGE,
  links: STREAMING_SERVICES.map((service, index) => ({
    id: `link_${service}`,
    songId: "song_1",
    service,
    url: null,
    isVisible: false,
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
    position: index,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  })),
};

const PAGE_WITH_INVALID_VISIBLE_DESTINATION: SongPageWithLinks = {
  ...PAGE_WITH_NO_VISIBLE_DESTINATIONS,
  links: PAGE_WITH_NO_VISIBLE_DESTINATIONS.links.map((link) =>
    link.service === "spotify"
      ? {
          ...link,
          url: "not-a-url",
          isVisible: true,
          matchStatus: "manual",
          reviewStatus: "needs_review",
        }
      : link,
  ),
};

const PUBLISHED_PAGE: SongPageWithLinks = {
  ...PAGE,
  page: {
    ...PAGE.page,
    status: "published",
    publishedAt: "2026-04-30T00:00:00.000Z",
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
    expect(screen.getByText("Streaming destinations")).toBeInTheDocument();
  });

  test("keeps the editor stable when hiding an unresolved service", async () => {
    const user = userEvent.setup();

    render(<SongEditorForm page={PAGE} showMissingLinksReview={false} />);

    const showOnPage = screen.getAllByLabelText("Show on public page")[2];
    expect(showOnPage).toBeChecked();

    await user.click(showOnPage);

    expect(showOnPage).not.toBeChecked();
    expect(screen.getByText("Streaming destinations")).toBeInTheDocument();
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

  test("shows a launch readiness warning when no visible destination is ready", () => {
    render(
      <SongEditorForm
        page={PAGE_WITH_NO_VISIBLE_DESTINATIONS}
        showMissingLinksReview={false}
      />,
    );

    expect(screen.getByText("Not ready to publish")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Show at least one valid streaming destination before this page goes live.",
      ),
    ).toBeInTheDocument();
  });

  test("does not mark an invalid visible destination as ready to publish", () => {
    render(
      <SongEditorForm
        page={PAGE_WITH_INVALID_VISIBLE_DESTINATION}
        showMissingLinksReview={false}
      />,
    );

    expect(screen.getByText("Not ready to publish")).toBeInTheDocument();
    expect(
      screen.getByText("1 destination still needs attention before launch."),
    ).toBeInTheDocument();
  });

  test("uses a dedicated action for the publish submit control", () => {
    render(<SongEditorForm page={PAGE} showMissingLinksReview={false} />);

    const publishButton = screen.getAllByRole("button", {
      name: "Publish release",
    })[0];

    expect(publishButton).toHaveAttribute("type", "submit");
    expect(publishButton).not.toHaveAttribute("name", "intent");
  });

  test("labels published release actions as save changes instead of publish again", () => {
    render(<SongEditorForm page={PUBLISHED_PAGE} showMissingLinksReview={false} />);

    expect(
      screen.getAllByRole("button", { name: "Save changes" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Publish release" }),
    ).not.toBeInTheDocument();
  });

  test("renders the artwork control as a replace tile without a raw URL label", () => {
    render(<SongEditorForm page={PAGE} showMissingLinksReview={false} />);

    expect(screen.getByText("Replace")).toBeInTheDocument();
    expect(screen.queryByText("Artwork URL")).not.toBeInTheDocument();
  });

  test("matches the Claude command-center section structure", () => {
    render(<SongEditorForm page={PAGE} showMissingLinksReview={false} />);

    expect(screen.getByRole("heading", { name: "Public link" })).toBeInTheDocument();
    expect(
      screen.getByText("Reserved - goes live when you publish."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Fan-facing page")).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Release details" })).toBeInTheDocument();
    expect(
      screen.getByText("The basics fans see on the page."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Streaming destinations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fix missing links" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Lead capture" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Danger zone" })).toBeInTheDocument();
    expect(screen.getByText("Delete this release")).toBeInTheDocument();
    expect(screen.queryByText("Delete this song")).not.toBeInTheDocument();
  });
});
