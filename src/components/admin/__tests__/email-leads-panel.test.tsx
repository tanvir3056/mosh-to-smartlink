import { render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { EmailLeadsPanel } from "@/components/admin/email-leads-panel";
import type { EmailLeadSnapshot } from "@/lib/types";

vi.mock("@/app/admin/actions", () => ({
  resyncEmailLeadsFormAction: vi.fn(),
}));

const SNAPSHOT: EmailLeadSnapshot = {
  totalLeads: 3,
  syncedLeads: 1,
  localOnlyLeads: 1,
  failedLeads: 1,
  items: [
    {
      id: "lead-1",
      songId: "song-1",
      pageId: "page-1",
      ownerUserId: "user-1",
      visitId: "visit-1",
      visitorId: "visitor-1",
      email: "fan@example.com",
      normalizedEmail: "fan@example.com",
      source: "ig-story-launch",
      medium: "paid-social",
      campaign: "release",
      content: null,
      term: null,
      referrer: null,
      referrerHost: null,
      browserName: null,
      osName: null,
      deviceType: null,
      country: null,
      city: null,
      ipHash: null,
      userAgent: null,
      connectorProvider: "mailchimp",
      connectorStatus: "synced",
      connectorError: null,
      connectorSyncedAt: "2026-05-31T12:00:00.000Z",
      createdAt: "2026-05-31T10:30:00.000Z",
      updatedAt: "2026-05-31T10:30:00.000Z",
      songTitle: "Paper Lanterns",
      artistName: "Hana Vale",
      username: "hana",
      slug: "paper-lanterns",
    },
  ],
};

describe("EmailLeadsPanel", () => {
  test("matches the Claude compact lead inbox chrome and column order", () => {
    render(<EmailLeadsPanel snapshot={SNAPSHOT} showSummary={false} />);

    const panel = screen.getByRole("region", { name: "Lead inbox" });
    expect(within(panel).getByRole("heading", { name: "Lead inbox" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Re-sync" })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      "/api/admin/email-leads/export",
    );
    expect(within(panel).queryByText("Captured leads")).not.toBeInTheDocument();

    const headers = within(panel).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Email", "Release", "Source", "When", "Sync"]);
    expect(within(panel).queryByRole("columnheader", { name: "Status" })).not.toBeInTheDocument();
  });
});
