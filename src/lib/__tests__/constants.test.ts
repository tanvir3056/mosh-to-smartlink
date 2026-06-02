import { afterEach, describe, expect, test, vi } from "vitest";

describe("app domain hint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test("uses the configured hosted app domain instead of the placeholder domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://mosh-to-smartlink.vercel.app");
    vi.resetModules();

    const { APP_DOMAIN_HINT } = await import("@/lib/constants");

    expect(APP_DOMAIN_HINT).toBe("mosh-to-smartlink.vercel.app");
    expect(APP_DOMAIN_HINT).not.toBe("backstage.to");
  });
});
