import { randomUUID } from "node:crypto";

import { chromium } from "playwright";

const scenario = process.argv[2];
const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3001";

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function seedSongPage(kind) {
  const response = await fetch(`${baseUrl}/api/dev/qa/song-page`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      scenario: kind,
      seedName: `${kind}-${randomUUID().slice(0, 8)}`,
    }),
  });

  invariant(response.ok, `Seed request failed with ${response.status}.`);
  return response.json();
}

async function runBasicScenario() {
  const seeded = await seedSongPage("basic");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: {
      width: 390,
      height: 844,
    },
  });
  const url =
    `${baseUrl}/${seeded.username}/${seeded.slug}?` +
    new URLSearchParams({
      utm_source: "instagram",
      utm_medium: "paid-social",
      utm_campaign: "launch",
    }).toString();

  await page.goto(url);
  await page.getByText("Backstage QA").waitFor({ timeout: 15000 });
  await page.getByTestId("service-link-spotify").waitFor({ timeout: 15000 });
  await page.getByTestId("service-link-spotify").click();
  await page.waitForURL("https://example.com/spotify", { timeout: 15000 });
  await browser.close();
}

async function runEmailCaptureScenario() {
  const seeded = await seedSongPage("email-capture");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: {
      width: 390,
      height: 844,
    },
  });
  const url =
    `${baseUrl}/${seeded.username}/${seeded.slug}?` +
    new URLSearchParams({
      utm_source: "tiktok",
      utm_medium: "organic-social",
      utm_campaign: "free-download",
      utm_content: "qa-reel",
    }).toString();

  await page.goto(url);
  await page.getByText("Download the song for free").waitFor({ timeout: 15000 });
  await page.getByPlaceholder("Enter your email").fill("fan@example.com");
  await page.getByRole("button", { name: "Get the download" }).click();
  await page.getByText(/You're in\./).waitFor({ timeout: 15000 });
  await page
    .getByRole("link", { name: "Download the track" })
    .waitFor({ timeout: 15000 });

  const leadResponse = await fetch(
    `${baseUrl}/api/dev/qa/song-page?${new URLSearchParams({
      intent: "lead",
      slug: seeded.slug,
      email: "fan@example.com",
    }).toString()}`,
  );

  invariant(leadResponse.ok, `Lead lookup failed with ${leadResponse.status}.`);
  const leadPayload = await leadResponse.json();
  const lead = leadPayload.lead;

  invariant(Boolean(lead), "Lead was not captured.");
  invariant(lead.normalized_email === "fan@example.com", "Lead email mismatch.");
  invariant(lead.utm_source === "tiktok", "Lead source mismatch.");
  invariant(lead.utm_medium === "organic-social", "Lead medium mismatch.");
  invariant(lead.utm_campaign === "free-download", "Lead campaign mismatch.");
  invariant(lead.utm_content === "qa-reel", "Lead content mismatch.");
  invariant(
    lead.connector_status === "not_configured",
    "Expected local-only connector status.",
  );

  await browser.close();
}

switch (scenario) {
  case "basic":
    await runBasicScenario();
    break;
  case "email-capture":
    await runEmailCaptureScenario();
    break;
  default:
    throw new Error(`Unknown QA scenario: ${scenario ?? "missing"}`);
}
