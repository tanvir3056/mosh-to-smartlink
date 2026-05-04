import { expect, test } from "@playwright/test";

import { seedQaSongPage } from "./helpers";

test("editing a song keeps the admin stable when toggling service visibility", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);

  const seeded = await seedQaSongPage(request, {
    scenario: "basic",
    seedName: `admin-visibility-${crypto.randomUUID().slice(0, 8)}`,
  });

  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("qa-artist");
  await page.getByLabel("Password").fill("dev-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 15000 });

  await page.goto(`/admin/songs/${seeded.songId}`);
  await expect(page.getByText("Streaming links")).toBeVisible();

  const spotifyToggle = page.getByLabel("Show on public page").first();
  await expect(spotifyToggle).toBeChecked();

  await spotifyToggle.uncheck();
  await expect(spotifyToggle).not.toBeChecked();
  await expect(page.getByText("Streaming links")).toBeVisible();
  await expect(page.getByText("This page hit a temporary problem.")).toHaveCount(0);

  await spotifyToggle.check();
  await expect(spotifyToggle).toBeChecked();
  await expect(page.getByText("Streaming links")).toBeVisible();
  await expect(page.getByText("This page hit a temporary problem.")).toHaveCount(0);
});
