import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

describe("AdminNavLinks", () => {
  test("allows the mobile shell to label the workspace navigation", async () => {
    const { AdminNavLinks } = await import("@/components/admin/admin-nav");

    render(<AdminNavLinks orientation="vertical" ariaLabel="Mobile workspace" />);

    expect(
      screen.getByRole("navigation", { name: "Mobile workspace" }),
    ).toBeInTheDocument();
  });
});
