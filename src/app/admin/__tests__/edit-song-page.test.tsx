import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type {
  DashboardSnapshot,
  EmailConnectorConfig,
  SongPageWithLinks,
} from "@/lib/types";

const {
  mockGetAdminSongPageBySongId,
  mockGetDashboardSnapshot,
  mockGetEmailConnectorConfig,
  mockRequireUserSession,
} = vi.hoisted(() => ({
  mockGetAdminSongPageBySongId: vi.fn(),
  mockGetDashboardSnapshot: vi.fn(),
  mockGetEmailConnectorConfig: vi.fn(),
  mockRequireUserSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
}));

vi.mock("@/lib/data", () => ({
  getAdminSongPageBySongId: mockGetAdminSongPageBySongId,
  getDashboardSnapshot: mockGetDashboardSnapshot,
  getEmailConnectorConfig: mockGetEmailConnectorConfig,
}));

vi.mock("@/components/admin/song-editor-form", () => ({
  SongEditorForm: ({
    emailConnector,
    showImportedDraftConfirmation,
    showMissingLinksReview,
  }: {
    emailConnector: EmailConnectorConfig | null;
    showImportedDraftConfirmation?: boolean;
    showMissingLinksReview?: boolean;
  }) => (
    <div>
      Editor connector: {emailConnector?.hasApiKey ? emailConnector.audienceId : "local"}
      {showImportedDraftConfirmation ? <span>Imported draft confirmation</span> : null}
      {showMissingLinksReview ? <span>Missing links review</span> : null}
    </div>
  ),
}));

const PAGE = {
  song: { id: "song_1" },
  page: { slug: "track" },
  links: [],
} as unknown as SongPageWithLinks;

const DASHBOARD = {
  songs: [],
} as unknown as DashboardSnapshot;

const CONNECTOR: EmailConnectorConfig = {
  provider: "mailchimp",
  audienceId: "audience-1",
  defaultTags: "backstage, fan",
  doubleOptIn: true,
  hasApiKey: true,
  updatedAt: "2026-05-31T12:00:00.000Z",
};

describe("edit song page", () => {
  beforeEach(() => {
    mockRequireUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
      loginEmail: "artist@example.com",
    });
    mockGetAdminSongPageBySongId.mockResolvedValue(PAGE);
    mockGetDashboardSnapshot.mockResolvedValue(DASHBOARD);
    mockGetEmailConnectorConfig.mockResolvedValue(CONNECTOR);
  });

  test("passes the owner email connector into the editor form", async () => {
    const { default: EditSongPage } = await import("@/app/admin/(dashboard)/songs/[songId]/page");

    render(
      await EditSongPage({
        params: Promise.resolve({ songId: "song_1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mockGetEmailConnectorConfig).toHaveBeenCalledWith("user_1");
    expect(screen.getByText("Editor connector: audience-1")).toBeInTheDocument();
  });

  test("passes imported draft and review state into the editor form", async () => {
    const { default: EditSongPage } = await import("@/app/admin/(dashboard)/songs/[songId]/page");

    render(
      await EditSongPage({
        params: Promise.resolve({ songId: "song_1" }),
        searchParams: Promise.resolve({
          imported: "1",
          review: "missing-links",
        }),
      }),
    );

    expect(screen.getByText("Imported draft confirmation")).toBeInTheDocument();
    expect(screen.getByText("Missing links review")).toBeInTheDocument();
  });
});
