import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

describe("admin theme tokens", () => {
  test("defines the Claude shell tokens used by internal admin chrome", () => {
    expect(globalsCss).toContain("--scrim:");
    expect(globalsCss).toContain("--app-line-soft:");
    expect(globalsCss).toMatch(/--app-line-soft:\s*var\(--line-soft\);/);
  });

  test("uses the Claude design font stack only inside the admin theme", () => {
    expect(globalsCss).toMatch(
      /\.bs-admin-theme\s*\{[\s\S]*--font-body:\s*var\(--font-hanken\),\s*"Hanken Grotesk",\s*system-ui,\s*sans-serif;/,
    );
    expect(globalsCss).toMatch(
      /\.bs-admin-theme\s*\{[\s\S]*--font-display:\s*var\(--font-schibsted\),\s*"Schibsted Grotesk",\s*var\(--font-sans\);/,
    );
    expect(globalsCss).toMatch(
      /\.bs-admin-theme\s*\{[\s\S]*--font-mono:\s*var\(--font-jetbrains\),\s*"JetBrains Mono",\s*ui-monospace,\s*monospace;/,
    );

    expect(globalsCss).toMatch(
      /:root\s*\{[\s\S]*--font-display:\s*"Avenir Next Condensed",\s*"Avenir Next"/,
    );
  });
});
