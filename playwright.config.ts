import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: {
      width: 390,
      height: 844,
    },
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "LOCAL_DB_PATH=/tmp/ffm-playwright-db NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 ADMIN_EMAIL=admin@local.test DEMO_ADMIN_PASSWORD=dev-password npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  globalSetup: "./tests/e2e/global-setup.ts",
});
