import { createHash } from "node:crypto";

import { UAParser } from "ua-parser-js";

import { appEnv } from "@/lib/env";
import type { TrackingContext, UTMAttribution } from "@/lib/types";
import { extractReferrerHost } from "@/lib/utils";

export function parseUTMAttribution(searchParams: URLSearchParams): UTMAttribution {
  return {
    source: searchParams.get("utm_source"),
    medium: searchParams.get("utm_medium"),
    campaign: searchParams.get("utm_campaign"),
    term: searchParams.get("utm_term"),
    content: searchParams.get("utm_content"),
  };
}

export function createIpHash(ipAddress: string | null) {
  if (!ipAddress) {
    return null;
  }

  return createHash("sha256")
    .update(`${appEnv.analyticsSalt}:${ipAddress}`)
    .digest("hex")
    .slice(0, 24);
}

export function summariseRequestContext(
  request: Request,
  input: {
    visitorId: string;
    referrer: string | null;
    searchParams: URLSearchParams;
  },
): TrackingContext {
  return summariseHeadersContext(request.headers, input);
}

export function summariseHeadersContext(
  headers: Headers,
  input: {
    visitorId: string;
    referrer: string | null;
    searchParams: URLSearchParams;
  },
): TrackingContext {
  const parser = new UAParser(headers.get("user-agent") ?? "");
  const deviceType =
    parser.getDevice().type ??
    (parser.getBrowser().name ? "desktop" : "unknown");

  const forwardedFor = headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  return {
    visitorId: input.visitorId,
    referrer: input.referrer,
    referrerHost: extractReferrerHost(input.referrer),
    userAgent: headers.get("user-agent"),
    browserName: parser.getBrowser().name ?? null,
    osName: parser.getOS().name ?? null,
    deviceType,
    country:
      headers.get("x-vercel-ip-country") ??
      headers.get("cf-ipcountry") ??
      null,
    city:
      headers.get("x-vercel-ip-city") ??
      headers.get("cf-ipcity") ??
      null,
    ipHash: createIpHash(ipAddress),
    ...parseUTMAttribution(input.searchParams),
  };
}
