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
  totalSongs: 1,
  publishedSongs: 1,
  draftSongs: 0,
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

    render(await AdminOverviewPage());

    expect(screen.getByText("/warcry/release")).toBeInTheDocument();
  });
});
