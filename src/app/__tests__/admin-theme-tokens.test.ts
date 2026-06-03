import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

describe("admin theme tokens", () => {
  test("defines the Claude shell tokens used by internal admin chrome", () => {
    expect(globalsCss).toContain("--scrim:");
    expect(globalsCss).toContain("--app-line-soft:");
    expect(globalsCss).toMatch(/--app-line-soft:\s*var\(--line-soft\);/);
  });

  test("defines the Claude primitive radius and elevation contract", () => {
    expect(globalsCss).toMatch(/--r-xs:\s*5px;/);
    expect(globalsCss).toMatch(/--r-sm:\s*7px;/);
    expect(globalsCss).toMatch(/--r-md:\s*10px;/);
    expect(globalsCss).toMatch(/--r-lg:\s*14px;/);
    expect(globalsCss).toMatch(/--r-xl:\s*20px;/);
    expect(globalsCss).toMatch(/--r-full:\s*999px;/);
    expect(globalsCss).toMatch(
      /--sh-sm:\s*0 1px 2px oklch\(0\.2 0\.02 270 \/ 0\.06\),\s*0 1px 3px oklch\(0\.2 0\.02 270 \/ 0\.05\);/,
    );
    expect(globalsCss).toMatch(
      /--sh-lg:\s*0 8px 24px oklch\(0\.2 0\.02 270 \/ 0\.10\),\s*0 2px 6px oklch\(0\.2 0\.02 270 \/ 0\.06\);/,
    );
    expect(globalsCss).toMatch(/--ring:\s*0 0 0 3px var\(--accent-soft-2\);/);
    expect(globalsCss).toMatch(/--sidebar-w:\s*252px;/);
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

  test("keeps admin error states on Backstage semantic tokens", () => {
    const adminErrorSources = [
      "src/components/admin/form-state.tsx",
      "src/components/admin/tracking-settings-form.tsx",
      "src/components/admin/artwork-upload-field.tsx",
      "src/components/admin/song-editor-form.tsx",
    ].map((path) => readFileSync(path, "utf8"));
    const combinedSource = adminErrorSources.join("\n");

    expect(combinedSource).toContain("var(--app-red-line)");
    expect(combinedSource).toContain("var(--app-red-soft)");
    expect(combinedSource).toContain("var(--app-red-text)");
    expect(combinedSource).not.toMatch(
      /\b(?:border|bg|text)-red-(?:50|100|200|500|600|700|800|900)\b/,
    );
  });

  test("keeps admin checkbox borders on Backstage line tokens", () => {
    const adminCheckboxSources = [
      "src/app/admin/(dashboard)/settings/page.tsx",
      "src/components/admin/tracking-settings-form.tsx",
      "src/components/admin/song-editor-form.tsx",
    ].map((path) => readFileSync(path, "utf8"));
    const combinedSource = adminCheckboxSources.join("\n");
    const legacyCheckboxBorder = ["border", "slate", "300"].join("-");

    expect(combinedSource).toContain("border-[var(--app-line)]");
    expect(combinedSource).not.toContain(legacyCheckboxBorder);
  });

  test("keeps admin elevation on Backstage shadow tokens", () => {
    const adminElevationSources = [
      "src/app/admin/(dashboard)/layout.tsx",
      "src/app/admin/(dashboard)/settings/page.tsx",
      "src/app/admin/error.tsx",
      "src/app/admin/preview/[songId]/not-found.tsx",
      "src/app/admin/preview/[songId]/page.tsx",
      "src/components/admin/artwork-upload-field.tsx",
      "src/components/admin/email-leads-panel.tsx",
      "src/components/admin/mobile-admin-menu.tsx",
      "src/components/admin/public-link-panel.tsx",
      "src/components/admin/tracking-settings-form.tsx",
    ].map((path) => readFileSync(path, "utf8"));
    const combinedSource = adminElevationSources.join("\n");
    const hardcodedElevationClasses = (
      combinedSource.match(/shadow-\[[^\]]*(?:rgba|oklch)[^\]]*\]/g) ?? []
    ).filter((className) => !className.includes("_inset"));

    expect(combinedSource).toContain("shadow-[var(--sh-xs)]");
    expect(hardcodedElevationClasses).toEqual([]);
  });

  test("keeps public entry chrome on Backstage shadow tokens", () => {
    const publicEntrySources = [
      "src/app/page.tsx",
      "src/app/global-error.tsx",
      "src/components/brand/brand-mark.tsx",
    ].map((path) => readFileSync(path, "utf8"));
    const combinedSource = publicEntrySources.join("\n");
    const hardcodedElevationClasses = (
      combinedSource.match(/shadow-\[[^\]]*(?:rgba|oklch)[^\]]*\]/g) ?? []
    ).filter((className) => !className.includes("_inset"));

    expect(combinedSource).toContain("shadow-[var(--sh-lg)]");
    expect(combinedSource).toContain("shadow-[var(--sh-sm)]");
    expect(hardcodedElevationClasses).toEqual([]);
  });

  test("keeps public entry chrome on Backstage radius tokens", () => {
    const publicEntrySources = [
      "src/app/page.tsx",
      "src/app/global-error.tsx",
      "src/components/brand/brand-mark.tsx",
    ].map((path) => readFileSync(path, "utf8"));
    const combinedSource = publicEntrySources.join("\n");
    const hardcodedRadiusClasses = (
      combinedSource.match(/rounded-(?:\[[^\]]+\]|2xl|xl|lg|md|sm)\b/g) ?? []
    ).filter((className) => !className.includes("var(--r-"));

    expect(combinedSource).toContain("rounded-[var(--r-sm)]");
    expect(combinedSource).toContain("rounded-[var(--r-md)]");
    expect(combinedSource).toContain("rounded-[var(--r-lg)]");
    expect(hardcodedRadiusClasses).toEqual([]);
  });
});
