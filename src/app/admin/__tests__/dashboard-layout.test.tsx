import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockRequireUserSession } = vi.hoisted(() => ({
  mockRequireUserSession: vi.fn(),
}));

vi.mock("@/app/admin/actions", () => ({
  signOutAction: vi.fn(),
}));

vi.mock("@/components/admin/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Workspace">Overview</nav>,
  AdminNavLinks: () => <nav aria-label="Mobile workspace">Overview</nav>,
}));

vi.mock("@/components/admin/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Switch theme</button>,
}));

vi.mock("@/lib/auth", () => ({
  requireUserSession: mockRequireUserSession,
}));

describe("admin dashboard layout", () => {
  beforeEach(() => {
    mockRequireUserSession.mockResolvedValue({
      userId: "user-1",
      username: "warcry",
      loginEmail: "warcry@example.com",
    });
  });

  test("keeps the Claude sidebar brand subtitle visible", async () => {
    const { default: AdminDashboardLayout } = await import("@/app/admin/(dashboard)/layout");

    render(
      await AdminDashboardLayout({
        children: <div>Dashboard content</div>,
      }),
    );

    expect(screen.getAllByText("Release links").length).toBeGreaterThan(0);
  });

  test("uses the Claude controlled mobile navigation trigger", async () => {
    const { default: AdminDashboardLayout } = await import("@/app/admin/(dashboard)/layout");
    const user = userEvent.setup();

    render(
      await AdminDashboardLayout({
        children: <div>Dashboard content</div>,
      }),
    );

    const mobileMenuButton = screen.getByRole("button", { name: "Open navigation" });

    expect(mobileMenuButton).toHaveAttribute("aria-expanded", "false");
    expect(mobileMenuButton).toHaveAttribute("aria-controls", "admin-mobile-menu");

    await user.click(mobileMenuButton);

    expect(mobileMenuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Close navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile workspace" })).toBeInTheDocument();
  });
});
