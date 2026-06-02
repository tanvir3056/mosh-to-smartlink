import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { PublicLinkPanel } from "@/components/admin/public-link-panel";

vi.mock("@/lib/constants", () => ({
  APP_DOMAIN_HINT: "mosh-to-smartlink.vercel.app",
}));

describe("PublicLinkPanel", () => {
  test("shows the actual configured host for shareable links", () => {
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

  test("copies the configured public URL instead of the admin browser origin", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(
      <PublicLinkPanel
        username="artist"
        slug="track"
        status="published"
        previewHref="/admin/preview/song_1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(
      "https://mosh-to-smartlink.vercel.app/artist/track",
    );
  });
});
