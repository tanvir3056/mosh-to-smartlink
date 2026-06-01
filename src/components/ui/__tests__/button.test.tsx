import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  test("keeps labels on one line like the Claude design primitive", () => {
    render(<Button>Sign in</Button>);

    expect(screen.getByRole("button", { name: "Sign in" })).toHaveClass(
      "whitespace-nowrap",
    );
  });

  test("uses Claude primitive radius and shadow tokens", () => {
    render(<Button>Import song</Button>);

    expect(screen.getByRole("button", { name: "Import song" })).toHaveClass(
      "rounded-[var(--r-sm)]",
      "shadow-[var(--sh-xs)]",
    );
  });
});
