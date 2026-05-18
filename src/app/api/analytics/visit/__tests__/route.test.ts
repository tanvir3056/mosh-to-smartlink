// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mockCookies = vi.hoisted(() => vi.fn());
const mockGetPublishedSongPage = vi.hoisted(() => vi.fn());
const mockRecordVisit = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/data", () => ({
  getPublishedSongPage: mockGetPublishedSongPage,
  recordVisit: mockRecordVisit,
}));

describe("POST /api/analytics/visit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: vi.fn(),
      set: vi.fn(),
    });
  });

  test("rejects malformed JSON tracking payloads without recording a visit", async () => {
    const { POST } = await import("@/app/api/analytics/visit/route");
    const request = new Request("https://backstage.test/api/analytics/visit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid tracking payload.",
    });
    expect(mockGetPublishedSongPage).not.toHaveBeenCalled();
    expect(mockRecordVisit).not.toHaveBeenCalled();
  });
});
