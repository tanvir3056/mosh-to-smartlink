import { render, screen, within } from "@testing-library/react";
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
  totalEmailLeads: 149,
  emailLeadRate: 0.12,
  comparison: {
    totalVisitsDeltaRate: 0.12,
    uniqueVisitorsDeltaRate: 0.1,
    totalClicksDeltaRate: 0.08,
    clickThroughRateDelta: -0.013,
  },
  serviceBreakdown: [{ service: "spotify", clicks: 320 }],
  referrers: [
    {
      label: "Instagram",
      visits: 620,
      clicks: 290,
      ctr: 0.47,
      visitsDeltaRate: 0.34,
    },
  ],
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
        "How fans find and move through your release links.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Timeline context shows/i)).not.toBeInTheDocument();
  });

  test("matches the design by exposing a real export action for the selected range", async () => {
    const { default: AdminAnalyticsPage } = await import("@/app/admin/(dashboard)/analytics/page");

    render(
      await AdminAnalyticsPage({
        searchParams: Promise.resolve({ range: "90" }),
      }),
    );

    const exportLink = screen.getByRole("link", { name: "Export" });

    expect(exportLink).toHaveAttribute("href", "/api/admin/analytics/export?range=90");
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });

  test("uses the backend email lead rate in conversion quality", async () => {
    const { default: AdminAnalyticsPage } = await import("@/app/admin/(dashboard)/analytics/page");

    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const leadRateRow = screen.getByText("Joined email list").closest("div");

    expect(leadRateRow).not.toBeNull();
    expect(within(leadRateRow!).getByText("12%")).toBeInTheDocument();
  });

  test("renders backend comparison deltas on the Claude KPI cards", async () => {
    const { default: AdminAnalyticsPage } = await import("@/app/admin/(dashboard)/analytics/page");

    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByLabelText("Visits increased by 12%")).toBeInTheDocument();
    expect(screen.getByLabelText("Unique visitors increased by 10%")).toBeInTheDocument();
    expect(screen.getByLabelText("Service clicks increased by 8%")).toBeInTheDocument();
    expect(screen.getByLabelText("Click-through rate decreased by 1%")).toBeInTheDocument();
  });

  test("uses Claude primitive tokens for analytics panels, metrics, range selector, and export", async () => {
    const { default: AdminAnalyticsPage } = await import("@/app/admin/(dashboard)/analytics/page");

    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Traffic trend" }).closest("section")).toHaveClass(
      "rounded-[var(--r-lg)]",
    );
    expect(screen.getByLabelText("Visits increased by 12%").closest("section")).toHaveClass(
      "rounded-[var(--r-lg)]",
    );
    expect(screen.getByText("30D")).toHaveClass(
      "rounded-[var(--r-xs)]",
      "shadow-[var(--sh-sm)]",
    );
    expect(screen.getByRole("link", { name: "Export" })).toHaveClass(
      "rounded-[var(--r-sm)]",
      "shadow-[var(--sh-xs)]",
    );
    expect(screen.getByRole("img", { name: "Visits and clicks over time" }).closest("div")).toHaveClass(
      "rounded-[var(--r-md)]",
    );
  });

  test("shows each streaming service share from backend click totals", async () => {
    const { default: AdminAnalyticsPage } = await import("@/app/admin/(dashboard)/analytics/page");

    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const streamingServicesPanel = screen
      .getByRole("heading", { name: "Streaming services" })
      .closest("section");

    expect(streamingServicesPanel).not.toBeNull();
    expect(within(streamingServicesPanel!).getByText("Spotify")).toBeInTheDocument();
    expect(within(streamingServicesPanel!).getByText("320 · 63%")).toBeInTheDocument();
  });

  test("uses period-over-period backend source movement in the Signal panel", async () => {
    const { default: AdminAnalyticsPage } = await import("@/app/admin/(dashboard)/analytics/page");

    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const signalPanel = screen.getByRole("heading", { name: "Signal" }).closest("section");

    expect(signalPanel).not.toBeNull();
    expect(within(signalPanel!).getByText("Instagram is up 34%")).toBeInTheDocument();
    expect(
      within(signalPanel!).getByText("620 visits with 47% click-through."),
    ).toBeInTheDocument();
  });
});
