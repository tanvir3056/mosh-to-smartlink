import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/admin/theme-toggle";

describe("ThemeToggle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  it("recovers a stored dark preference after a stale initial render", async () => {
    let reads = 0;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
      if (key !== "bs_theme") {
        return null;
      }

      reads += 1;
      return reads === 1 ? null : "dark";
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });
});
