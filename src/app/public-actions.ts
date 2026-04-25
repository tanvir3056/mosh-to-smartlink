"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import type { PublicLeadActionState } from "@/app/public-action-types";
import { summariseHeadersContext } from "@/lib/analytics";
import { VISITOR_COOKIE, LAST_VISIT_COOKIE } from "@/lib/constants";
import { resolveEmailCaptureConfig } from "@/lib/email-capture";
import { getPublishedSongPage, recordEmailCaptureSubmission } from "@/lib/data";
import { appEnv } from "@/lib/env";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
});

export async function captureEmailLeadAction(
  route: {
    username: string;
    slug: string;
    searchString: string;
  },
  _previousState: PublicLeadActionState,
  formData: FormData,
): Promise<PublicLeadActionState> {
  const validated = emailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return {
      error: validated.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email.",
      success: null,
      downloadUrl: null,
      downloadLabel: null,
    };
  }

  const page = await getPublishedSongPage(route.username, route.slug);

  if (!page || !page.emailCapture.enabled) {
    return {
      error: "This capture offer is not available right now.",
      success: null,
      downloadUrl: null,
      downloadLabel: null,
    };
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? crypto.randomUUID();
  const lastVisitId = cookieStore.get(LAST_VISIT_COOKIE)?.value ?? null;
  const context = summariseHeadersContext(headerStore, {
    visitorId,
    referrer: headerStore.get("referer"),
    searchParams: new URLSearchParams(route.searchString),
  });

  await recordEmailCaptureSubmission({
    page,
    email: validated.data.email,
    lastVisitId,
    context,
  });

  cookieStore.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv.nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const capture = resolveEmailCaptureConfig(page);
  const success = capture.downloadUrl
    ? `You're in. Grab your reward below and keep an eye out for future updates from ${page.song.artistName}.`
    : `You're in. We'll use that email for future updates from ${page.song.artistName}.`;

  return {
    error: null,
    success,
    downloadUrl: capture.downloadUrl,
    downloadLabel: capture.downloadLabel,
  };
}
