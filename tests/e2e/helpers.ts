import { expect, type APIRequestContext } from "@playwright/test";

export interface QaSongSeed {
  songId: string;
  username: string;
  slug: string;
  scenario: "basic" | "email-capture";
}

export interface QaLeadRecord {
  email: string;
  normalized_email: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  connector_status: string;
}

export async function seedQaSongPage(
  request: APIRequestContext,
  input: {
    scenario: "basic" | "email-capture";
    seedName: string;
  },
) {
  const response = await request.post("/api/dev/qa/song-page", {
    data: input,
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as QaSongSeed;

  await expect
    .poll(
      async () =>
        (await request.get(`/${data.username}/${data.slug}`)).status(),
      {
        timeout: 15000,
      },
    )
    .toBe(200);

  return data;
}

export async function fetchQaLead(
  request: APIRequestContext,
  input: {
    slug: string;
    email: string;
  },
) {
  const response = await request.get(
    `/api/dev/qa/song-page?${new URLSearchParams({
      intent: "lead",
      slug: input.slug,
      email: input.email,
    }).toString()}`,
  );

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { lead: QaLeadRecord | null };
  return data.lead;
}
