import { render, screen, within } from "@testing-library/react";
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

    const { container } = render(
      await AdminDashboardLayout({
        children: <div>Dashboard content</div>,
      }),
    );

    expect(screen.getAllByText("Release links").length).toBeGreaterThan(0);
    expect(container.querySelector("aside")).toHaveClass("w-[var(--sidebar-w)]");
    expect(container.querySelector(".admin-dashboard-shell")).toHaveClass(
      "lg:pl-[var(--sidebar-w)]",
    );
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

  test("surfaces primary workspace controls inside the mobile menu", async () => {
    const { default: AdminDashboardLayout } = await import("@/app/admin/(dashboard)/layout");
    const user = userEvent.setup();

    render(
      await AdminDashboardLayout({
        children: <div>Dashboard content</div>,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    const mobileMenu = document.getElementById("admin-mobile-menu");
    expect(mobileMenu).not.toBeNull();

    const importLink = within(mobileMenu!).getByRole("link", { name: "Import song" });

    expect(importLink).toHaveAttribute("href", "/admin/songs/new");
    expect(importLink).toHaveStyle({ color: "#fff" });
    expect(
      within(mobileMenu!).getByRole("button", { name: "Switch theme" }),
    ).toBeInTheDocument();
  });
});
