import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { AnalyticsSnapshot } from "@/lib/types";

const { mockGetAnalyticsSnapshot, mockRequireUserSession } = vi.hoisted(() => ({
  mockGetAnalyticsSnapshot: vi.fn(),
  mockRequireUserSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
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
  serviceBreakdown: [{ service: "spotify", clicks: 320 }],
  referrers: [{ label: "Instagram", visits: 620, clicks: 290, ctr: 0.47 }],
  utms: [
    {
      source: "instagram",
      medium: "social",
      campaign: "release-week",
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

describe("admin analytics page launch copy", () => {
  beforeEach(() => {
    mockRequireUserSession.mockResolvedValue({ userId: "user-1", username: "warcry" });
    mockGetAnalyticsSnapshot.mockResolvedValue(analyticsSnapshot);
  });

  test("uses confident product language instead of prototype or competitor references", async () => {
    const { default: AdminAnalyticsPage } = await import("@/app/admin/(dashboard)/analytics/page");

    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByText(/inspired by/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/spotify for artists/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Use first-party traffic, click, source, and device signals to judge release-page performance/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Timeline context shows whether attention is turning into outbound streaming action/i,
      ),
    ).toBeInTheDocument();
  });
});
