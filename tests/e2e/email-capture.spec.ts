import { expect, test } from "@playwright/test";

import { fetchQaLead, seedQaSongPage } from "./helpers";

test("captures an email lead on the public song page", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);

  const seeded = await seedQaSongPage(request, {
    scenario: "email-capture",
    seedName: `email-capture-smoke-${crypto.randomUUID().slice(0, 8)}`,
  });

  const publicPath = `/${seeded.username}/${seeded.slug}`;

  await page.goto(
    `${publicPath}?utm_source=tiktok&utm_medium=organic-social&utm_campaign=free-download&utm_content=qa-reel`,
  );

  await expect(page.getByText("Download the song for free")).toBeVisible();
  await page.getByPlaceholder("Enter your email").fill("fan@example.com");
  await page.getByRole("button", { name: "Get the download" }).click();

  await expect(page.getByText(/You're in\./)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("link", { name: "Download the track" })).toHaveAttribute(
    "href",
    "https://example.com/free-download.mp3",
  );

  await expect
    .poll(
      async () =>
        fetchQaLead(request, {
          slug: seeded.slug,
          email: "fan@example.com",
        }),
      {
        timeout: 15000,
      },
    )
    .toMatchObject({
      normalized_email: "fan@example.com",
      utm_source: "tiktok",
      utm_medium: "organic-social",
      utm_campaign: "free-download",
      utm_content: "qa-reel",
      connector_status: "not_configured",
    });
});
