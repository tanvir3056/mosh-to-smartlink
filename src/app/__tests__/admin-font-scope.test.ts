import { existsSync, readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

function readOptional(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("admin font loading scope", () => {
  test("self-hosts Claude design fonts from the internal app shell", () => {
    const adminFontsSource = readOptional("src/lib/admin-fonts.ts");

    expect(adminFontsSource).toContain('from "next/font/google"');
    expect(adminFontsSource).toContain("Hanken_Grotesk");
    expect(adminFontsSource).toContain("Schibsted_Grotesk");
    expect(adminFontsSource).toContain("JetBrains_Mono");
    expect(adminFontsSource).toContain('variable: "--font-hanken"');
    expect(adminFontsSource).toContain('variable: "--font-schibsted"');
    expect(adminFontsSource).toContain('variable: "--font-jetbrains"');
    expect(adminFontsSource).toContain("ADMIN_FONT_VARIABLES");
  });

  test("applies the admin font variables only to internal app entry shells", () => {
    expect(readFileSync("src/app/admin/layout.tsx", "utf8")).toContain(
      "ADMIN_FONT_VARIABLES",
    );
    expect(readFileSync("src/app/page.tsx", "utf8")).toContain(
      "adminThemeClassName",
    );
    expect(readFileSync("src/app/sign-in/page.tsx", "utf8")).toContain(
      "adminThemeClassName",
    );
    expect(readFileSync("src/app/sign-up/page.tsx", "utf8")).toContain(
      "adminThemeClassName",
    );
  });
});
