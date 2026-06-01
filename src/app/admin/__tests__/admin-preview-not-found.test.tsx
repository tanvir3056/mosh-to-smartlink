import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe("admin preview not found", () => {
  test("does not reuse the public not-live page when a protected preview cannot be loaded", async () => {
    const { default: AdminPreviewNotFound } = await import("@/app/admin/preview/[songId]/not-found");

    render(<AdminPreviewNotFound />);

    expect(screen.getByRole("heading", { name: "Preview could not be opened." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to library" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByText("That song page is not live.")).not.toBeInTheDocument();
  });
});
