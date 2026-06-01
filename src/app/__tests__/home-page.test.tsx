import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe("home page Claude design", () => {
  test("keeps the public entry nav free of the admin theme toggle", async () => {
    const { default: HomePage } = await import("@/app/page");

    render(await HomePage());

    expect(
      screen.queryByRole("button", { name: /switch to (dark|light) mode/i }),
    ).not.toBeInTheDocument();
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
});
