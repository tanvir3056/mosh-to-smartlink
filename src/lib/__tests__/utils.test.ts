import { describe, expect, test } from "vitest";

import { normalizeSpotifyReleaseUrl, normalizeSpotifyTrackUrl } from "@/lib/utils";

describe("normalizeSpotifyTrackUrl", () => {
  test("accepts localized Spotify track URLs", () => {
    expect(
      normalizeSpotifyTrackUrl(
        "https://open.spotify.com/intl-us/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123",
      ),
    ).toEqual({
      trackId: "4cOdK2wGLETKBW3PvgPWqT",
      url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    });
  });

  test("accepts Spotify embed track URLs", () => {
    expect(
      normalizeSpotifyTrackUrl(
        "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT",
      ),
    ).toEqual({
      trackId: "4cOdK2wGLETKBW3PvgPWqT",
      url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    });
  });
});

describe("normalizeSpotifyReleaseUrl", () => {
  test("accepts localized Spotify album URLs", () => {
    expect(
      normalizeSpotifyReleaseUrl(
        "https://open.spotify.com/intl-us/album/0rAWaAAMfz3d4jpVWI6zn4?si=abc123",
      ),
    ).toEqual({
      id: "0rAWaAAMfz3d4jpVWI6zn4",
      type: "album",
      url: "https://open.spotify.com/album/0rAWaAAMfz3d4jpVWI6zn4",
    });
  });

  test("continues to canonicalize Spotify track URLs", () => {
    expect(
      normalizeSpotifyReleaseUrl(
        "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT",
      ),
    ).toEqual({
      id: "4cOdK2wGLETKBW3PvgPWqT",
      type: "track",
      url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    });
  });
});
