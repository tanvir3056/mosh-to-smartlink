import { createHash } from "node:crypto";

import { splitConnectorTags } from "@/lib/email-capture";
import { decryptSecret } from "@/lib/secrets";
import type {
  EmailConnectorProvider,
  EmailLeadSyncStatus,
} from "@/lib/types";

interface MailchimpConnectorRecord {
  provider: EmailConnectorProvider;
  audienceId: string | null;
  defaultTags: string | null;
  doubleOptIn: boolean;
  encryptedApiKey: string | null;
}

interface SyncMailchimpLeadInput {
  connector: MailchimpConnectorRecord;
  email: string;
  pageTag: string | null;
}

interface SyncEmailLeadResult {
  provider: EmailConnectorProvider | null;
  status: EmailLeadSyncStatus;
  error: string | null;
  syncedAt: string | null;
}

function getMailchimpDataCenter(apiKey: string) {
  const match = apiKey.match(/-([A-Za-z0-9]+)$/);

  if (!match) {
    throw new Error(
      "The Mailchimp API key is missing its datacenter suffix. It should look like xxxx-us21.",
    );
  }

  return match[1];
}

function getMailchimpAuthHeader(apiKey: string) {
  return `Basic ${Buffer.from(`codex:${apiKey}`).toString("base64")}`;
}

function getMailchimpSubscriberHash(email: string) {
  return createHash("md5").update(email.toLowerCase()).digest("hex");
}

async function parseConnectorError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? `Request failed with ${response.status}.`;
  } catch {
    return `Request failed with ${response.status}.`;
  }
}

async function syncMailchimpLead({
  connector,
  email,
  pageTag,
}: SyncMailchimpLeadInput): Promise<SyncEmailLeadResult> {
  if (!connector.audienceId || !connector.encryptedApiKey) {
    return {
      provider: null,
      status: "not_configured",
      error: null,
      syncedAt: null,
    };
  }

  const apiKey = decryptSecret(connector.encryptedApiKey);

  if (!apiKey) {
    return {
      provider: null,
      status: "not_configured",
      error: null,
      syncedAt: null,
    };
  }

  const subscriberHash = getMailchimpSubscriberHash(email);
  const baseUrl = `https://${getMailchimpDataCenter(apiKey)}.api.mailchimp.com/3.0`;
  const memberUrl = `${baseUrl}/lists/${connector.audienceId}/members/${subscriberHash}`;
  const authHeader = getMailchimpAuthHeader(apiKey);
  const tags = splitConnectorTags(
    [connector.defaultTags, pageTag].filter(Boolean).join(","),
  );

  const memberResponse = await fetch(memberUrl, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      status_if_new: connector.doubleOptIn ? "pending" : "subscribed",
    }),
  });

  if (!memberResponse.ok) {
    return {
      provider: "mailchimp",
      status: "failed",
      error: await parseConnectorError(memberResponse),
      syncedAt: null,
    };
  }

  if (tags.length > 0) {
    const tagResponse = await fetch(`${memberUrl}/tags`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tags: tags.map((name) => ({
          name,
          status: "active",
        })),
      }),
    });

    if (!tagResponse.ok) {
      return {
        provider: "mailchimp",
        status: "failed",
        error: await parseConnectorError(tagResponse),
        syncedAt: null,
      };
    }
  }

  return {
    provider: "mailchimp",
    status: "synced",
    error: null,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncEmailLeadToConnector(input: {
  connector: MailchimpConnectorRecord | null;
  email: string;
  pageTag: string | null;
}) {
  if (!input.connector) {
    return {
      provider: null,
      status: "not_configured" as const,
      error: null,
      syncedAt: null,
    };
  }

  switch (input.connector.provider) {
    case "mailchimp":
      return syncMailchimpLead({
        connector: input.connector,
        email: input.email,
        pageTag: input.pageTag,
      });
    default:
      return {
        provider: null,
        status: "not_configured" as const,
        error: null,
        syncedAt: null,
      };
  }
}
