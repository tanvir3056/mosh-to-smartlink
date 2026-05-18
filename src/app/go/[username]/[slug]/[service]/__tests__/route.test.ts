// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mockCookies = vi.hoisted(() => vi.fn());
const mockRecordClickBySlug = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/data", () => ({
  recordClickBySlug: mockRecordClickBySlug,
}));

function buildRequest() {
  return new Request("https://backstage.test/go/artist/artist-track/spotify", {
    headers: {
      referer: "https://instagram.com/reel/demo",
    },
  });
}

function buildContext(service = "spotify") {
  return {
    params: Promise.resolve({
      username: "artist",
      slug: "artist-track",
      service,
    }),
  };
}

describe("GET /go/[username]/[slug]/[service]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: vi.fn(),
    });
    mockRecordClickBySlug.mockResolvedValue({
      destinationUrl: "https://open.spotify.com/track/demo",
    });
  });

  test("redirects to the public page when click recording fails", async () => {
    const { GET } = await import("@/app/go/[username]/[slug]/[service]/route");

    mockRecordClickBySlug.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await GET(buildRequest(), buildContext());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://backstage.test/artist/artist-track",
    );
  });
});
