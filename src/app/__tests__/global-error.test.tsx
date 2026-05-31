import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

describe("GlobalError", () => {
  test("renders browser-native recovery controls", async () => {
    const { default: GlobalError } = await import("@/app/global-error");
    const unstableRetry = vi.fn();

    render(
      <GlobalError
        error={Object.assign(new Error("Root failed"), { digest: "digest_123" })}
        unstable_retry={unstableRetry}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Backstage hit a temporary problem.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ref digest_123")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Reload page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
