import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { TrackingSettingsForm } from "@/components/admin/tracking-settings-form";
import type { EmailConnectorConfig, TrackingConfig } from "@/lib/types";

const mockUseActionState = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useActionState: mockUseActionState,
  };
});

vi.mock("@/app/admin/actions", () => ({
  saveTrackingSettingsAction: vi.fn(),
}));

const TRACKING_CONFIG: TrackingConfig = {
  siteName: "Backstage",
  metaPixelId: null,
  metaPixelEnabled: false,
  metaTestEventCode: null,
  defaultHeadline: "Stream now",
  showArtistName: true,
  previewPlayerDefaultEnabled: true,
  leadCaptureDefaultEnabled: false,
};

const CONNECTOR_CONFIG: EmailConnectorConfig = {
  provider: "mailchimp",
  audienceId: null,
  defaultTags: null,
  doubleOptIn: false,
  hasApiKey: false,
  updatedAt: null,
};

const CONNECTED_CONNECTOR_CONFIG: EmailConnectorConfig = {
  provider: "mailchimp",
  audienceId: "audience-1",
  defaultTags: "backstage, fan",
  doubleOptIn: true,
  hasApiKey: true,
  updatedAt: "2026-05-31T12:00:00.000Z",
};

describe("TrackingSettingsForm", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([{ error: null, success: null }, vi.fn(), false]);
  });

  test("treats Meta Pixel ID as a numeric tracking identifier", () => {
    render(
      <TrackingSettingsForm
        config={{
          ...TRACKING_CONFIG,
          metaPixelEnabled: true,
        }}
        connector={CONNECTOR_CONFIG}
      />,
    );

    const pixelInput = screen.getByLabelText("Meta Pixel ID");

    expect(pixelInput).toHaveAttribute("inputmode", "numeric");
    expect(pixelInput).toHaveAttribute("pattern", "[0-9]*");
    expect(pixelInput).toHaveAttribute("aria-describedby", "meta-pixel-id-help");
    expect(
      screen.getByText("Use digits only. Required before Meta Pixel can be enabled."),
    ).toBeInTheDocument();
    expect(screen.getByText("Local lead storage")).toBeInTheDocument();
    expect(screen.queryByText("Mailchimp only")).not.toBeInTheDocument();
  });

  test("explains the required Mailchimp API key datacenter suffix", () => {
    render(
      <TrackingSettingsForm
        config={TRACKING_CONFIG}
        connector={CONNECTOR_CONFIG}
      />,
    );

    const apiKeyInput = screen.getByLabelText("API key");

    expect(apiKeyInput).toHaveAttribute("aria-describedby", "mailchimp-api-key-help");
    expect(
      screen.getByText("Use the full key, including the datacenter suffix like -us21."),
    ).toBeInTheDocument();
  });

  test("shows inline settings errors returned by the server action", () => {
    mockUseActionState.mockReturnValue([
      {
        error: "Check the Mailchimp settings before saving.",
        success: null,
        fieldErrors: {
          mailchimp_api_key:
            "Mailchimp API keys must end with a datacenter suffix like -us21.",
        },
      },
      vi.fn(),
      false,
    ]);

    render(
      <TrackingSettingsForm
        config={TRACKING_CONFIG}
        connector={CONNECTOR_CONFIG}
      />,
    );

    const apiKeyInput = screen.getByLabelText("API key");
    const error = screen.getByText(
      "Mailchimp API keys must end with a datacenter suffix like -us21.",
    );

    expect(apiKeyInput).toHaveAttribute("aria-invalid", "true");
    expect(apiKeyInput).toHaveAttribute(
      "aria-describedby",
      "mailchimp-api-key-help mailchimp-api-key-error",
    );
    expect(error).toHaveAttribute("id", "mailchimp-api-key-error");
  });

  test("matches the Claude integrations card layout in compact settings", () => {
    const { container } = render(
      <TrackingSettingsForm
        config={{
          ...TRACKING_CONFIG,
          siteName: "Backstage",
          metaPixelId: "318204957761023",
          metaPixelEnabled: true,
        }}
        connector={CONNECTED_CONNECTOR_CONFIG}
        compactHeader
        formId="tracking-settings-form"
        showFooterSubmit={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Meta Pixel" })).toBeInTheDocument();
    expect(screen.getByText("Track conversions for ads.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Enable Meta Pixel" })).toHaveAttribute(
      "name",
      "meta_pixel_enabled",
    );
    expect(screen.getByText("Pixel firing on all live pages")).toBeInTheDocument();
    expect(screen.getByText("Events: PageView, ViewContent, and Lead.")).toBeInTheDocument();
    const connectedBadge = screen.getByText("Connected");
    expect(connectedBadge.className).toContain("var(--app-green");
    expect(connectedBadge.querySelector("[aria-hidden='true']")).toBeInTheDocument();
    expect(
      screen.getByText("Fans confirm via email before they're added."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Public defaults")).not.toBeInTheDocument();
    expect(screen.queryByText("Live page defaults")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Site name")).not.toBeInTheDocument();
    expect(
      container.querySelector('input[type="hidden"][name="site_name"]'),
    ).toHaveAttribute("value", "Backstage");

    const clearKeyButton = screen.getByRole("button", { name: "Clear saved key" });
    expect(clearKeyButton).toHaveAttribute("type", "submit");
    expect(clearKeyButton).toHaveAttribute("name", "mailchimp_clear_api_key");
    expect(clearKeyButton).toHaveAttribute("value", "on");
  });
});
