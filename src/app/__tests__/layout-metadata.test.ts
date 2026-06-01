import { readFileSync } from "node:fs";

import { createElement, isValidElement, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Hanken_Grotesk: ({ variable }: { variable: string }) => ({
    variable: `mock-${variable}`,
  }),
  JetBrains_Mono: ({ variable }: { variable: string }) => ({
    variable: `mock-${variable}`,
  }),
  Schibsted_Grotesk: ({ variable }: { variable: string }) => ({
    variable: `mock-${variable}`,
  }),
}));

import RootLayout, { metadata } from "@/app/layout";
import { THEME_BOOTSTRAP_SCRIPT } from "@/components/admin/theme-bootstrap-script";

const layoutSource = readFileSync("src/app/layout.tsx", "utf8");

describe("root metadata", () => {
  test("sets metadataBase so shared URLs do not resolve against localhost", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(metadata.metadataBase?.toString()).toBe("http://localhost:3000/");
  });

  test("boots the stored theme before client hydration", () => {
    const layout = RootLayout({ children: createElement("main") });
    const body = layout.props.children;
    const bodyChildren = Array.isArray(body.props.children)
      ? body.props.children
      : [body.props.children];
    const themeScript = bodyChildren.find((child: unknown) => {
      if (!isValidElement(child)) {
        return false;
      }

      return (child as ReactElement<{ id?: string }>).props.id === "bs-theme-bootstrap";
    }) as
      | ReactElement<{
          strategy: string;
          dangerouslySetInnerHTML: { __html: string };
        }>
      | undefined;

    expect(layout.props.suppressHydrationWarning).toBe(true);
    expect(themeScript).toBeTruthy();
    if (!themeScript) {
      throw new Error("Theme bootstrap script was not rendered.");
    }
    expect(themeScript.props.strategy).toBe("beforeInteractive");
    expect(themeScript.props.dangerouslySetInnerHTML.__html).toBe(
      THEME_BOOTSTRAP_SCRIPT,
    );
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("localStorage.getItem('bs_theme')");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("dataset.theme");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("style.colorScheme");
  });

  test("self-hosts the Claude design fonts for internal app screens", () => {
    expect(layoutSource).toContain('from "next/font/google"');
    expect(layoutSource).toContain("Hanken_Grotesk");
    expect(layoutSource).toContain("Schibsted_Grotesk");
    expect(layoutSource).toContain("JetBrains_Mono");
    expect(layoutSource).toContain('variable: "--font-hanken"');
    expect(layoutSource).toContain('variable: "--font-schibsted"');
    expect(layoutSource).toContain('variable: "--font-jetbrains"');
    expect(layoutSource).toContain("ADMIN_FONT_VARIABLES");
    expect(layoutSource).toMatch(
      /className=\{cn\("h-full antialiased",\s*ADMIN_FONT_VARIABLES\)\}/,
    );
  });
});
