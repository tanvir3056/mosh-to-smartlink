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
});
