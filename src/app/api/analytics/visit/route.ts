import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { LAST_VISIT_COOKIE, VISITOR_COOKIE } from "@/lib/constants";
import { summariseRequestContext } from "@/lib/analytics";
import { getPublishedSongPage, recordVisit } from "@/lib/data";
import { appEnv } from "@/lib/env";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    slug?: string;
    path?: string;
    searchString?: string;
    referrer?: string | null;
  };

  if (!body.username || !body.slug || !body.path) {
    return NextResponse.json(
      {
        error: "Missing tracking payload.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? crypto.randomUUID();
  const searchParams = new URLSearchParams(body.searchString ?? "");
  const context = summariseRequestContext(request, {
    visitorId,
    referrer: body.referrer ?? null,
    searchParams,
  });
  const page = await getPublishedSongPage(body.username, body.slug);

  if (!page) {
    return NextResponse.json(
      {
        error: "Song page not found.",
      },
      { status: 404 },
    );
  }

  const visitId = await recordVisit({
    ownerUserId: page.song.ownerUserId,
    songId: page.song.id,
    pageId: page.page.id,
    path: body.path,
    context,
  });

  const response = NextResponse.json({
    ok: true,
    visitId,
  });

  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv.nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  response.cookies.set(LAST_VISIT_COOKIE, visitId, {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv.nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
