import { exec } from "node:child_process"
import path from "node:path"
import process from "node:process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"
import pg from "pg"

dotenv.config({ path: ".env.test" })

const { Client } = pg
const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../../..")

function requireDbUrl() {
  const url = process.env.E2E_SUPABASE_DB_URL
  if (!url) {
    throw new Error("Missing E2E_SUPABASE_DB_URL in .env.test")
  }
  return url
}

/**
 * These helpers reset the database and bulk-delete rows. `resetDb` shells out to
 * `supabase db reset`, which can only ever touch the local stack — but
 * `cleanupTestData` connects to whatever E2E_SUPABASE_DB_URL names. A misconfigured
 * URL (a pooler string, a hosted project) would let cleanup run its deletes
 * against a remote database, so require a loopback host before doing anything.
 */
function requireLocalDbUrl() {
  const url = requireDbUrl()
  const { hostname } = new URL(url)
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
    throw new Error(
      `E2E_SUPABASE_DB_URL host is "${hostname}", not a local address. ` +
        "These scripts reset and bulk-delete data and must only touch the local Supabase stack."
    )
  }
  return url
}

/**
 * Rebuilds the local database from supabase/migrations (baseline from
 * production + the Groups migration) plus supabase/seed.sql — the same migration
 * files `supabase db push` deploys to the hosted project, so the E2E and db-test
 * databases exercise what production will get.
 *
 * Requires the local Supabase stack to be running (`npx supabase start`).
 */
export async function resetDb() {
  requireLocalDbUrl()
  await execAsync("npx supabase db reset", { cwd: repoRoot })
}

export async function cleanupTestData() {
  const emailDomain = process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test"
  const client = new Client({ connectionString: requireLocalDbUrl() })
  await client.connect()

  try {
    await client.query("begin")
    const hasAuthIdentities = await tableExists(client, "auth.identities")
    const hasAuthSessions = await tableExists(client, "auth.sessions")
    const hasAuthRefreshTokens = await tableExists(client, "auth.refresh_tokens")

    await client.query("delete from public.other_sets using public.sets where other_sets.set_id = sets.id and sets.user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.jump_sets using public.sets where jump_sets.set_id = sets.id and sets.user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.tricks_sets using public.sets where tricks_sets.set_id = sets.id and sets.user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.slalom_sets using public.sets where slalom_sets.set_id = sets.id and sets.user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.user_learned_tricks where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.user_in_progress_tricks where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.user_tasks where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.sets where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.seasons where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    // Groups. group_members goes first so the reap trigger clears most groups;
    // the explicit groups delete then catches any created by a test user that
    // another account still belongs to.
    await client.query("delete from public.abuse_reports where reporter_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.user_blocks where blocker_id::text in (select id::text from auth.users where email like $1) or blocked_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.policy_acceptances where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.group_creation_log where creator_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.group_members where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.groups where created_by::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    // A zero-member group is invalid by design, and once its creator's account
    // is gone created_by is null so the clause above can never match it.
    await client.query("delete from public.groups g where not exists (select 1 from public.group_members m where m.group_id = g.id)")

    await client.query("delete from public.profiles where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    if (hasAuthIdentities) {
      await client.query("delete from auth.identities where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    }
    if (hasAuthSessions) {
      await client.query("delete from auth.sessions where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    }
    if (hasAuthRefreshTokens) {
      await client.query("delete from auth.refresh_tokens where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    }
    await client.query("delete from auth.users where email like $1", [`%@${emailDomain}`])

    await client.query("commit")
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.end()
  }
}

async function tableExists(client, qualifiedName) {
  const { rows } = await client.query("select to_regclass($1) is not null as exists", [qualifiedName])
  return rows[0]?.exists === true
}
