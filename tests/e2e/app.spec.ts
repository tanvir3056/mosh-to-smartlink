import { expect, test } from "@playwright/test";

test("imports, publishes, visits, and tracks a song page", async ({ page }) => {
  test.setTimeout(120000);

  await page.goto("/admin/sign-in");
  await page.getByLabel("Password").fill("dev-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/admin");
  await page.goto("/admin/songs/new");
  await page
    .getByLabel("Spotify track URL")
    .fill("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp");
  await page.getByRole("button", { name: "Import track" }).click();
  await page.waitForURL(/\/admin\/songs\/(?!new$)[^/]+$/, { timeout: 60000 });
  const songId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await expect(page.locator('input[name="title"]')).toHaveValue("Mr. Brightside");
  await expect(page.getByText("Upload artwork manually")).toBeVisible();
  await page.getByRole("link", { name: "Open admin preview" }).click();
  await expect(page.getByText(/(Draft preview|Admin preview)/)).toBeVisible();
  await page.getByRole("link", { name: "Back to editor" }).click();
  await page.waitForURL(/\/admin\/songs\/(?!new$)[^/]+$/);

  const slug = await page.locator('input[name="slug"]').inputValue();
  await page.locator('button[name="intent"][value="publish"]').first().click();
  await expect(page.getByText("Song page published.")).toBeVisible();
  await expect(page.getByText("Live page is ready to share")).toBeVisible();

  const visitRequest = page.waitForResponse(
    (response) =>
      response.url().includes("/api/analytics/visit") &&
      response.request().method() === "POST",
  );
  await page.goto(`/${slug}?utm_source=instagram&utm_medium=paid-social&utm_campaign=launch`);
  const visitResponse = await visitRequest;
  expect(visitResponse.ok()).toBeTruthy();
  await expect(page.getByText("The Killers")).toBeVisible();
  await expect(page.getByTestId("service-link-spotify")).toBeVisible();

  await page.getByTestId("service-link-spotify").click();
  await page.waitForURL(/open\.spotify\.com/, { timeout: 15000 });

  await page.goto("/admin/analytics");
  await expect(page.getByText("Page visits")).toBeVisible();
  await expect(page.getByText("Outbound clicks")).toBeVisible();
  await expect(page.getByText("instagram")).toBeVisible({ timeout: 15000 });

  await page.goto(`/admin/songs/${songId}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete song" }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByText("/the-killers-mr-brightside")).toHaveCount(0);
});
