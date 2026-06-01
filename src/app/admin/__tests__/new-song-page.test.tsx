import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockRequireUserSession } = vi.hoisted(() => ({
  mockRequireUserSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
}));

vi.mock("@/components/admin/import-song-form", () => ({
  ImportSongForm: ({ requestedBy }: { requestedBy: string }) => (
    <div data-testid="import-song-form" data-requested-by={requestedBy} />
  ),
}));

describe("new song page", () => {
  beforeEach(() => {
    mockRequireUserSession.mockResolvedValue({
      userId: "user-1",
      username: "warcry",
      loginEmail: "warcry@example.com",
    });
  });

  test("matches the Claude reassurance copy without extra private-draft badge copy", async () => {
    const { default: NewSongPage } = await import("@/app/admin/(dashboard)/songs/new/page");

    render(await NewSongPage());

    expect(screen.getByTestId("import-song-form")).toHaveAttribute(
      "data-requested-by",
      "@warcry",
    );
    expect(screen.getByText("Importing never publishes anything")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We create a private draft you can edit freely. You choose the slug, confirm each streaming link, and decide exactly when it goes live. Nothing is shared until you hit publish.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Drafts stay private/i)).not.toBeInTheDocument();
  });
});
