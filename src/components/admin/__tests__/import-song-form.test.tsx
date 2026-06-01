import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ImportSongForm } from "@/components/admin/import-song-form";

vi.mock("@/app/admin/actions", () => ({
  importSpotifyTrackAction: vi.fn(),
}));

describe("ImportSongForm", () => {
  test("uses an accessible label and app-owned validation for the Spotify URL", () => {
    render(<ImportSongForm requestedBy="@warcry" />);

    const input = screen.getByLabelText("Spotify track or album URL");
    const form = input.closest("form");

    expect(input).toHaveAttribute("name", "spotify_url");
    expect(input).toHaveAttribute("aria-describedby", "spotify-url-help");
    expect(form).toHaveAttribute("novalidate");
  });

  test("can fill the Claude example link affordance", async () => {
    const user = userEvent.setup();
    render(<ImportSongForm requestedBy="@warcry" />);

    const input = screen.getByLabelText("Spotify track or album URL");
    await user.click(screen.getByRole("button", { name: "Use an example link" }));

    expect(input).toHaveValue(
      "https://open.spotify.com/track/4n2c9Jt1Fl3O7g4D2nQbXa",
    );
  });
});
