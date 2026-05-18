import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ImportSongForm } from "@/components/admin/import-song-form";

vi.mock("@/app/admin/actions", () => ({
  importSpotifyTrackAction: vi.fn(),
}));

describe("ImportSongForm", () => {
  test("uses an accessible label and app-owned validation for the Spotify URL", () => {
    render(<ImportSongForm requestedBy="@warcry" />);

    const input = screen.getByLabelText("Spotify track URL");
    const form = input.closest("form");

    expect(input).toHaveAttribute("name", "spotify_url");
    expect(input).toHaveAttribute("aria-describedby", "spotify-url-help");
    expect(form).toHaveAttribute("novalidate");
  });
});
