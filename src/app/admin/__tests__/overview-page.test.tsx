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
});
