// @vitest-environment node

import { afterEach, describe, expect, test, vi } from "vitest";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("fetchSpotifyTrackImport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("imports Spotify album URLs as reviewable release drafts", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.startsWith("https://open.spotify.com/oembed?")) {
        return jsonResponse({
          title: "R.O.T",
          thumbnail_url: "https://i.scdn.co/image/album-art",
        });
      }

      if (url === "https://open.spotify.com/album/0rAWaAAMfz3d4jpVWI6zn4") {
        return new Response(
          [
            '<meta property="og:title" content="R.O.T" />',
            '<meta property="og:description" content="WARCRY! · R.O.T · Album · 2025" />',
            '<meta property="music:album_release_date" content="2025-09-19" />',
            "<title>R.O.T - Album by WARCRY! | Spotify</title>",
          ].join(""),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchSpotifyTrackImport } = await import("@/lib/spotify");

    await expect(
      fetchSpotifyTrackImport(
        "https://open.spotify.com/intl-us/album/0rAWaAAMfz3d4jpVWI6zn4?si=abc",
      ),
    ).resolves.toMatchObject({
      spotifyTrackId: "0rAWaAAMfz3d4jpVWI6zn4",
      spotifyTrackUrl: "https://open.spotify.com/album/0rAWaAAMfz3d4jpVWI6zn4",
      title: "R.O.T",
      artistName: "WARCRY!",
      albumName: "R.O.T",
      artworkUrl: "https://i.scdn.co/image/album-art",
      releaseYear: 2025,
      releaseDate: "2025-09-19",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://open.spotify.com/album/0rAWaAAMfz3d4jpVWI6zn4",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  test("uses track-or-album validation copy for unsupported Spotify URLs", async () => {
    const { fetchSpotifyTrackImport } = await import("@/lib/spotify");

    await expect(
      fetchSpotifyTrackImport("https://open.spotify.com/playlist/abc123"),
    ).rejects.toThrow("Enter a valid Spotify track or album URL.");
  });
});
