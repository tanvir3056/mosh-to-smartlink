import { render, screen, within } from "@testing-library/react";
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

  test("keeps the configured app domain as helper copy beside a compact smart-link path", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(await HomePage());

    const linkExample = screen.getByTestId("home-link-example");
    const compactPath = within(linkExample)
      .getByText("@username", { exact: false })
      .closest(".font-mono");

    expect(compactPath).not.toBeNull();
    expect(compactPath).toHaveTextContent("@username/song-slug");
    expect(compactPath).not.toHaveTextContent(APP_DOMAIN_HINT);
    expect(within(linkExample).getByText(APP_DOMAIN_HINT)).toHaveClass("break-words");
    expect(screen.queryByText("backstage.fm/", { exact: false })).not.toBeInTheDocument();
  });
});
