import { expect, test } from "@playwright/test";

import { seedQaSongPage } from "./helpers";

test("editing a song keeps the admin stable when toggling service visibility", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

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
  const streamingDestinationsHeading = page.getByRole("heading", {
    name: "Streaming destinations",
  });
  await expect(streamingDestinationsHeading).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open live page" }).first(),
  ).toHaveAttribute(
    "href",
    `/${seeded.username}/${seeded.slug}`,
  );
  await expect(page.getByRole("link", { name: "Admin preview" })).toHaveAttribute(
    "href",
    `/admin/preview/${seeded.songId}`,
  );
  await expect(page.getByRole("link", { name: "Preview draft" })).toHaveCount(0);

  const spotifyToggle = page.getByLabel("Show on public page").first();
  const spotifySwitch = spotifyToggle.locator("xpath=ancestor::label[1]");
  await expect(spotifyToggle).toBeChecked();

  await spotifySwitch.click();
  await expect(spotifyToggle).not.toBeChecked();
  await expect(streamingDestinationsHeading).toBeVisible();
  await expect(page.getByText("This page hit a temporary problem.")).toHaveCount(0);

  await spotifySwitch.click();
  await expect(spotifyToggle).toBeChecked();
  await expect(streamingDestinationsHeading).toBeVisible();
  await expect(page.getByText("This page hit a temporary problem.")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
