import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

describe("GlobalError", () => {
  test("renders a login-first plain-link fallback instead of trapping users on an error card", async () => {
    const { default: GlobalError } = await import("@/app/global-error");
    const unstableRetry = vi.fn();
    window.sessionStorage.setItem("backstage-root-recovery:/:digest_123", "tried");

    render(
      <GlobalError
        error={Object.assign(new Error("Root failed"), { digest: "digest_123" })}
        unstable_retry={unstableRetry}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Backstage gives every artist a clean home for every release.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Temporary error")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/latest Backstage app shell/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Continue to your account")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", { name: "Open homepage" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });
});
