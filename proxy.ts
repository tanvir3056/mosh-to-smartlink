import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { VISITOR_COOKIE } from "@/lib/constants";
import { appEnv } from "@/lib/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (appEnv.hasSupabaseAuth && appEnv.supabaseUrl && appEnv.supabaseAnonKey) {
    const supabase = createServerClient(
      appEnv.supabaseUrl,
      appEnv.supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    await supabase.auth.getUser();
  }

  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: appEnv.nodeEnv === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
