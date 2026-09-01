import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"

/** Every function the client is allowed to call. */
const CLIENT_FUNCTIONS = [
  "accept_groups_policy",
  "groups_status",
  "create_group",
  "join_group",
  "leave_group",
  "list_groups",
  "list_my_groups",
  "search_groups",
  "fetch_group_leaderboard",
  "report_group",
  "report_profile",
  "block_group_member",
  "list_blocks",
  "unblock"
]

/** Internal only: reachable from inside definer functions, never from a client. */
const INTERNAL_FUNCTIONS = [
  "canonical_group_name",
  "lock_group",
  "lock_creator",
  "groups_enabled",
  "groups_policy_version",
  "reap_empty_group",
  "normalise_profile_name"
]

const GROUPS_TABLES = [
  "groups",
  "group_members",
  "abuse_reports",
  "user_blocks",
  "policy_acceptances",
  "moderation_terms",
  "group_creation_log",
  "app_settings"
]

/** Functions that legitimately need to read rows the caller does not own. */
const EXPECTED_DEFINERS = new Set([
  ...CLIENT_FUNCTIONS,
  "groups_enabled",
  "groups_policy_version",
  "reap_empty_group",
  "normalise_profile_name"
])

describe("function privileges", () => {
  it("grants EXECUTE to authenticated and to nobody else", async () => {
    const violations = await withAdmin(async c => {
      const found: string[] = []
      for (const fn of CLIENT_FUNCTIONS) {
        const r = await c.query(
          `select p.oid,
                  has_function_privilege('public', p.oid, 'execute')        as pub,
                  has_function_privilege('anon', p.oid, 'execute')          as anon,
                  has_function_privilege('authenticated', p.oid, 'execute') as auth
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = $1`,
          [fn]
        )
        if (r.rows.length !== 1) {
          found.push(`${fn}: expected exactly one overload, found ${r.rows.length}`)
          continue
        }
        const acl = r.rows[0]
        if (acl.pub) found.push(`${fn}: PUBLIC can execute`)
        if (acl.anon) found.push(`${fn}: anon can execute`)
        if (!acl.auth) found.push(`${fn}: authenticated cannot execute`)
      }
      return found
    })
    expect(violations).toEqual([])
  })

  it("keeps internal helpers unreachable from any client role", async () => {
    const violations = await withAdmin(async c => {
      const found: string[] = []
      for (const fn of INTERNAL_FUNCTIONS) {
        const r = await c.query(
          `select p.proname,
                  has_function_privilege('anon', p.oid, 'execute')          as anon,
                  has_function_privilege('authenticated', p.oid, 'execute') as auth
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = $1`,
          [fn]
        )
        for (const row of r.rows) {
          if (row.anon) found.push(`${fn}: anon can execute`)
          if (row.auth) found.push(`${fn}: authenticated can execute`)
        }
      }
      return found
    })
    expect(violations).toEqual([])
  })

  it("uses security definer only where cross-user reads require it", async () => {
    const unexpected = await withAdmin(async c => {
      const r = await c.query(
        `select p.proname from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.prosecdef = true
            and p.proname = any($1)`,
        [[...CLIENT_FUNCTIONS, ...INTERNAL_FUNCTIONS]]
      )
      return r.rows.map(row => row.proname).filter(name => !EXPECTED_DEFINERS.has(name))
    })
    expect(unexpected).toEqual([])
  })

  it("pins an empty search path on every Groups function", async () => {
    const unpinned = await withAdmin(async c => {
      const r = await c.query(
        `select p.proname, p.proconfig from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = any($1)`,
        [[...CLIENT_FUNCTIONS, ...INTERNAL_FUNCTIONS]]
      )
      // Postgres stores the pinned empty path as search_path="" (quoted).
      return r.rows
        .filter(row =>
          !(row.proconfig ?? []).some((entry: string) => entry.startsWith("search_path="))
        )
        .map(row => row.proname)
    })
    expect(unpinned).toEqual([])
  })
})

describe("table privileges", () => {
  it("grants nothing to anon or authenticated on any Groups table", async () => {
    const granted = await withAdmin(async c => {
      const found: string[] = []
      for (const table of GROUPS_TABLES) {
        for (const role of ["anon", "authenticated"]) {
          for (const privilege of ["select", "insert", "update", "delete"]) {
            const r = await c.query("select has_table_privilege($1, $2, $3) as ok", [
              role,
              `public.${table}`,
              privilege
            ])
            if (r.rows[0].ok) found.push(`${role}:${table}:${privilege}`)
          }
        }
      }
      return found
    })
    expect(granted).toEqual([])
  })

  it("enables row level security on every Groups table", async () => {
    const withoutRls = await withAdmin(async c => {
      const r = await c.query(
        `select relname from pg_class
          where relname = any($1) and relnamespace = 'public'::regnamespace
            and relrowsecurity = false`,
        [GROUPS_TABLES]
      )
      return r.rows.map(row => row.relname)
    })
    expect(withoutRls).toEqual([])
  })
})
