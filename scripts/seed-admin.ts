import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [{ createAdminSupabaseClient }, { createAccountOwner, getUserByUsername, linkUserAuthIdentity, updateLocalPasswordHash }, { appEnv }, { hashPassword }, { normalizeUsername }] =
    await Promise.all([
      import("../src/lib/auth"),
      import("../src/lib/data"),
      import("../src/lib/env"),
      import("../src/lib/passwords"),
      import("../src/lib/utils"),
    ]);

  const firstArg = process.argv[2] ?? appEnv.adminEmail;
  const password = process.argv[3] ?? appEnv.demoAdminPassword;
  const username = normalizeUsername(
    firstArg.includes("@") ? firstArg.split("@")[0] ?? "owner" : firstArg,
  );
  const loginEmail =
    firstArg.includes("@") ? firstArg : `${username}@users.backstage.local`;

  const existingUser = await getUserByUsername(username);

  if (!appEnv.hasSupabaseAdmin || !appEnv.supabaseUrl || !appEnv.supabaseServiceRoleKey) {
    const passwordHash = await hashPassword(password);

    if (existingUser) {
      await updateLocalPasswordHash(existingUser.id, passwordHash);
      console.log(`Local user updated: ${username}`);
      return;
    }

    await createAccountOwner({
      userId: `user_${crypto.randomUUID()}`,
      username,
      loginEmail,
      passwordHash,
    });

    console.log(`Local user ready: ${username}`);
    return;
  }

  const supabase = createAdminSupabaseClient();

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    throw listError;
  }

  const existingAuthUser =
    existingUsers.users.find((user) => user.email === loginEmail) ??
    (existingUser?.authUserId
      ? existingUsers.users.find((user) => user.id === existingUser.authUserId)
      : undefined);

  const { data, error } = existingAuthUser
    ? await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        email: loginEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username,
        },
      })
    : await supabase.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username,
        },
      });

  if (error || !data.user?.id) {
    throw error ?? new Error("The Supabase user could not be created.");
  }

  if (existingUser) {
    await linkUserAuthIdentity(existingUser.id, data.user.id);
    console.log(`User updated: ${username}`);
    return;
  }

  await createAccountOwner({
    userId: data.user.id,
    authUserId: data.user.id,
    username,
    loginEmail,
  });

  console.log(`User ready: ${username}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
