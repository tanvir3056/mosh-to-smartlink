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
};

const CONNECTOR_CONFIG: EmailConnectorConfig = {
  provider: "mailchimp",
  audienceId: null,
  defaultTags: null,
  doubleOptIn: false,
  hasApiKey: false,
  updatedAt: null,
};

describe("TrackingSettingsForm", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([{ error: null, success: null }, vi.fn(), false]);
  });

  test("treats Meta Pixel ID as a numeric tracking identifier", () => {
    render(
      <TrackingSettingsForm
        config={TRACKING_CONFIG}
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

    const apiKeyInput = screen.getByLabelText("Mailchimp API key");

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

    const apiKeyInput = screen.getByLabelText("Mailchimp API key");
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
});
