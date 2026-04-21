import { readFile } from "node:fs/promises";
import path from "node:path";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { appEnv } from "@/lib/env";

type DatabaseMode = "postgres" | "local";

interface DatabaseRuntime {
  mode: DatabaseMode;
  close(): Promise<void>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
  withTransaction<T>(
    callback: (
      query: <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[],
      ) => Promise<R[]>,
    ) => Promise<T>,
  ): Promise<T>;
}

declare global {
  var __ffmDatabaseRuntimePromise: Promise<DatabaseRuntime> | undefined;
}

let runtimePromise: Promise<DatabaseRuntime> | null =
  globalThis.__ffmDatabaseRuntimePromise ?? null;

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  return String(error).toLowerCase();
}

function shouldRetryDatabaseError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : null;
  const message = normalizeErrorMessage(error);

  return (
    code === "53300" ||
    code === "57P01" ||
    code === "57P03" ||
    code === "08001" ||
    code === "08006" ||
    code === "XX000" ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("client has encountered a connection error") ||
    message.includes("terminating connection") ||
    message.includes("timeout expired") ||
    message.includes("connection timeout") ||
    message.includes("too many clients") ||
    message.includes("remaining connection slots are reserved") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("socket hang up")
  );
}

async function resetDatabaseRuntime() {
  if (!runtimePromise) {
    globalThis.__ffmDatabaseRuntimePromise = undefined;
    return;
  }

  try {
    const runtime = await runtimePromise;
    await runtime.close();
  } catch {
    // Ignore shutdown errors while rotating the runtime.
  } finally {
    runtimePromise = null;
    globalThis.__ffmDatabaseRuntimePromise = undefined;
  }
}

function isSupabaseConnectionString(connectionString: string) {
  return (
    connectionString.includes(".supabase.co") ||
    connectionString.includes(".pooler.supabase.com")
  );
}

function isSupabasePoolerConnection(connectionString: string) {
  return (
    connectionString.includes(".pooler.supabase.com") ||
    connectionString.includes(":6543/")
  );
}

function hasExplicitSslConfig(connectionString: string) {
  return /(?:^|[?&])(sslmode|ssl)=/i.test(connectionString);
}

async function createPgPoolRuntime(): Promise<DatabaseRuntime> {
  const connectionString = appEnv.postgresUrl ?? undefined;
  const isSupabaseConnection = connectionString
    ? isSupabaseConnectionString(connectionString)
    : false;
  const isPoolerConnection = connectionString
    ? isSupabasePoolerConnection(connectionString)
    : false;

  const pool = new Pool({
    connectionString,
    // Keep serverless connection usage tight so Vercel instances do not fan out
    // into a surprising number of database clients.
    max: isPoolerConnection ? 1 : 4,
    min: 0,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    allowExitOnIdle: true,
    application_name: "ffm-smartlink",
    ssl:
      connectionString &&
      isSupabaseConnection &&
      !hasExplicitSslConfig(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
  });

  return {
    mode: "postgres",
    async close() {
      await pool.end();
    },
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ) {
      const result = await pool.query<T>(text, params);
      return result.rows;
    },
    async withTransaction<T>(
      callback: (
        query: <R extends QueryResultRow = QueryResultRow>(
          text: string,
          params?: unknown[],
        ) => Promise<R[]>,
      ) => Promise<T>,
    ) {
      const client = await pool.connect();

      try {
        await client.query("begin");
        const result = await callback((text: string, params?: unknown[]) =>
          queryPgClient(client, text, params),
        );
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function queryPgClient<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  text: string,
  params?: unknown[],
) {
  const result = await client.query<T>(text, params);
  return result.rows;
}

async function createLocalRuntime(): Promise<DatabaseRuntime> {
  const { newDb } = await import("pg-mem");
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260417193000_initial.sql",
  );
  const migrationSql = await readFile(migrationPath, "utf8");
  const memoryDb = newDb({
    autoCreateForeignKeyIndices: true,
  });

  memoryDb.public.none(migrationSql);
  const adapter = memoryDb.adapters.createPg();
  const LocalPool = adapter.Pool as typeof Pool;
  const pool = new LocalPool();

  return {
    mode: "local",
    async close() {
      await pool.end();
    },
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ) {
      const result = await pool.query<T>(text, params);
      return result.rows;
    },
    async withTransaction<T>(
      callback: (
        query: <R extends QueryResultRow = QueryResultRow>(
          text: string,
          params?: unknown[],
        ) => Promise<R[]>,
      ) => Promise<T>,
    ) {
      const client = await pool.connect();

      try {
        await client.query("begin");
        const result = await callback((text: string, params?: unknown[]) =>
          queryPgClient(client, text, params),
        );
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function getDatabaseRuntime() {
  if (!runtimePromise) {
    runtimePromise = appEnv.hasPostgres
      ? createPgPoolRuntime()
      : createLocalRuntime();
    globalThis.__ffmDatabaseRuntimePromise = runtimePromise;
  }

  return runtimePromise;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const runtime = await getDatabaseRuntime();
      return await runtime.query<T>(text, params);
    } catch (error) {
      lastError = error;

      if (attempt === 1 || !shouldRetryDatabaseError(error)) {
        throw error;
      }

      await resetDatabaseRuntime();
    }
  }

  throw lastError;
}

export async function dbTransaction<T>(
  callback: (
    query: <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ) => Promise<R[]>,
  ) => Promise<T>,
) {
  const runtime = await getDatabaseRuntime();
  return runtime.withTransaction(callback);
}

export async function getDatabaseMode() {
  const runtime = await getDatabaseRuntime();
  return runtime.mode;
}
