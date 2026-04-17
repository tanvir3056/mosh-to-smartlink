import { createHmac, timingSafeEqual } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "@/lib/constants";
import { ensureAdminAccess } from "@/lib/data";
import { appEnv } from "@/lib/env";

export interface AdminSession {
  email: string;
  userId: string | null;
  mode: "supabase" | "demo";
}

function signPayload(value: string) {
  return createHmac("sha256", appEnv.demoSessionSecret)
    .update(value)
    .digest("hex");
}

function encodeSession(email: string) {
  const payload = JSON.stringify({
    email,
    issuedAt: Date.now(),
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

function decodeSession(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = Buffer.from(signPayload(encoded));
  const received = Buffer.from(signature);

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      email?: string;
      issuedAt?: number;
    };

    if (!payload.email) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createServerSupabaseClient() {
  if (!appEnv.hasSupabaseAuth || !appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error("Supabase auth is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Next.js blocks cookie mutation in some render contexts; route handlers
          // and server actions still apply the session cookies correctly.
        }
      },
    },
  });
}

async function getDemoAdminSession() {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!payload || payload.email !== appEnv.adminEmail) {
    return null;
  }

  await ensureAdminAccess(payload.email, null);
  return {
    email: payload.email,
    userId: null,
    mode: "demo",
  } satisfies AdminSession;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email || user.email !== appEnv.adminEmail) {
      return null;
    }

    await ensureAdminAccess(user.email, user.id);

    return {
      email: user.email,
      userId: user.id,
      mode: "supabase",
    };
  }

  if (appEnv.isDemoAuthEnabled) {
    return getDemoAdminSession();
  }

  return null;
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/sign-in");
  }

  return session;
}

export async function signInAdmin(email: string, password: string) {
  if (email !== appEnv.adminEmail) {
    return {
      error: "This deployment is locked to the configured single admin account.",
    };
  }

  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        error: error.message,
      };
    }

    if (data.user?.email !== appEnv.adminEmail) {
      await supabase.auth.signOut();
      return {
        error: "This account is not allowed to access the admin dashboard.",
      };
    }

    await ensureAdminAccess(data.user.email, data.user.id);
    return { error: null };
  }

  if (!appEnv.isDemoAuthEnabled) {
    return {
      error:
        "Supabase auth is not configured. Add Supabase env vars or enable local demo auth in development.",
    };
  }

  if (password !== appEnv.demoAdminPassword) {
    return {
      error: "Incorrect local admin password.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, encodeSession(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv.nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await ensureAdminAccess(email, null);

  return { error: null };
}

export async function signOutAdmin() {
  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
