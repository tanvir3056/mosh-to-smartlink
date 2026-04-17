import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseUTMAttribution, summariseRequestContext } from "@/lib/analytics";
import { LAST_VISIT_COOKIE, STREAMING_SERVICES, VISITOR_COOKIE } from "@/lib/constants";
import { recordClickBySlug } from "@/lib/data";
import { appEnv } from "@/lib/env";
import type { StreamingService } from "@/lib/types";

function isStreamingService(value: string): value is StreamingService {
  return STREAMING_SERVICES.includes(value as StreamingService);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      slug: string;
      service: string;
    }>;
  },
) {
  const { slug, service } = await context.params;

  if (!isStreamingService(service)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? crypto.randomUUID();
  const lastVisitId = cookieStore.get(LAST_VISIT_COOKIE)?.value ?? null;
  const requestUrl = new URL(request.url);
  const contextSnapshot = summariseRequestContext(request, {
    visitorId,
    referrer: request.headers.get("referer"),
    searchParams: requestUrl.searchParams,
  });

  const click = await recordClickBySlug({
    slug,
    service,
    context: contextSnapshot,
    lastVisitId,
    fallbackAttribution: parseUTMAttribution(requestUrl.searchParams),
  });

  if (!click?.destinationUrl) {
    return NextResponse.redirect(new URL(`/${slug}`, request.url));
  }

  const response = NextResponse.redirect(click.destinationUrl, { status: 307 });

  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv.nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
