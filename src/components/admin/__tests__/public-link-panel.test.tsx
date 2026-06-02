import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

describe("PublicLinkPanel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test("shows the actual configured host for shareable links", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://mosh-to-smartlink.vercel.app");
    vi.resetModules();

    const { PublicLinkPanel } = await import("@/components/admin/public-link-panel");

    render(
      <PublicLinkPanel
        username="artist"
        slug="track"
        status="published"
        previewHref="/admin/preview/song_1"
      />,
    );

    expect(
      screen.getByText("mosh-to-smartlink.vercel.app/artist/track"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/backstage\.to/i)).not.toBeInTheDocument();
  });
});
