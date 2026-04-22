import { createHmac, timingSafeEqual } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "@/lib/constants";
import {
  createAccountOwner,
  getUserByAuthUserId,
  getUserById,
  getUserByLoginEmail,
  getUserByUsername,
  linkUserAuthIdentity,
} from "@/lib/data";
import { appEnv, assertSupabaseAdminEnv } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { createId, normalizeUsername } from "@/lib/utils";

export interface AppSession {
  userId: string;
  username: string;
  loginEmail: string;
  mode: "supabase" | "local";
}

function signPayload(value: string) {
  return createHmac("sha256", appEnv.demoSessionSecret)
    .update(value)
    .digest("hex");
}

function encodeSession(payload: {
  userId: string;
  username: string;
  loginEmail: string;
}) {
  const raw = JSON.stringify({
    ...payload,
    issuedAt: Date.now(),
  });
  const encoded = Buffer.from(raw).toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

function decodeSession(
  token: string | undefined,
): { userId: string; username: string; loginEmail: string } | null {
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
      userId?: string;
      username?: string;
      loginEmail?: string;
    };

    if (!payload.userId || !payload.username || !payload.loginEmail) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      loginEmail: payload.loginEmail,
    };
  } catch {
    return null;
  }
}

function buildSyntheticLoginEmail(username: string) {
  return `${normalizeUsername(username)}@users.backstage.local`;
}

function validateUsername(username: string) {
  const normalized = normalizeUsername(username);

  if (normalized.length < 3) {
    return {
      normalized,
      error: "Usernames need at least 3 characters.",
    };
  }

  if (normalized.length > 32) {
    return {
      normalized,
      error: "Usernames must stay under 32 characters.",
    };
  }

  return {
    normalized,
    error: null,
  };
}

function validatePassword(password: string) {
  if (password.length < 8) {
    return "Passwords need at least 8 characters.";
  }

  return null;
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
          // Cookie mutation is blocked in some render contexts; sign-in/out server
          // actions still apply session cookies correctly.
        }
      },
    },
  });
}

export function createAdminSupabaseClient() {
  assertSupabaseAdminEnv();

  return createClient(appEnv.supabaseUrl!, appEnv.supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function writeLocalSessionCookie(session: {
  userId: string;
  username: string;
  loginEmail: string;
}) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv.nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function getLocalSession() {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!payload) {
    return null;
  }

  const user = await getUserById(payload.userId);

  if (!user || user.username !== payload.username || user.loginEmail !== payload.loginEmail) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    loginEmail: user.loginEmail,
    mode: "local",
  } satisfies AppSession;
}

export async function getUserSession(): Promise<AppSession | null> {
  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return null;
    }

    let appUser = await getUserByAuthUserId(user.id);

    if (!appUser && user.email) {
      const loginEmail = user.email;
      appUser = await getUserByLoginEmail(loginEmail);

      if (appUser && !appUser.authUserId) {
        await linkUserAuthIdentity(appUser.id, user.id);
        appUser = {
          ...appUser,
          authUserId: user.id,
        };
      }
    }

    if (!appUser) {
      return null;
    }

    return {
      userId: appUser.id,
      username: appUser.username,
      loginEmail: appUser.loginEmail,
      mode: "supabase",
    };
  }

  return getLocalSession();
}

export async function requireUserSession() {
  const session = await getUserSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function signInUser(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const user = await getUserByUsername(normalizedUsername);

  if (!user) {
    return {
      error: "That username or password is incorrect.",
    };
  }

  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.loginEmail,
      password,
    });

    if (error || !data.user?.id) {
      return {
        error: "That username or password is incorrect.",
      };
    }

    if (data.user.id !== user.authUserId) {
      await linkUserAuthIdentity(user.id, data.user.id);
    }

    return { error: null };
  }

  const matches = await verifyPassword(password, user.passwordHash);

  if (!matches) {
    return {
      error: "That username or password is incorrect.",
    };
  }

  await writeLocalSessionCookie({
    userId: user.id,
    username: user.username,
    loginEmail: user.loginEmail,
  });

  return { error: null };
}

export async function signUpUser(username: string, password: string) {
  const { normalized, error: usernameError } = validateUsername(username);

  if (usernameError) {
    return {
      error: usernameError,
    };
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    return {
      error: passwordError,
    };
  }

  const existingUser = await getUserByUsername(normalized);

  if (existingUser) {
    return {
      error: "That username is already taken.",
    };
  }

  const loginEmail = buildSyntheticLoginEmail(normalized);

  if (appEnv.hasSupabaseAuth) {
    if (!appEnv.hasSupabaseAdmin) {
      return {
        error: "This deployment is missing the server-side Supabase auth key needed for sign-up.",
      };
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: normalized,
      },
    });

    if (error || !data.user?.id) {
      return {
        error: error?.message ?? "The account could not be created.",
      };
    }

    try {
      await createAccountOwner({
        userId: data.user.id,
        authUserId: data.user.id,
        username: normalized,
        loginEmail,
      });
    } catch (accountError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return {
        error:
          accountError instanceof Error
            ? accountError.message
            : "The account could not be created.",
      };
    }

    const supabase = await createServerSupabaseClient();
    const signIn = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (signIn.error) {
      return {
        error: signIn.error.message,
      };
    }

    return { error: null };
  }

  const userId = createId("user");
  const passwordHash = await hashPassword(password);
  const user = await createAccountOwner({
    userId,
    username: normalized,
    loginEmail,
    passwordHash,
  });

  await writeLocalSessionCookie({
    userId: user.id,
    username: user.username,
    loginEmail: user.loginEmail,
  });

  return { error: null };
}

export async function signOutUser() {
  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
