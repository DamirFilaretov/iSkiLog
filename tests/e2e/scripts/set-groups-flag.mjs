import process from "node:process"
import dotenv from "dotenv"
import pg from "pg"

/**
 * Flips `app_settings.groups_enabled` in the local project.
 *
 *   node tests/e2e/scripts/set-groups-flag.mjs true    # enable Groups
 *   node tests/e2e/scripts/set-groups-flag.mjs false    # shipped default
 *
 * The seed in schema.sql is `on conflict do nothing`, so a flip made here
 * survives `npm run e2e:db:prepare`. The DB test suite manages the flag per
 * test, so it passes with the flag left in either state.
 */

dotenv.config({ path: ".env.test" })

const value = process.argv[2]
if (value !== "true" && value !== "false") {
  console.error("usage: node tests/e2e/scripts/set-groups-flag.mjs <true|false>")
  process.exit(1)
}

const url = process.env.E2E_SUPABASE_DB_URL
if (!url) {
  console.error("Missing E2E_SUPABASE_DB_URL in .env.test")
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  const { rowCount } = await client.query(
    "update public.app_settings set value = $1 where key = 'groups_enabled'",
    [value]
  )
  if (rowCount === 0) {
    console.error("No groups_enabled row — run `npm run e2e:db:prepare` first")
    process.exit(1)
  }
  console.log(`groups_enabled = ${value}`)
} finally {
  await client.end()
}
