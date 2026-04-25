import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
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
      "POSTGRES_URL= NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY= NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 ADMIN_EMAIL=admin@local.test DEMO_ADMIN_PASSWORD=dev-password npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  globalSetup: "./tests/e2e/global-setup.ts",
});
