import { expect, test } from "@playwright/test";

import { seedQaSongPage } from "./helpers";

test("renders a published song page and follows the service redirect", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);

  const seeded = await seedQaSongPage(request, {
    scenario: "basic",
    seedName: `analytics-smoke-${crypto.randomUUID().slice(0, 8)}`,
  });

  const publicPath = `/${seeded.username}/${seeded.slug}`;

  await page.goto(
    `${publicPath}?utm_source=instagram&utm_medium=paid-social&utm_campaign=launch`,
  );

  await expect(page.getByText("Backstage QA")).toBeVisible();
  await expect(page.getByTestId("service-link-spotify")).toBeVisible();

  await page.getByTestId("service-link-spotify").click();
  await page.waitForURL("https://example.com/spotify", { timeout: 15000 });
});
