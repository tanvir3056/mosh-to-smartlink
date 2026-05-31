import { createHmac, timingSafeEqual } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { createClient, type User } from "@supabase/supabase-js";
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
import type { AppUserRecord } from "@/lib/types";
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

const incorrectCredentialsError = "That username or password is incorrect.";
const accountRepairRequiredError =
  "This account needs a one-time login repair. Contact support to restore access.";

function isSupabaseServiceUnavailableError(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : null;
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    (typeof status === "number" && status >= 500) ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("enotfound") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable")
  );
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

type SupabaseAdminClient = ReturnType<typeof createAdminSupabaseClient>;
type SupabaseLoginRecovery =
  | {
      authUserId: string | null;
      error: null;
      mode: "supabase" | "local";
    }
  | {
      authUserId: null;
      error: string;
      mode: null;
    };

function buildLegacySupabaseAuthAttributes(
  user: AppUserRecord,
  password: string,
) {
  return {
    email: user.loginEmail,
    password,
    email_confirm: true,
    user_metadata: {
      username: user.username,
    },
  };
}

async function getLinkedSupabaseAuthUser(
  admin: SupabaseAdminClient,
  user: AppUserRecord,
) {
  if (!user.authUserId) {
    return null;
  }

  const { data, error } = await admin.auth.admin.getUserById(user.authUserId);

  if (error) {
    console.warn("Linked Supabase auth user lookup failed during login repair.", {
      userId: user.id,
      authUserId: user.authUserId,
      error: error.message,
    });
    return null;
  }

  return data.user ?? null;
}

async function findSupabaseAuthUserByEmail(
  admin: SupabaseAdminClient,
  email: string,
) {
  const normalizedEmail = email.toLowerCase();
  const perPage = 100;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.warn("Supabase auth user email lookup failed during login repair.", {
        email,
        error: error.message,
      });
      return null;
    }

    const users = data.users ?? [];
    const matchingUser = users.find(
      (candidate: User) => candidate.email?.toLowerCase() === normalizedEmail,
    );

    if (matchingUser) {
      return matchingUser;
    }

    if (users.length < perPage) {
      return null;
    }
  }

  return null;
}

async function updateLegacySupabaseAuthUser(
  admin: SupabaseAdminClient,
  user: AppUserRecord,
  authUserId: string,
  password: string,
): Promise<SupabaseLoginRecovery> {
  const { data, error } = await admin.auth.admin.updateUserById(
    authUserId,
    buildLegacySupabaseAuthAttributes(user, password),
  );

  if (error || !data.user?.id) {
    console.error("Supabase legacy account repair failed while updating auth user. Falling back to a local session.", {
      userId: user.id,
      authUserId,
      error: error?.message ?? "No Supabase auth user returned.",
    });
    await writeLocalSessionForUser(user);
    return { authUserId: user.authUserId, error: null, mode: "local" };
  }

  return {
    authUserId: data.user.id,
    error: null,
    mode: "supabase",
  };
}

async function createLegacySupabaseAuthUser(
  admin: SupabaseAdminClient,
  user: AppUserRecord,
  password: string,
): Promise<SupabaseLoginRecovery> {
  const { data, error } = await admin.auth.admin.createUser(
    buildLegacySupabaseAuthAttributes(user, password),
  );

  if (!error && data.user?.id) {
    return {
      authUserId: data.user.id,
      error: null,
      mode: "supabase",
    };
  }

  const existingUser = await findSupabaseAuthUserByEmail(admin, user.loginEmail);

  if (existingUser?.id) {
    return updateLegacySupabaseAuthUser(
      admin,
      user,
      existingUser.id,
      password,
    );
  }

  console.error("Supabase legacy account migration failed while creating auth user. Falling back to a local session.", {
    userId: user.id,
    username: user.username,
    error: error?.message ?? "No Supabase auth user returned.",
  });

  await writeLocalSessionForUser(user);
  return { authUserId: user.authUserId, error: null, mode: "local" };
}

async function recoverLegacySupabaseAccount(
  user: AppUserRecord,
  password: string,
): Promise<SupabaseLoginRecovery> {
  if (!user.passwordHash) {
    return {
      authUserId: null,
      error: incorrectCredentialsError,
      mode: null,
    };
  }

  const matches = await verifyPassword(password, user.passwordHash);

  if (!matches) {
    return {
      authUserId: null,
      error: incorrectCredentialsError,
      mode: null,
    };
  }

  if (!appEnv.hasSupabaseAdmin) {
    console.error(
      "Supabase legacy account migration is blocked by missing admin credentials. Falling back to a local session.",
      {
        userId: user.id,
        username: user.username,
      },
    );
    await writeLocalSessionForUser(user);
    return { authUserId: user.authUserId, error: null, mode: "local" };
  }

  try {
    const admin = createAdminSupabaseClient();
    const existingUser =
      (await getLinkedSupabaseAuthUser(admin, user)) ??
      (await findSupabaseAuthUserByEmail(admin, user.loginEmail));

    if (existingUser?.id) {
      return updateLegacySupabaseAuthUser(
        admin,
        user,
        existingUser.id,
        password,
      );
    }

    return createLegacySupabaseAuthUser(admin, user, password);
  } catch (error) {
    console.error(
      "Supabase legacy account migration threw during login. Falling back to a local session.",
      {
        userId: user.id,
        username: user.username,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    await writeLocalSessionForUser(user);
    return { authUserId: user.authUserId, error: null, mode: "local" };
  }
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

async function writeLocalSessionForUser(user: AppUserRecord) {
  await writeLocalSessionCookie({
    userId: user.id,
    username: user.username,
    loginEmail: user.loginEmail,
  });
}

async function createLocalPasswordAccount(input: {
  normalizedUsername: string;
  loginEmail: string;
  password: string;
}) {
  const userId = createId("user");
  const passwordHash = await hashPassword(input.password);
  const user = await createAccountOwner({
    userId,
    username: input.normalizedUsername,
    loginEmail: input.loginEmail,
    passwordHash,
  });

  await writeLocalSessionForUser(user);

  return { error: null };
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
  try {
    if (appEnv.hasSupabaseAuth) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        return await getLocalSession();
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

    return await getLocalSession();
  } catch (error) {
    console.error("Failed to resolve user session.", error);
    try {
      return await getLocalSession();
    } catch (localSessionError) {
      console.error("Failed to resolve fallback local user session.", localSessionError);
      return null;
    }
  }
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
      error: incorrectCredentialsError,
    };
  }

  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.loginEmail,
      password,
    });

    if (error || !data.user?.id) {
      const recovery = await recoverLegacySupabaseAccount(user, password);

      if (recovery.error) {
        return {
          error: recovery.error,
        };
      }

      if (recovery.mode === "local") {
        return { error: null };
      }

      const retry = await supabase.auth.signInWithPassword({
        email: user.loginEmail,
        password,
      });

      if (retry.error || !retry.data.user?.id) {
        console.error("Supabase sign-in failed after legacy account repair.", {
          userId: user.id,
          username: user.username,
          authUserId: recovery.authUserId,
          error: retry.error?.message ?? "No Supabase auth user returned.",
        });
        return {
          error: accountRepairRequiredError,
        };
      }

      if (retry.data.user.id !== user.authUserId) {
        await linkUserAuthIdentity(user.id, retry.data.user.id);
      }

      return { error: null };
    }

    if (data.user.id !== user.authUserId) {
      await linkUserAuthIdentity(user.id, data.user.id);
    }

    return { error: null };
  }

  const matches = await verifyPassword(password, user.passwordHash);

  if (!matches) {
    return {
      error: incorrectCredentialsError,
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
      console.error(
        "Supabase sign-up is missing admin credentials. Falling back to a local password account.",
        { username: normalized },
      );
      return createLocalPasswordAccount({
        normalizedUsername: normalized,
        loginEmail,
        password,
      });
    }

    const admin = createAdminSupabaseClient();
    let createResult: Awaited<ReturnType<typeof admin.auth.admin.createUser>>;

    try {
      createResult = await admin.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: normalized,
        },
      });
    } catch (error) {
      console.error(
        "Supabase account creation threw during sign-up. Falling back to a local password account.",
        {
          username: normalized,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return createLocalPasswordAccount({
        normalizedUsername: normalized,
        loginEmail,
        password,
      });
    }

    const { data, error } = createResult;

    if (error || !data.user?.id) {
      if (error && isSupabaseServiceUnavailableError(error)) {
        console.error(
          "Supabase account creation was unavailable during sign-up. Falling back to a local password account.",
          {
            username: normalized,
            error: error.message,
          },
        );
        return createLocalPasswordAccount({
          normalizedUsername: normalized,
          loginEmail,
          password,
        });
      }

      return {
        error: error?.message ?? "The account could not be created.",
      };
    }

    const passwordHash = await hashPassword(password);
    let appUser: AppUserRecord;

    try {
      appUser = await createAccountOwner({
        userId: data.user.id,
        authUserId: data.user.id,
        username: normalized,
        loginEmail,
        passwordHash,
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
    let signIn: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

    try {
      signIn = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
    } catch (error) {
      console.error(
        "Supabase sign-in threw after account creation. Falling back to a local session.",
        {
          username: normalized,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      await writeLocalSessionForUser(appUser);
      return { error: null };
    }

    if (signIn.error) {
      if (isSupabaseServiceUnavailableError(signIn.error)) {
        console.error(
          "Supabase sign-in was unavailable after account creation. Falling back to a local session.",
          {
            username: normalized,
            error: signIn.error.message,
          },
        );
        await writeLocalSessionForUser(appUser);
        return { error: null };
      }

      return {
        error: signIn.error.message,
      };
    }

    return { error: null };
  }

  return createLocalPasswordAccount({
    normalizedUsername: normalized,
    loginEmail,
    password,
  });
}

export async function signOutUser() {
  if (appEnv.hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
