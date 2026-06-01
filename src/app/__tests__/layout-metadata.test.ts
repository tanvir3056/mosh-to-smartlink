import { createElement, isValidElement, type ReactElement } from "react";
import { describe, expect, test } from "vitest";

import RootLayout, { metadata } from "@/app/layout";
import { THEME_BOOTSTRAP_SCRIPT } from "@/components/admin/theme-bootstrap-script";

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
});
