import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ServiceList } from "@/components/public/service-list";
import type { SongPageWithLinks } from "@/lib/types";

const PAGE: SongPageWithLinks = {
  song: {
    id: "song_1",
    spotifyTrackId: "track_1",
    spotifyTrackUrl: "https://open.spotify.com/track/track_1",
    title: "Afterlight",
    artistName: "Echo Vale",
    albumName: "Afterlight",
    artworkUrl: "https://images.example.com/afterlight.jpg",
    previewUrl: null,
    previewSource: null,
    releaseYear: 2026,
    explicit: false,
    durationMs: null,
    createdAt: "",
    updatedAt: "",
  },
  page: {
    id: "page_1",
    songId: "song_1",
    slug: "echo-vale-afterlight",
    headline: "Stream now",
    status: "published",
    publishedAt: "",
    unpublishedAt: null,
    createdAt: "",
    updatedAt: "",
  },
  links: [
    {
      id: "link_1",
      songId: "song_1",
      service: "spotify",
      url: "https://open.spotify.com/track/track_1",
      matchStatus: "matched",
      matchSource: "spotify_track_url",
      confidence: 1,
      notes: null,
      position: 0,
      createdAt: "",
      updatedAt: "",
    },
  ],
  tracking: {
    siteName: "Ampveil",
    metaPixelId: null,
    metaPixelEnabled: false,
    metaTestEventCode: null,
  },
};

describe("ServiceList", () => {
  test("renders static service order with pending fallbacks", () => {
    render(<ServiceList page={PAGE} searchString="" />);

    expect(screen.getByTestId("service-link-spotify")).toHaveAttribute(
      "href",
      "/go/echo-vale-afterlight/spotify",
    );
    expect(screen.getByTestId("service-link-apple_music")).toHaveTextContent(
      "Unavailable",
    );
    expect(screen.getByTestId("service-link-youtube_music")).toHaveTextContent(
      "Unavailable",
    );
    expect(screen.getAllByText("Unavailable")).toHaveLength(5);
  });

  test("fires a Meta Pixel custom event on live outbound clicks when enabled", async () => {
    const user = userEvent.setup();
    const fbq = vi.fn();
    window.fbq = fbq;

    render(
      <ServiceList
        page={{
          ...PAGE,
          tracking: {
            ...PAGE.tracking,
            metaPixelEnabled: true,
            metaPixelId: "123456",
          },
        }}
        searchString=""
      />,
    );

    await user.click(screen.getByTestId("service-link-spotify"));

    expect(fbq).toHaveBeenCalledWith("trackCustom", "StreamingServiceClick", {
      service: "spotify",
      song: "Afterlight",
      artist: "Echo Vale",
      slug: "echo-vale-afterlight",
    });
  });
});
