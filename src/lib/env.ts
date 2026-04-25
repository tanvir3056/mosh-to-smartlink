const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
const postgresUrl = process.env.POSTGRES_URL?.trim() || null;

const nodeEnv = process.env.NODE_ENV ?? "development";

export const appEnv = {
  nodeEnv,
  appUrl,
  postgresUrl,
  adminEmail: process.env.ADMIN_EMAIL?.trim() || "admin@local.test",
  demoAdminPassword:
    process.env.DEMO_ADMIN_PASSWORD?.trim() || "dev-password",
  demoSessionSecret:
    process.env.DEMO_SESSION_SECRET?.trim() || "local-demo-session-secret",
  connectorCredentialsSecret:
    process.env.CONNECTOR_CREDENTIALS_SECRET?.trim() ||
    process.env.DEMO_SESSION_SECRET?.trim() ||
    "local-demo-session-secret",
  analyticsSalt:
    process.env.ANALYTICS_HASH_SALT?.trim() || "local-analytics-salt",
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  hasPostgres: Boolean(postgresUrl),
  hasSupabaseAuth: Boolean(supabaseUrl && supabaseAnonKey),
  hasSupabaseAdmin: Boolean(supabaseUrl && supabaseServiceRoleKey),
  isLocalDatabase: !postgresUrl,
  isDemoAuthEnabled:
    nodeEnv !== "production" &&
    (!supabaseUrl || !supabaseAnonKey || process.env.ALLOW_DEMO_AUTH === "true"),
};

export function assertSupabaseAdminEnv() {
  if (!appEnv.hasSupabaseAdmin || !appEnv.supabaseUrl || !appEnv.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase admin credentials are required for this operation. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}
