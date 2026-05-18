import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

describe("GlobalError", () => {
  test("renders a recovery screen and retries the failed render", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(unstableRetry).toHaveBeenCalledTimes(1);
  });
});
