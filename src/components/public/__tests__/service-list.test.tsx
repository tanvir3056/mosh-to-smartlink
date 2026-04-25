import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ServiceList } from "@/components/public/service-list";
import type { SongPageWithLinks } from "@/lib/types";

const PAGE: SongPageWithLinks = {
  song: {
    id: "song_1",
    ownerUserId: "user_1",
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
    ownerUserId: "user_1",
    songId: "song_1",
    username: "echo-vale",
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

describe("ServiceList", () => {
  test("renders only ready services on the live page", () => {
    render(<ServiceList page={PAGE} searchString="" />);

    expect(screen.getByTestId("service-link-spotify")).toHaveAttribute(
      "href",
      "/go/echo-vale/echo-vale-afterlight/spotify",
    );
    expect(screen.queryByTestId("service-link-apple_music")).toBeNull();
    expect(screen.queryByTestId("service-link-youtube_music")).toBeNull();
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
      username: "echo-vale",
      slug: "echo-vale-afterlight",
    });
  });
});
