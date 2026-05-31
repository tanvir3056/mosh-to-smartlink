import { describe, expect, test } from "vitest";

import { normalizeSpotifyTrackUrl } from "@/lib/utils";

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
