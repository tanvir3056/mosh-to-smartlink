import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ImportSongForm } from "@/components/admin/import-song-form";

const { mockImportSpotifyTrackAction } = vi.hoisted(() => ({
  mockImportSpotifyTrackAction: vi.fn(async () => ({ error: null, success: null })),
}));

vi.mock("@/app/admin/actions", () => ({
  importSpotifyTrackAction: mockImportSpotifyTrackAction,
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

  test("shows specific app-owned guidance for an empty import submit", async () => {
    const user = userEvent.setup();
    render(<ImportSongForm requestedBy="@warcry" />);

    await user.click(screen.getByRole("button", { name: "Import song" }));

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Paste a Spotify track or album URL to start the import.");
    expect(screen.queryByText(/does not look like a Spotify/i)).not.toBeInTheDocument();
    expect(mockImportSpotifyTrackAction).not.toHaveBeenCalled();
  });

  test("matches the Claude form hierarchy with the helper copy below the URL field", () => {
    render(<ImportSongForm requestedBy="@warcry" />);

    const input = screen.getByLabelText("Spotify track or album URL");
    const helper = screen.getByText(/Open the track or album in Spotify/i);

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

  test("uses Claude primitive tokens for the import form card and stage badges", () => {
    render(<ImportSongForm requestedBy="@warcry" />);

    const input = screen.getByLabelText("Spotify track or album URL");
    const metadataStage = screen.getByText("Metadata").parentElement?.parentElement;
    const metadataIcon = metadataStage?.querySelector("span");

    expect(input.closest("section")).toHaveClass("rounded-[var(--r-lg)]");
    expect(metadataStage).toHaveClass("rounded-[var(--r-md)]");
    expect(metadataIcon).toHaveClass("shadow-[var(--sh-xs)]");
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

  test("lets localized Spotify album links reach the import action", async () => {
    const user = userEvent.setup();
    render(<ImportSongForm requestedBy="@warcry" />);

    await user.type(
      screen.getByLabelText("Spotify track or album URL"),
      "https://open.spotify.com/intl-us/album/0rAWaAAMfz3d4jpVWI6zn4?si=abc",
    );
    await user.click(screen.getByRole("button", { name: "Import song" }));

    expect(screen.queryByText(/That does not look like a Spotify/i)).not.toBeInTheDocument();
    expect(screen.getByText("Working...")).toBeInTheDocument();
  });
});
