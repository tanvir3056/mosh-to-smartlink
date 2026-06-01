import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

describe("admin theme tokens", () => {
  test("defines the Claude shell tokens used by internal admin chrome", () => {
    expect(globalsCss).toContain("--scrim:");
    expect(globalsCss).toContain("--app-line-soft:");
    expect(globalsCss).toMatch(/--app-line-soft:\s*var\(--line-soft\);/);
  });
});
