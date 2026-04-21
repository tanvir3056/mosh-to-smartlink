import { readFile } from "node:fs/promises";
import path from "node:path";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { appEnv } from "@/lib/env";

type DatabaseMode = "postgres" | "local";

interface DatabaseRuntime {
  mode: DatabaseMode;
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
  const runtime = await getDatabaseRuntime();
  return runtime.query<T>(text, params);
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
