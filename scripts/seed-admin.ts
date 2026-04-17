import { createClient } from "@supabase/supabase-js";

import { ensureAdminAccess } from "../src/lib/data";
import { appEnv } from "../src/lib/env";

async function main() {
  const email = process.argv[2] ?? appEnv.adminEmail;
  const password = process.argv[3] ?? appEnv.demoAdminPassword;

  await ensureAdminAccess(email, null);

  if (!appEnv.hasSupabaseAdmin || !appEnv.supabaseUrl || !appEnv.supabaseServiceRoleKey) {
    console.log("Supabase admin credentials are not configured.");
    console.log(`Local demo admin email: ${email}`);
    console.log(`Local demo admin password: ${password}`);
    return;
  }

  const supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

  if (listError) {
    throw listError;
  }

  const existingUser = existingUsers.users.find((user) => user.email === email);

  const { data, error } = existingUser
    ? await supabase.auth.admin.updateUserById(existingUser.id, {
        email,
        password,
        email_confirm: true,
      })
    : await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

  if (error) {
    throw error;
  }

  await ensureAdminAccess(email, data.user.id);

  console.log(`Admin user ready: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
