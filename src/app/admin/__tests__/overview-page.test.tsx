import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { DashboardSnapshot } from "@/lib/types";

const { mockGetDashboardSnapshot, mockRequireUserSession } = vi.hoisted(() => ({
  mockGetDashboardSnapshot: vi.fn(),
  mockRequireUserSession: vi.fn(),
}));

vi.mock("@/app/admin/actions", () => ({
  deleteSongAction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
}));

vi.mock("@/lib/data", () => ({
  getDashboardSnapshot: mockGetDashboardSnapshot,
}));

const dashboardSnapshot: DashboardSnapshot = {
  totalSongs: 2,
  publishedSongs: 1,
  draftSongs: 1,
  totalVisits: 250,
  totalClicks: 112,
  topService: { service: "spotify", clicks: 72 },
  daily: [
    { date: "2026-05-17", visits: 80 },
    { date: "2026-05-18", visits: 170 },
  ],
  songs: [
    {
      songId: "song-1",
      ownerUserId: "user-1",
      username: "warcry",
      title: "Release",
      artistName: "WARCRY",
      artworkUrl: "https://i.scdn.co/image/release",
      slug: "release",
      status: "published",
      previewUrl: null,
      updatedAt: "2026-05-18T10:30:00.000Z",
      visitCount: 250,
      clickCount: 112,
    },
    {
      songId: "song-2",
      ownerUserId: "user-1",
      username: "warcry",
      title: "Draft Release",
      artistName: "WARCRY",
      artworkUrl: "https://i.scdn.co/image/draft-release",
      slug: "draft-release",
      status: "draft",
      previewUrl: null,
      updatedAt: "2026-05-19T10:30:00.000Z",
      visitCount: 0,
      clickCount: 0,
    },
  ],
};

describe("admin overview page", () => {
  beforeEach(() => {
    mockRequireUserSession.mockResolvedValue({
      userId: "user-1",
      username: "warcry",
      loginEmail: "warcry@example.com",
    });
    mockGetDashboardSnapshot.mockResolvedValue(dashboardSnapshot);
  });

  test("shows the real username based public path for each release", async () => {
    const { default: AdminOverviewPage } = await import("@/app/admin/(dashboard)/page");

    render(await AdminOverviewPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("/warcry/release")).toBeInTheDocument();
  });

  test("uses unmistakable admin preview links instead of public draft URLs", async () => {
    const { default: AdminOverviewPage } = await import("@/app/admin/(dashboard)/page");

    render(await AdminOverviewPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "Preview Draft Release" })).toHaveAttribute(
      "href",
      "/admin/preview/song-2",
    );
    expect(screen.getByRole("link", { name: "Preview Release" })).toHaveAttribute(
      "href",
      "/admin/preview/song-1",
    );
    expect(screen.queryByRole("link", { name: "Preview /warcry/draft-release" })).toBeNull();
  });

  test("matches the Claude release library filters and filters rows by status", async () => {
    const { default: AdminOverviewPage } = await import("@/app/admin/(dashboard)/page");

    render(
      await AdminOverviewPage({
        searchParams: Promise.resolve({ status: "published" }),
      }),
    );

    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Published" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Drafts" })).toHaveAttribute(
      "href",
      "/admin?status=draft",
    );
    expect(screen.getByText("/warcry/release")).toBeInTheDocument();
    expect(screen.queryByText("Draft Release")).not.toBeInTheDocument();
  });

  test("keeps the first-run overview guidance visible when the library is empty", async () => {
    mockGetDashboardSnapshot.mockResolvedValue({
      totalSongs: 0,
      publishedSongs: 0,
      draftSongs: 0,
      totalVisits: 0,
      totalClicks: 0,
      topService: null,
      daily: [],
      songs: [],
    } satisfies DashboardSnapshot);
    const { default: AdminOverviewPage } = await import("@/app/admin/(dashboard)/page");

    render(await AdminOverviewPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("How a release comes together")).toBeInTheDocument();
    expect(screen.getByText("Quick read")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /import a song/i })).toHaveAttribute(
      "href",
      "/admin/songs/new",
    );
    expect(screen.getByRole("link", { name: /start with import/i })).toHaveAttribute(
      "href",
      "/admin/songs/new",
    );
  });

  test("renders the Claude quick-read service and visits trend signals", async () => {
    const { default: AdminOverviewPage } = await import("@/app/admin/(dashboard)/page");

    render(await AdminOverviewPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Avg. click-through")).toBeInTheDocument();
    expect(screen.getByText("Best service")).toBeInTheDocument();
    expect(screen.getByText("Spotify · 64%")).toBeInTheDocument();
    expect(screen.getByText("Visits trend")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Visits trend over the last 30 days" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Published pages")).not.toBeInTheDocument();
    expect(screen.queryByText("Drafts in review")).not.toBeInTheDocument();
  });
});
