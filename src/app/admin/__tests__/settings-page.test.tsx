import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { EmailConnectorConfig, EmailLeadSnapshot, TrackingConfig } from "@/lib/types";

const {
  mockGetEmailConnectorConfig,
  mockGetEmailLeadSnapshot,
  mockGetUserAvatarUrl,
  mockGetTrackingConfig,
  mockRequireUserSession,
} = vi.hoisted(() => ({
  mockGetEmailConnectorConfig: vi.fn(),
  mockGetEmailLeadSnapshot: vi.fn(),
  mockGetUserAvatarUrl: vi.fn(),
  mockGetTrackingConfig: vi.fn(),
  mockRequireUserSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
}));

vi.mock("@/lib/data", () => ({
  getEmailConnectorConfig: mockGetEmailConnectorConfig,
  getEmailLeadSnapshot: mockGetEmailLeadSnapshot,
  getUserAvatarUrl: mockGetUserAvatarUrl,
  getTrackingConfig: mockGetTrackingConfig,
}));

vi.mock("@/components/admin/tracking-settings-form", () => ({
  TrackingSettingsForm: ({ config, connector }: {
    config: TrackingConfig;
    connector: EmailConnectorConfig;
  }) => (
    <div>
      Integrations form for {config.siteName} ·{" "}
      {connector.hasApiKey ? "Mailchimp connected" : "Local lead storage"}
    </div>
  ),
}));

vi.mock("@/components/admin/email-leads-panel", () => ({
  EmailLeadsPanel: ({ snapshot }: { snapshot: EmailLeadSnapshot }) => (
    <div>Lead inbox panel: {snapshot.totalLeads} total leads</div>
  ),
  EmailLeadsPanelUnavailable: () => <div>Lead inbox unavailable</div>,
}));

const trackingConfig: TrackingConfig = {
  siteName: "Backstage",
  metaPixelId: "123456789012345",
  metaPixelEnabled: true,
  metaTestEventCode: null,
  defaultHeadline: "Out now - stream everywhere.",
  showArtistName: true,
  previewPlayerDefaultEnabled: true,
  leadCaptureDefaultEnabled: false,
};

const connectorConfig: EmailConnectorConfig = {
  provider: "mailchimp",
  audienceId: "audience-1",
  defaultTags: "backstage, fan",
  doubleOptIn: true,
  hasApiKey: true,
  updatedAt: "2026-05-31T12:00:00.000Z",
};

const leadSnapshot: EmailLeadSnapshot = {
  totalLeads: 42,
  recentLeads: 6,
  syncedLeads: 28,
  failedLeads: 2,
  localOnlyLeads: 12,
  syncedLeadRate: 0.67,
  leadConversionRate: 0.14,
  items: [],
};

async function renderSettingsPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  const { default: AdminSettingsPage } = await import("@/app/admin/(dashboard)/settings/page");
  const renderablePage = AdminSettingsPage as unknown as (props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  }) => Promise<React.ReactElement>;

  render(await renderablePage({
    searchParams: Promise.resolve(searchParams),
  }));
}

describe("admin settings page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockRequireUserSession.mockResolvedValue({
      userId: "user-1",
      username: "warcry",
      loginEmail: "warcry@example.com",
    });
    mockGetTrackingConfig.mockResolvedValue(trackingConfig);
    mockGetUserAvatarUrl.mockResolvedValue("https://images.example.com/avatar.jpg");
    mockGetEmailConnectorConfig.mockResolvedValue(connectorConfig);
    mockGetEmailLeadSnapshot.mockResolvedValue(leadSnapshot);
  });

  test("defaults to the Claude-style general settings tab with real account data", async () => {
    await renderSettingsPage();

    const settingsTabs = screen.getByRole("navigation", {
      name: "Settings sections",
    });
    const generalTab = screen.getByRole("link", { name: "General" });
    const siteSettingsSection = screen
      .getByRole("heading", { name: "Site settings" })
      .closest("section");
    const publicDefaultsSection = screen
      .getByRole("heading", { name: "Public defaults" })
      .closest("section");

    expect(settingsTabs).toHaveClass(
      "rounded-[var(--r-sm)]",
      "bg-[var(--app-soft)]",
    );
    expect(generalTab).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(generalTab).toHaveClass("rounded-[var(--r-xs)]", "shadow-[var(--sh-sm)]");
    expect(screen.getByRole("link", { name: "Integrations" })).toHaveAttribute(
      "href",
      "/admin/settings?tab=integrations",
    );
    expect(screen.getByRole("link", { name: "Lead inbox" })).toHaveAttribute(
      "href",
      "/admin/settings?tab=leads",
    );
    expect(screen.getByText("Site settings")).toBeInTheDocument();
    expect(siteSettingsSection).toHaveClass("rounded-[var(--r-lg)]");
    expect(
      within(siteSettingsSection as HTMLElement).getByTestId("settings-section-icon"),
    ).toHaveClass(
      "h-[30px]",
      "w-[30px]",
      "rounded-[var(--r-sm)]",
      "bg-[var(--app-panel-muted)]",
    );
    expect(publicDefaultsSection).toHaveClass("rounded-[var(--r-lg)]");
    expect(screen.getByLabelText("Display name")).toHaveValue("Backstage");
    expect(screen.getByLabelText("Username")).toHaveValue("warcry");
    expect(screen.getByLabelText("Contact email")).toHaveValue("warcry@example.com");
    expect(screen.getByAltText("warcry avatar")).toHaveAttribute(
      "src",
      "https://images.example.com/avatar.jpg",
    );
    expect(mockGetUserAvatarUrl).toHaveBeenCalledWith("user-1");
    expect(screen.getByRole("button", { name: "Upload avatar" })).toBeEnabled();
    expect(screen.getByLabelText("Default headline")).toHaveValue(
      "Out now - stream everywhere.",
    );
    expect(screen.getByLabelText("Show artist name on every page")).toBeChecked();
    expect(screen.getByLabelText("Enable preview player by default")).toBeChecked();
    expect(screen.getByLabelText("Lead capture on by default")).not.toBeChecked();
    expect(screen.queryByText("Appearance")).not.toBeInTheDocument();
    expect(screen.queryByText("Theme mode")).not.toBeInTheDocument();
    expect(screen.getByText("Public defaults")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Show artist name on every page").closest("label"),
    ).toHaveClass("rounded-[var(--r-md)]");
    expect(screen.getByRole("button", { name: "Save settings" })).toHaveAttribute(
      "form",
      "general-settings-form",
    );
    expect(screen.queryByText(/Integrations form/i)).not.toBeInTheDocument();
  });

  test("uses the integrations tab for the existing settings backend form", async () => {
    await renderSettingsPage({ tab: "integrations" });

    expect(screen.getByRole("link", { name: "Integrations" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText(/Integrations form for Backstage/i)).toBeInTheDocument();
    expect(screen.getByText(/Mailchimp connected/i)).toBeInTheDocument();
  });

  test("uses the lead inbox tab for the existing lead snapshot", async () => {
    await renderSettingsPage({ tab: "leads" });

    const totalLeadsMetric = screen.getByTestId("settings-metric-total-leads");

    expect(screen.getByRole("link", { name: "Lead inbox" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(totalLeadsMetric).toHaveClass("rounded-[var(--r-lg)]");
    expect(
      within(totalLeadsMetric as HTMLElement).getByTestId("settings-metric-icon"),
    ).toHaveClass("rounded-[var(--r-sm)]");
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Synced to Mailchimp")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Conversion rate")).toBeInTheDocument();
    expect(screen.getByText("14%")).toBeInTheDocument();
    expect(screen.queryByText("Local only")).not.toBeInTheDocument();
    expect(screen.getByText("Lead inbox panel: 42 total leads")).toBeInTheDocument();
  });

  test("surfaces the saved settings result from the server action redirect", async () => {
    await renderSettingsPage({ saved: "general" });

    expect(screen.getByRole("status", { name: "Settings saved" })).toHaveTextContent(
      "Settings saved.",
    );
  });

  test("surfaces lead sync result state on the lead inbox tab", async () => {
    await renderSettingsPage({ tab: "leads", synced: "1" });

    expect(screen.getByRole("status", { name: "Lead sync refreshed" })).toHaveTextContent(
      "Lead sync refreshed.",
    );
  });
});
