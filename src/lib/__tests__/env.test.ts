import { describe, expect, test } from "vitest";

import { normalizeAppUrl } from "@/lib/env";

describe("environment URL normalization", () => {
  test("keeps valid absolute app URLs", () => {
    expect(normalizeAppUrl("https://mosh-to-smartlink.vercel.app")).toBe(
      "https://mosh-to-smartlink.vercel.app",
    );
  });

  test("adds https to host-only app URLs", () => {
    expect(normalizeAppUrl("mosh-to-smartlink.vercel.app")).toBe(
      "https://mosh-to-smartlink.vercel.app",
    );
  });

  test("falls back when the app URL cannot be parsed", () => {
    expect(normalizeAppUrl("https://")).toBe("http://localhost:3000");
  });
});
