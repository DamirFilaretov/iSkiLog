import fs from "node:fs"
import path from "node:path"
import pg from "pg"

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations")

/** The baseline is a production dump — not idempotent, never re-applied here. */
function featureMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql") && !f.endsWith("_baseline_from_production.sql"))
    .sort()
}

/**
 * Re-applies the feature migrations (everything after the baseline) in order,
 * against the shared test database.
 *
 * This is deliberately NOT what `supabase db push` does — push runs each pending
 * migration once and skips applied ones. The feature migrations are written
 * idempotently (create-or-replace / if-not-exists / drop-and-recreate), so
 * re-running them converges to the same state `supabase db reset` produces.
 *
 * Its purpose is the upgrade path: the shared DB is always freshly migrated, so
 * it has no rows that predate a migration's data-touching statements (the
 * profiles full_name backfill, `add constraint profiles_full_name_length`). A
 * test plants such a row, then calls this to prove those statements handle it.
 */
export async function applyFeatureMigrations(): Promise<void> {
  const url = process.env.E2E_SUPABASE_DB_URL
  if (url && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(url).hostname)) {
    throw new Error("E2E_SUPABASE_DB_URL is not a local address — refusing to apply migrations")
  }
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    for (const file of featureMigrationFiles()) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8").replace(/^﻿/, "")
      await client.query(sql)
    }
  } finally {
    await client.end()
  }
}
