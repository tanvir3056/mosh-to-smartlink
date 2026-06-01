import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { APP_DOMAIN_HINT } from "@/lib/constants";

describe("home page Claude design", () => {
  test("keeps the public entry nav aligned with the Claude theme toggle", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(await HomePage());

    expect(
      screen.getByRole("button", { name: /switch to (dark|light) mode/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Create account" })[0]).toHaveClass(
      "hidden",
      "min-[460px]:inline-flex",
    );
  });

  test("uses icon tiles for how-it-works steps while retaining the step counters", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(await HomePage());

    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  test("uses the configured app domain in the example smart-link path", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(await HomePage());

    expect(screen.getByText(`${APP_DOMAIN_HINT}/`, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("backstage.fm/", { exact: false })).not.toBeInTheDocument();
  });
});
