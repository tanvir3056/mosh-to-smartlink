import { describe, expect, test } from "vitest";

import playwrightConfig from "../../../playwright.config";

describe("Playwright launch-readiness config", () => {
  test("does not reuse an arbitrary existing dev server by default", () => {
    const webServer = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer[0]
      : playwrightConfig.webServer;

    expect(webServer?.reuseExistingServer).toBe(false);
  });
});
