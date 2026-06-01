import { readdir, readFile } from "node:fs/promises";
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

const localSnapshotPath = "backstage/local-database-snapshot.json";
const persistedLocalTables = [
  "admin_access",
  "app_users",
  "tracking_config",
  "songs",
  "song_pages",
  "streaming_links",
  "import_attempts",
  "visits",
  "click_events",
  "email_connectors",
  "email_capture_submissions",
] as const;

type LocalTableName = (typeof persistedLocalTables)[number];
const localTablesInDeleteOrder = [...persistedLocalTables].reverse();

interface LocalTableSnapshot {
  columns: string[];
  rows: Record<string, unknown>[];
}

interface LocalDatabaseSnapshot {
  version: 1;
  savedAt: string;
  tables: Partial<Record<LocalTableName, LocalTableSnapshot>>;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll("\"", "\"\"")}"`;
}

function isLocalMutationQuery(text: string) {
  return /^(insert|update|delete|truncate|alter|create|drop)\b/i.test(text.trim());
}

function canPersistLocalRuntime() {
  return appEnv.hasBlobPersistence;
}

async function readLocalSnapshotFromBlob() {
  if (!canPersistLocalRuntime()) {
    return null;
  }

  const { get } = await import("@vercel/blob");
  const result = await get(localSnapshotPath, {
    access: "private",
    useCache: false,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const body = await new Response(result.stream).text();
  return JSON.parse(body) as LocalDatabaseSnapshot;
}

async function restoreLocalSnapshot(pool: Pool) {
  const snapshot = await readLocalSnapshotFromBlob();

  if (!snapshot || snapshot.version !== 1) {
    return;
  }

  await insertLocalSnapshotRows(pool, snapshot);
}

async function insertLocalSnapshotRows(
  pool: Pool,
  snapshot: LocalDatabaseSnapshot,
) {
  for (const tableName of persistedLocalTables) {
    const table = snapshot.tables[tableName];

    if (!table || table.rows.length === 0 || table.columns.length === 0) {
      continue;
    }

    const columnList = table.columns.map(quoteIdentifier).join(", ");
    const valuePlaceholders = table.columns
      .map((_, index) => `$${index + 1}`)
      .join(", ");

    for (const row of table.rows) {
      await pool.query(
        `
          insert into ${quoteIdentifier(tableName)} (${columnList})
          values (${valuePlaceholders})
          on conflict do nothing
        `,
        table.columns.map((column) => row[column] ?? null),
      );
    }
  }
}

async function replaceLocalSnapshotRows(
  pool: Pool,
  snapshot: LocalDatabaseSnapshot,
) {
  await pool.query("begin");

  try {
    for (const tableName of localTablesInDeleteOrder) {
      await pool.query(`delete from ${quoteIdentifier(tableName)}`);
    }

    await insertLocalSnapshotRows(pool, snapshot);
    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }
}

function createLocalSnapshotRefresher(pool: Pool) {
  let refreshQueue = Promise.resolve();

  return async function refreshLocalSnapshot() {
    if (!canPersistLocalRuntime()) {
      return;
    }

    refreshQueue = refreshQueue
      .catch(() => {
        // A later refresh should still be able to run after a transient failure.
      })
      .then(async () => {
        try {
          const snapshot = await readLocalSnapshotFromBlob();

          if (snapshot?.version === 1) {
            await replaceLocalSnapshotRows(pool, snapshot);
          }
        } catch (error) {
          console.warn("Failed to refresh local database snapshot.", error);
        }
      });

    await refreshQueue;
  };
}

async function buildLocalSnapshot(pool: Pool): Promise<LocalDatabaseSnapshot> {
  const snapshot: LocalDatabaseSnapshot = {
    version: 1,
    savedAt: new Date().toISOString(),
    tables: {},
  };

  for (const tableName of persistedLocalTables) {
    const result = await pool.query<Record<string, unknown>>(
      `select * from ${quoteIdentifier(tableName)}`,
    );
    const rowColumnNames = result.rows[0] ? Object.keys(result.rows[0]) : [];

    snapshot.tables[tableName] = {
      columns:
        result.fields.length > 0
          ? result.fields.map((field) => field.name)
          : rowColumnNames,
      rows: result.rows,
    };
  }

  return snapshot;
}

async function writeLocalSnapshotToBlob(snapshot: LocalDatabaseSnapshot) {
  if (!canPersistLocalRuntime()) {
    return;
  }

  const { put } = await import("@vercel/blob");

  await put(localSnapshotPath, JSON.stringify(snapshot), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
  });
}

function createLocalSnapshotPersister(pool: Pool) {
  let persistQueue = Promise.resolve();

  return async function persistLocalSnapshot() {
    if (!canPersistLocalRuntime()) {
      return;
    }

    persistQueue = persistQueue
      .catch(() => {
        // A later write should still be able to persist after a transient failure.
      })
      .then(async () => {
        const snapshot = await buildLocalSnapshot(pool);
        await writeLocalSnapshotToBlob(snapshot);
      });

    await persistQueue;
  };
}

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

function prepareMigrationSqlForLocalRuntime(entry: string, sql: string) {
  let prepared = sql
    .replace(/do\s+\$\$[\s\S]*?\$\$;/gi, "")
    .replace(
      /alter table(?:\s+if exists)?\s+tracking_config\s+drop constraint(?:\s+if exists)?\s+tracking_config_id_check\s*;/gi,
      "",
    )
    .replace(
      /alter table(?:\s+if exists)?\s+songs\s+drop constraint(?:\s+if exists)?\s+songs_spotify_track_id_key\s*;/gi,
      "",
    )
    .replace(
      /alter table(?:\s+if exists)?\s+song_pages\s+drop constraint(?:\s+if exists)?\s+song_pages_slug_key\s*;/gi,
      "",
    )
    .replace(
      /alter table(?:\s+if exists)?\s+streaming_links\s+drop constraint(?:\s+if exists)?\s+streaming_links_review_status_check\s*;/gi,
      "",
    )
    .replace(/\bif not exists\b/gi, "")
    .replace(/\bif exists\b/gi, "");

  if (entry === "20260417193000_initial.sql") {
    prepared = prepared
      .replace(
        /id text primary key check \(id = 'singleton'\),/g,
        "id text primary key,",
      )
      .replace(/spotify_track_id text not null unique,/g, "spotify_track_id text not null,")
      .replace(/slug text not null unique,/g, "slug text not null,");
  }

  if (entry === "20260422183000_multi_account.sql") {
    return `
create table app_users (
  id text primary key,
  auth_user_id text unique,
  username text not null unique,
  login_email text not null unique,
  password_hash text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

alter table tracking_config add column owner_user_id text references app_users(id) on delete cascade;
alter table songs add column owner_user_id text references app_users(id) on delete cascade;
alter table song_pages add column owner_user_id text references app_users(id) on delete cascade;
alter table visits add column owner_user_id text references app_users(id) on delete cascade;
alter table click_events add column owner_user_id text references app_users(id) on delete cascade;
alter table import_attempts add column owner_user_id text references app_users(id) on delete cascade;

alter table songs
  add constraint songs_owner_spotify_track_key unique (owner_user_id, spotify_track_id);
alter table song_pages
  add constraint song_pages_owner_slug_key unique (owner_user_id, slug);
alter table tracking_config
  add constraint tracking_config_owner_user_id_key unique (owner_user_id);
create index if not exists songs_owner_updated_idx
  on songs (owner_user_id, updated_at desc);
create index if not exists song_pages_owner_status_idx
  on song_pages (owner_user_id, status, updated_at desc);
create index if not exists visits_owner_created_idx
  on visits (owner_user_id, created_at desc);
create index if not exists click_events_owner_created_idx
  on click_events (owner_user_id, created_at desc);
create index if not exists import_attempts_owner_created_idx
  on import_attempts (owner_user_id, created_at desc);
`;
  }

  return prepared;
}

async function createLocalRuntime(): Promise<DatabaseRuntime> {
  const { newDb } = await import("pg-mem");
  const migrationDirectory = path.join(process.cwd(), "supabase", "migrations");
  const migrationEntries = (await readdir(migrationDirectory))
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
  const memoryDb = newDb({
    autoCreateForeignKeyIndices: true,
  });

  for (const entry of migrationEntries) {
    const migrationPath = path.join(migrationDirectory, entry);
    const migrationSql = await readFile(migrationPath, "utf8");
    memoryDb.public.none(prepareMigrationSqlForLocalRuntime(entry, migrationSql));
  }

  const adapter = memoryDb.adapters.createPg();
  const LocalPool = adapter.Pool as typeof Pool;
  const pool = new LocalPool();
  await restoreLocalSnapshot(pool);
  const refreshLocalSnapshot = createLocalSnapshotRefresher(pool);
  const persistLocalSnapshot = createLocalSnapshotPersister(pool);

  return {
    mode: "local",
    async close() {
      await pool.end();
    },
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ) {
      if (isLocalMutationQuery(text)) {
        await refreshLocalSnapshot();
      }

      const result = await pool.query<T>(text, params);
      if (isLocalMutationQuery(text)) {
        await persistLocalSnapshot();
      }
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
      await refreshLocalSnapshot();
      const client = await pool.connect();

      try {
        await client.query("begin");
        const result = await callback((text: string, params?: unknown[]) =>
          queryPgClient(client, text, params),
        );
        await client.query("commit");
        await persistLocalSnapshot();
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
