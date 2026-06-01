import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ImportSongForm } from "@/components/admin/import-song-form";

vi.mock("@/app/admin/actions", () => ({
  importSpotifyTrackAction: vi.fn(async () => ({ error: null, success: null })),
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

  test("matches the Claude form hierarchy with the helper copy below the URL field", () => {
    render(<ImportSongForm requestedBy="@warcry" />);

    const input = screen.getByLabelText("Spotify track or album URL");
    const helper = screen.getByText(/Open the song in Spotify/i);

    expect(
      input.compareDocumentPosition(helper) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  test("keeps the Claude import progress checklist with the import controls", () => {
    render(<ImportSongForm requestedBy="@warcry" />);

    expect(screen.getByText("What we pull in")).toBeInTheDocument();
    expect(screen.queryByText("Ready to import")).not.toBeInTheDocument();
    expect(screen.getByText("Metadata")).toBeInTheDocument();
    expect(screen.getByText("Artwork")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Streaming links")).toBeInTheDocument();
  });

  test("shows staged progress after a valid import submit", async () => {
    const user = userEvent.setup();
    render(<ImportSongForm requestedBy="@warcry" />);

    await user.type(
      screen.getByLabelText("Spotify track or album URL"),
      "https://open.spotify.com/track/4n2c9Jt1Fl3O7g4D2nQbXa",
    );
    await user.click(screen.getByRole("button", { name: "Import song" }));

    expect(screen.getByText("Working...")).toBeInTheDocument();
    expect(screen.getByText("Fetching...")).toBeInTheDocument();
  });
});
