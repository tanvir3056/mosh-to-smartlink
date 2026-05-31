// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  getUserByUsername: vi.fn(),
  getUserByAuthUserId: vi.fn(),
  getUserById: vi.fn(),
  getUserByLoginEmail: vi.fn(),
  createAccountOwner: vi.fn(),
  linkUserAuthIdentity: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  serverSignInWithPassword: vi.fn(),
  adminCreateUser: vi.fn(),
  adminGetUserById: vi.fn(),
  adminListUsers: vi.fn(),
  adminUpdateUserById: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/data", () => ({
  createAccountOwner: mocks.createAccountOwner,
  getUserByAuthUserId: mocks.getUserByAuthUserId,
  getUserById: mocks.getUserById,
  getUserByLoginEmail: mocks.getUserByLoginEmail,
  getUserByUsername: mocks.getUserByUsername,
  linkUserAuthIdentity: mocks.linkUserAuthIdentity,
}));

vi.mock("@/lib/passwords", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));

function appUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    authUserId: null,
    username: "artist",
    loginEmail: "artist@users.backstage.local",
    passwordHash: "legacy-password-hash",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z",
    ...overrides,
  };
}

function configureSupabaseEnv(options: { admin?: boolean } = {}) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = options.admin === false ? "" : "service-key";
}

describe("signInUser Supabase account recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    configureSupabaseEnv();

    mocks.createServerClient.mockReturnValue({
      auth: {
        signInWithPassword: mocks.serverSignInWithPassword,
        getUser: vi.fn(),
      },
    });
    mocks.createClient.mockReturnValue({
      auth: {
        admin: {
          createUser: mocks.adminCreateUser,
          getUserById: mocks.adminGetUserById,
          listUsers: mocks.adminListUsers,
          updateUserById: mocks.adminUpdateUserById,
        },
      },
    });
    mocks.adminListUsers.mockResolvedValue({
      data: {
        users: [],
      },
      error: null,
    });
  });

  test("links a mismatched Supabase auth user after a successful sign-in", async () => {
    mocks.getUserByUsername.mockResolvedValue(appUser({ authUserId: "auth_old" }));
    mocks.serverSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "auth_new",
        },
      },
      error: null,
    });
    const { signInUser } = await import("@/lib/auth");

    await expect(signInUser("Artist", "correct-password")).resolves.toEqual({
      error: null,
    });

    expect(mocks.linkUserAuthIdentity).toHaveBeenCalledWith("user_1", "auth_new");
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  test("creates a Supabase auth user when a valid legacy local password can be migrated", async () => {
    mocks.getUserByUsername.mockResolvedValue(appUser());
    mocks.serverSignInWithPassword
      .mockResolvedValueOnce({
        data: {
          user: null,
        },
        error: new Error("Invalid login credentials"),
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "auth_created",
          },
        },
        error: null,
      });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.adminCreateUser.mockResolvedValue({
      data: {
        user: {
          id: "auth_created",
        },
      },
      error: null,
    });
    const { signInUser } = await import("@/lib/auth");

    await expect(signInUser("artist", "correct-password")).resolves.toEqual({
      error: null,
    });

    expect(mocks.verifyPassword).toHaveBeenCalledWith(
      "correct-password",
      "legacy-password-hash",
    );
    expect(mocks.adminCreateUser).toHaveBeenCalledWith({
      email: "artist@users.backstage.local",
      password: "correct-password",
      email_confirm: true,
      user_metadata: {
        username: "artist",
      },
    });
    expect(mocks.linkUserAuthIdentity).toHaveBeenCalledWith(
      "user_1",
      "auth_created",
    );
    expect(mocks.serverSignInWithPassword).toHaveBeenCalledTimes(2);
  });

  test("repairs an existing linked Supabase auth user when a valid legacy local password can be migrated", async () => {
    mocks.getUserByUsername.mockResolvedValue(appUser({ authUserId: "auth_existing" }));
    mocks.serverSignInWithPassword
      .mockResolvedValueOnce({
        data: {
          user: null,
        },
        error: new Error("Invalid login credentials"),
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "auth_existing",
          },
        },
        error: null,
      });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.adminGetUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_existing",
        },
      },
      error: null,
    });
    mocks.adminUpdateUserById.mockResolvedValue({
      data: {
        user: {
          id: "auth_existing",
        },
      },
      error: null,
    });
    const { signInUser } = await import("@/lib/auth");

    await expect(signInUser("artist", "correct-password")).resolves.toEqual({
      error: null,
    });

    expect(mocks.adminUpdateUserById).toHaveBeenCalledWith("auth_existing", {
      email: "artist@users.backstage.local",
      password: "correct-password",
      email_confirm: true,
      user_metadata: {
        username: "artist",
      },
    });
    expect(mocks.adminCreateUser).not.toHaveBeenCalled();
  });

  test("keeps the generic credential error when the legacy local password does not match", async () => {
    mocks.getUserByUsername.mockResolvedValue(appUser());
    mocks.serverSignInWithPassword.mockResolvedValue({
      data: {
        user: null,
      },
      error: new Error("Invalid login credentials"),
    });
    mocks.verifyPassword.mockResolvedValue(false);
    const { signInUser } = await import("@/lib/auth");

    await expect(signInUser("artist", "wrong-password")).resolves.toEqual({
      error: "That username or password is incorrect.",
    });
    expect(mocks.adminCreateUser).not.toHaveBeenCalled();
    expect(mocks.adminUpdateUserById).not.toHaveBeenCalled();
  });

  test("returns a controlled migration error when admin credentials are missing", async () => {
    configureSupabaseEnv({ admin: false });
    mocks.getUserByUsername.mockResolvedValue(appUser());
    mocks.serverSignInWithPassword.mockResolvedValue({
      data: {
        user: null,
      },
      error: new Error("Invalid login credentials"),
    });
    mocks.verifyPassword.mockResolvedValue(true);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { signInUser } = await import("@/lib/auth");

    await expect(signInUser("artist", "correct-password")).resolves.toEqual({
      error: "This account needs a one-time login repair. Contact support to restore access.",
    });

    expect(consoleError).toHaveBeenCalledWith(
      "Supabase legacy account migration is blocked by missing admin credentials.",
      {
        userId: "user_1",
        username: "artist",
      },
    );
    expect(mocks.adminCreateUser).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
