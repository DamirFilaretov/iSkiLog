import fs from "node:fs"
import path from "node:path"
import pg from "pg"

/**
 * Applies tests/e2e/db/schema.sql — the same file `npm run e2e:db:prepare`
 * runs, and the same one that will be applied to production. Migration tests
 * use this rather than a copy of the statements, so a divergence between the
 * test and the real migration cannot hide.
 */
export async function runSqlFromFile(): Promise<void> {
  const file = path.resolve(process.cwd(), "tests/e2e/db/schema.sql")
  const sql = fs.readFileSync(file, "utf8").replace(/^﻿/, "")
  const client = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}
