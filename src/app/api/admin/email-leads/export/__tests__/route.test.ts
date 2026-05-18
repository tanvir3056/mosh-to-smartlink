// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { EmailLeadListItem } from "@/lib/types";

const mockGetUserSession = vi.hoisted(() => vi.fn());
const mockGetEmailLeadExportRows = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getUserSession: mockGetUserSession,
}));

vi.mock("@/lib/data", () => ({
  getEmailLeadExportRows: mockGetEmailLeadExportRows,
}));

function buildLead(overrides: Partial<EmailLeadListItem> = {}): EmailLeadListItem {
  return {
    id: "lead_1",
    ownerUserId: "user_1",
    songId: "song_1",
    pageId: "page_1",
    visitId: null,
    visitorId: "visitor_1",
    email: "fan@example.com",
    normalizedEmail: "fan@example.com",
    referrer: null,
    referrerHost: "instagram.com",
    source: "instagram",
    medium: "social",
    campaign: "release",
    term: null,
    content: null,
    userAgent: null,
    browserName: null,
    osName: null,
    deviceType: null,
    country: "NL",
    city: "Amsterdam",
    ipHash: null,
    connectorProvider: null,
    connectorStatus: "not_configured",
    connectorError: null,
    connectorSyncedAt: null,
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    songTitle: "Track",
    artistName: "Artist",
    username: "artist",
    slug: "artist-track",
    ...overrides,
  };
}

describe("GET /api/admin/email-leads/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
    });
    mockGetEmailLeadExportRows.mockResolvedValue([buildLead()]);
  });

  test("requires an authenticated admin session", async () => {
    const { GET } = await import("@/app/api/admin/email-leads/export/route");

    mockGetUserSession.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sign in before exporting captured leads.",
    });
  });

  test("exports real CSV and escapes spreadsheet formula cells", async () => {
    const { GET } = await import("@/app/api/admin/email-leads/export/route");

    mockGetEmailLeadExportRows.mockResolvedValueOnce([
      buildLead({
        source: '=IMPORTXML("https://bad.example")',
        songTitle: "Track, Deluxe",
        connectorError: "+sync failed",
      }),
    ]);

    const response = await GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="backstage-email-leads-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(body).toContain('"Captured","Email","Song","Artist","Public path"');
    expect(body).toContain('"Track, Deluxe"');
    expect(body).toContain('"\'=IMPORTXML(""https://bad.example"")"');
    expect(body).toContain('"\'\+sync failed"');
  });
});
