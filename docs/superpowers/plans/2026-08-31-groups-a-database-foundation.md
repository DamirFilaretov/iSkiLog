# Groups — Plan A: Database Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and prove the entire server-side security boundary for Groups — six tables, two helpers, one trigger and eleven RPCs — with a database-level test suite that runs as real `anon` and `authenticated` roles.

**Architecture:** Nothing in this feature is client-reachable except `user_blocks`. All privileges are revoked from `anon` and `authenticated` on every other Groups table; RLS stays enabled behind that as defence in depth. Every cross-user read goes through a `security definer` RPC that checks membership and returns aggregates only. Tests drive each object into existence: assert the behaviour, watch it fail because the object does not exist, write the SQL, watch it pass.

**Tech Stack:** PostgreSQL (Supabase), `pg` for admin/catalogue assertions, `@supabase/supabase-js` for real role-scoped clients, Vitest as the runner.

**Spec:** `docs/superpowers/specs/2026-08-31-groups-design.md`

**This is plan 1 of 3.** Plan A delivers a verified database boundary and nothing user-visible. Plan B (client foundation, directory, consent gate, navigation) and Plan C (leaderboard UI, moderation UI, policy copy, two-user E2E) follow. Plan B consumes the exact RPC signatures produced here, so it is written after A is built rather than guessed at now.

## Global Constraints

- Every function is `security definer` with `set search_path = ''` and every relation fully qualified.
- Every function is followed by `revoke execute ... from public, anon` and `grant execute ... to authenticated`.
- Every `create policy` is preceded by `drop policy if exists` — `schema.sql` is re-applied on every E2E run.
- Where a function's signature or return type changes, `drop function if exists` first.
- `tests/e2e/db/schema.sql` is the source of truth for schema. All DDL lands there.
- Never grant table privileges to `anon` or `authenticated` except on `public.user_blocks`.
- Never return an `auth.users` UUID to a client.
- Error codes are fixed by the spec: `23505` duplicate name, `22023` validation/quota/denylist, `42501` not-a-member or unconsented, `P0002` group not found, `28000` unauthenticated.
- Group name: 2–40 characters. Description: ≤ 200. `profiles.full_name`: ≤ 60. Report reason: truncated to 500.
- Quota: 10 live groups per creator, 5 creations per hour, `list_groups` hard `limit 200`.
- Periods are exactly `'7d'` (6 days back) and `'30d'` (29 days back), inclusive of today in the caller's timezone.

---

### Task 1: Database test harness

**Files:**
- Create: `vitest.db.config.ts`
- Create: `tests/db/setup.ts`
- Create: `tests/db/helpers/admin.ts`
- Create: `tests/db/helpers/users.ts`
- Create: `tests/db/harness.test.ts`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: `.env.test` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `E2E_SUPABASE_DB_URL`, `E2E_TEST_EMAIL_DOMAIN`)
- Produces: `withAdmin<T>(fn: (c: pg.Client) => Promise<T>): Promise<T>`, `anonClient(): SupabaseClient`, `createTestUser(): Promise<TestUser>` where `TestUser = { client: SupabaseClient; userId: string; email: string }`

`npm run test` is `vitest src`, so these tests need their own config and script or they will never run.

- [ ] **Step 1: Write the failing test**

Create `tests/db/harness.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient } from "./helpers/users"

describe("db harness", () => {
  it("connects as admin and sees an existing table", async () => {
    const rows = await withAdmin(async c => {
      const r = await c.query("select to_regclass('public.sets') is not null as ok")
      return r.rows
    })
    expect(rows[0].ok).toBe(true)
  })

  it("creates an authenticated user client", async () => {
    const user = await createTestUser()
    expect(user.userId).toMatch(/^[0-9a-f-]{36}$/)
    const { data } = await user.client.auth.getUser()
    expect(data.user?.id).toBe(user.userId)
  })

  it("provides an anonymous client with no session", async () => {
    const { data } = await anonClient().auth.getUser()
    expect(data.user).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.db.config.ts`
Expected: FAIL — cannot resolve `vitest.db.config.ts`, then cannot resolve `./helpers/admin`.

- [ ] **Step 3: Write minimal implementation**

`vitest.db.config.ts`:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/db/setup.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    fileParallelism: false
  }
})
```

`fileParallelism: false` because these tests share one database and several assert on global catalogue state.

`tests/db/setup.ts`:

```ts
import dotenv from "dotenv"

dotenv.config({ path: ".env.test" })

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "E2E_SUPABASE_DB_URL"
]

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env.test`)
}
```

`tests/db/helpers/admin.ts`:

```ts
import pg from "pg"

export async function withAdmin<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

/** Opens a second independent connection, for concurrency tests. */
export async function openAdmin(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await client.connect()
  return client
}
```

`tests/db/helpers/users.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type TestUser = { client: SupabaseClient; userId: string; email: string }

const PASSWORD = "Passw0rd!db-test"

function url() { return process.env.VITE_SUPABASE_URL as string }
function anonKey() { return process.env.VITE_SUPABASE_ANON_KEY as string }

export function anonClient(): SupabaseClient {
  return createClient(url(), anonKey(), { auth: { persistSession: false } })
}

export async function createTestUser(): Promise<TestUser> {
  const domain = process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test"
  const email = `qa+db-${Date.now()}-${Math.floor(Math.random() * 1e6)}@${domain}`
  const client = createClient(url(), anonKey(), { auth: { persistSession: false } })

  const { error } = await client.auth.signUp({ email, password: PASSWORD })
  if (error) throw error

  const { data: sessionData } = await client.auth.getSession()
  if (!sessionData.session) {
    const { error: signInError } =
      await client.auth.signInWithPassword({ email, password: PASSWORD })
    if (signInError) throw signInError
  }

  const { data, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!data.user) throw new Error("No user after sign-up")

  return { client, userId: data.user.id, email }
}
```

Add to `package.json` scripts, after `"test:run"`:

```json
"test:db": "vitest run --config vitest.db.config.ts",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add vitest.db.config.ts tests/db package.json
git commit -m "test(groups): add database-level test harness"
```

---

### Task 2: Shared SQL helpers

**Files:**
- Modify: `tests/e2e/db/schema.sql` (append a Groups section at the end)
- Create: `tests/db/helpers.test.ts`

**Interfaces:**
- Consumes: `withAdmin` from Task 1
- Produces: `public.canonical_group_name(text) returns text` (immutable), `public.lock_group(uuid) returns void`

`canonical_group_name` must be `immutable` or it cannot back a unique index.

- [ ] **Step 1: Write the failing test**

Create `tests/db/helpers.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"

async function canonical(input: string | null): Promise<string> {
  return withAdmin(async c => {
    const r = await c.query("select public.canonical_group_name($1) as v", [input])
    return r.rows[0].v
  })
}

describe("canonical_group_name", () => {
  it("lowercases, trims and collapses internal whitespace", async () => {
    expect(await canonical("  Ski   Club  ")).toBe("ski club")
    expect(await canonical("Ski Club")).toBe("ski club")
    expect(await canonical("SKI\tCLUB")).toBe("ski club")
  })

  it("maps null to the empty string", async () => {
    expect(await canonical(null)).toBe("")
  })

  it("is immutable, so it can back an index", async () => {
    const rows = await withAdmin(async c => {
      const r = await c.query(
        "select provolatile from pg_proc where proname = 'canonical_group_name'")
      return r.rows
    })
    expect(rows[0].provolatile).toBe("i")
  })
})

describe("lock_group", () => {
  it("acquires a transaction-scoped advisory lock", async () => {
    const held = await withAdmin(async c => {
      await c.query("begin")
      await c.query("select public.lock_group('00000000-0000-0000-0000-000000000001')")
      const r = await c.query(
        "select count(*)::int as n from pg_locks where locktype = 'advisory'")
      await c.query("rollback")
      return r.rows[0].n
    })
    expect(held).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `function public.canonical_group_name(unknown) does not exist`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
-- ============================================================
-- Groups feature
-- ============================================================

create or replace function public.canonical_group_name(p_name text)
returns text language sql immutable set search_path = '' as $fn$
  select lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')))
$fn$;

create or replace function public.lock_group(p_group_id uuid)
returns void language sql set search_path = '' as $fn$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_group_id::text, 0))
$fn$;
```

Apply it: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/helpers.test.ts
git commit -m "feat(groups): add canonical_group_name and lock_group helpers"
```

---

### Task 3: Core tables and the uniqueness invariant

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/tables.test.ts`

**Interfaces:**
- Produces: `public.groups`, `public.group_members` with `groups_name_unique` on `canonical_group_name(name)`

The unique index is built on the helper, not on raw `lower(btrim(name))`, so a dashboard or import write cannot slip a duplicate past it.

- [ ] **Step 1: Write the failing test**

Create `tests/db/tables.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"

describe("groups table", () => {
  it("rejects names that differ only by case or whitespace", async () => {
    await withAdmin(async c => {
      await c.query("begin")
      await c.query("insert into public.groups (name) values ('Ski Club')")

      await expect(
        c.query("insert into public.groups (name) values ('ski club')")
      ).rejects.toMatchObject({ code: "23505" })

      await c.query("rollback")
    })

    await withAdmin(async c => {
      await c.query("begin")
      await c.query("insert into public.groups (name) values ('Ski Club')")

      await expect(
        c.query("insert into public.groups (name) values ('  Ski   Club  ')")
      ).rejects.toMatchObject({ code: "23505" })

      await c.query("rollback")
    })
  })

  it("gives each membership an opaque id distinct from the user id", async () => {
    const row = await withAdmin(async c => {
      await c.query("begin")
      const g = await c.query(
        "insert into public.groups (name) values ('Opaque Id Test') returning id")
      const u = await c.query("select id from auth.users limit 1")
      const m = await c.query(
        `insert into public.group_members (group_id, user_id)
         values ($1, $2) returning id, user_id`,
        [g.rows[0].id, u.rows[0].id])
      await c.query("rollback")
      return m.rows[0]
    })
    expect(row.id).not.toBe(row.user_id)
  })
})
```

The second test needs at least one row in `auth.users`; the harness creates users in Task 1, and E2E setup leaves users behind. If it fails on an empty database, call `createTestUser()` first.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `relation "public.groups" does not exist`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
create table if not exists public.groups (
  id          uuid primary key default extensions.gen_random_uuid(),
  name        text not null,
  description text not null default '',
  logo_key    text null,
  created_by  uuid null references auth.users(id) on delete set null,
  created_at  timestamptz not null default timezone('utc', now())
);

create unique index if not exists groups_name_unique
  on public.groups (public.canonical_group_name(name));

create index if not exists idx_groups_created_by_created_at
  on public.groups (created_by, created_at desc);

create table if not exists public.group_members (
  id        uuid not null unique default extensions.gen_random_uuid(),
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user_id
  on public.group_members (user_id);
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/tables.test.ts
git commit -m "feat(groups): add groups and group_members tables"
```

---

### Task 4: Privilege revocation

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/privileges.test.ts`

**Interfaces:**
- Produces: zero table privileges for `anon` and `authenticated` on `groups` and `group_members`

This is the finding that made the earlier design unsafe: in Supabase a grant is a public API, so an `insert` policy on `groups` would let a client bypass every RPC and leave an unreachable zero-member group in the directory forever.

- [ ] **Step 1: Write the failing test**

Create `tests/db/privileges.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

const GROUPS_TABLES = ["groups", "group_members"]
const PRIVS = ["select", "insert", "update", "delete"]

describe("table privileges", () => {
  it("grants nothing to anon or authenticated on Groups tables", async () => {
    const results = await withAdmin(async c => {
      const out: Record<string, boolean> = {}
      for (const table of GROUPS_TABLES) {
        for (const role of ["anon", "authenticated"]) {
          for (const priv of PRIVS) {
            const r = await c.query(
              "select has_table_privilege($1, $2, $3) as ok",
              [role, `public.${table}`, priv])
            out[`${role}:${table}:${priv}`] = r.rows[0].ok
          }
        }
      }
      return out
    })
    for (const [key, granted] of Object.entries(results)) {
      expect(granted, `${key} should not be granted`).toBe(false)
    }
  })

  it("blocks a real authenticated client from reading groups", async () => {
    const user = await createTestUser()
    const { error } = await user.client.from("groups").select("id").limit(1)
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — privileges are granted by Supabase's defaults, so `has_table_privilege` returns true and the client read succeeds.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
revoke all on public.groups        from anon, authenticated;
revoke all on public.group_members from anon, authenticated;

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/privileges.test.ts
git commit -m "feat(groups): revoke all client privileges on Groups tables"
```

---

### Task 5: Consent tables and `accept_policy`

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/consent.test.ts`

**Interfaces:**
- Produces: `public.policy_acceptances`, `public.moderation_terms`, `public.accept_policy(p_policy_key text, p_version integer) returns void`

`accepted_at` is defaulted server-side so the timestamp is never client-supplied.

- [ ] **Step 1: Write the failing test**

Create `tests/db/consent.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient } from "./helpers/users"

describe("accept_policy", () => {
  it("records acceptance for the calling user, idempotently", async () => {
    const user = await createTestUser()

    const first = await user.client.rpc("accept_policy", {
      p_policy_key: "groups", p_version: 1
    })
    expect(first.error).toBeNull()

    const second = await user.client.rpc("accept_policy", {
      p_policy_key: "groups", p_version: 1
    })
    expect(second.error).toBeNull()

    const rows = await withAdmin(async c => {
      const r = await c.query(
        `select count(*)::int as n from public.policy_acceptances
          where user_id = $1 and policy_key = 'groups' and version = 1`,
        [user.userId])
      return r.rows
    })
    expect(rows[0].n).toBe(1)
  })

  it("is not executable anonymously", async () => {
    const { error } = await anonClient().rpc("accept_policy", {
      p_policy_key: "groups", p_version: 1
    })
    expect(error).not.toBeNull()
  })

  it("grants no direct table access", async () => {
    const user = await createTestUser()
    const { error } = await user.client.from("policy_acceptances").select("*").limit(1)
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `Could not find the function public.accept_policy`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
create table if not exists public.policy_acceptances (
  user_id     uuid not null references auth.users(id) on delete cascade,
  policy_key  text not null,
  version     integer not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, policy_key, version)
);

create table if not exists public.moderation_terms (term text primary key);

revoke all on public.policy_acceptances from anon, authenticated;
revoke all on public.moderation_terms   from anon, authenticated;
alter table public.policy_acceptances enable row level security;
alter table public.moderation_terms   enable row level security;

create or replace function public.accept_policy(p_policy_key text, p_version integer)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.policy_acceptances (user_id, policy_key, version)
  values (auth.uid(), p_policy_key, p_version)
  on conflict do nothing;
end;
$fn$;

revoke execute on function public.accept_policy(text, integer) from public, anon;
grant  execute on function public.accept_policy(text, integer) to authenticated;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/consent.test.ts
git commit -m "feat(groups): add versioned policy consent and accept_policy"
```

---

### Task 6: Reap trigger, including the concurrency guarantee

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/reap.test.ts`

**Interfaces:**
- Produces: `public.reap_empty_group()` trigger function and `group_members_reap_empty` trigger

The concurrency test is the point of this task. A single-threaded test passes with or without the lock; only two real connections expose the bug where both leavers see each other's uncommitted row and neither reaps.

- [ ] **Step 1: Write the failing test**

Create `tests/db/reap.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin, openAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

async function makeGroup(name: string, userIds: string[]): Promise<string> {
  return withAdmin(async c => {
    const g = await c.query(
      "insert into public.groups (name) values ($1) returning id", [name])
    for (const uid of userIds) {
      await c.query(
        "insert into public.group_members (group_id, user_id) values ($1, $2)",
        [g.rows[0].id, uid])
    }
    return g.rows[0].id as string
  })
}

async function groupExists(id: string): Promise<boolean> {
  return withAdmin(async c => {
    const r = await c.query("select count(*)::int as n from public.groups where id = $1", [id])
    return r.rows[0].n > 0
  })
}

describe("reap_empty_group", () => {
  it("deletes the group when the last member leaves", async () => {
    const a = await createTestUser()
    const id = await makeGroup(`Reap Solo ${Date.now()}`, [a.userId])

    await withAdmin(c => c.query(
      "delete from public.group_members where group_id = $1", [id]))

    expect(await groupExists(id)).toBe(false)
  })

  it("keeps the group while another member remains", async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    const id = await makeGroup(`Reap Pair ${Date.now()}`, [a.userId, b.userId])

    await withAdmin(c => c.query(
      "delete from public.group_members where group_id = $1 and user_id = $2",
      [id, a.userId]))

    expect(await groupExists(id)).toBe(true)
  })

  it("reaps when two members leave concurrently", async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    const id = await makeGroup(`Reap Race ${Date.now()}`, [a.userId, b.userId])

    const c1 = await openAdmin()
    const c2 = await openAdmin()
    try {
      await c1.query("begin")
      await c2.query("begin")

      await c1.query(
        "select public.lock_group($1)", [id])
      await c1.query(
        "delete from public.group_members where group_id = $1 and user_id = $2",
        [id, a.userId])

      const second = (async () => {
        await c2.query("select public.lock_group($1)", [id])
        await c2.query(
          "delete from public.group_members where group_id = $1 and user_id = $2",
          [id, b.userId])
        await c2.query("commit")
      })()

      await c1.query("commit")
      await second
    } finally {
      await c1.end()
      await c2.end()
    }

    expect(await groupExists(id)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — the first two tests fail because the trigger does not exist and the group survives.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
create or replace function public.reap_empty_group()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.lock_group(OLD.group_id);

  if not exists (
    select 1 from public.group_members m where m.group_id = OLD.group_id
  ) then
    delete from public.groups where id = OLD.group_id;
  end if;

  return null;
end;
$fn$;

drop trigger if exists group_members_reap_empty on public.group_members;
create trigger group_members_reap_empty
  after delete on public.group_members
  for each row execute function public.reap_empty_group();
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, including the concurrent case — the second transaction blocks on the advisory lock until the first commits, then sees an empty membership set and reaps.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/reap.test.ts
git commit -m "feat(groups): reap empty groups under a per-group advisory lock"
```

---

### Task 7: `create_group`

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/createGroup.test.ts`

**Interfaces:**
- Consumes: `canonical_group_name`, `accept_policy`
- Produces: `public.create_group(p_name text, p_description text default '') returns public.groups`

Auto-membership in the same transaction is what guarantees a group can never exist with zero members.

- [ ] **Step 1: Write the failing test**

Create `tests/db/createGroup.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, type TestUser } from "./helpers/users"

async function consented(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_policy", { p_policy_key: "groups", p_version: 1 })
  return user
}

const unique = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe("create_group", () => {
  it("creates the group and joins the creator in one transaction", async () => {
    const user = await consented()
    const name = unique("Alpha Club")

    const { data, error } = await user.client.rpc("create_group", {
      p_name: name, p_description: "Weekday mornings"
    })
    expect(error).toBeNull()

    const rows = await withAdmin(async c => {
      const r = await c.query(
        `select g.name, g.created_by, count(m.user_id)::int as members
           from public.groups g
           left join public.group_members m on m.group_id = g.id
          where g.id = $1 group by g.name, g.created_by`,
        [data.id])
      return r.rows
    })
    expect(rows[0].name).toBe(name)
    expect(rows[0].created_by).toBe(user.userId)
    expect(rows[0].members).toBe(1)
  })

  it("normalises whitespace in the stored display name", async () => {
    const user = await consented()
    const { data } = await user.client.rpc("create_group", {
      p_name: `  ${unique("Spaced")}   Club  `, p_description: ""
    })
    expect(data.name).not.toMatch(/^\s|\s$|\s\s/)
  })

  it("rejects a duplicate name with 23505", async () => {
    const a = await consented()
    const b = await consented()
    const name = unique("Dup Club")

    await a.client.rpc("create_group", { p_name: name, p_description: "" })
    const { error } = await b.client.rpc("create_group", {
      p_name: name.toUpperCase(), p_description: ""
    })
    expect(error?.code).toBe("23505")
  })

  it("rejects names that are too short or too long, and null, with 22023", async () => {
    const user = await consented()
    for (const bad of ["A", "x".repeat(41), null]) {
      const { error } = await user.client.rpc("create_group", {
        p_name: bad, p_description: ""
      })
      expect(error?.code, `name=${bad}`).toBe("22023")
    }
  })

  it("rejects an over-long description with 22023", async () => {
    const user = await consented()
    const { error } = await user.client.rpc("create_group", {
      p_name: unique("Desc Club"), p_description: "y".repeat(201)
    })
    expect(error?.code).toBe("22023")
  })

  it("rejects a denylisted name with 22023", async () => {
    const user = await consented()
    await withAdmin(c => c.query(
      "insert into public.moderation_terms (term) values ('bannedword') on conflict do nothing"))

    try {
      const { error } = await user.client.rpc("create_group", {
        p_name: `My bannedword crew`, p_description: ""
      })
      expect(error?.code).toBe("22023")
    } finally {
      await withAdmin(c => c.query(
        "delete from public.moderation_terms where term = 'bannedword'"))
    }
  })

  it("rejects an unconsented caller with 42501", async () => {
    const user = await createTestUser()
    const { error } = await user.client.rpc("create_group", {
      p_name: unique("No Consent"), p_description: ""
    })
    expect(error?.code).toBe("42501")
  })

  it("enforces the live-group quota with 22023", async () => {
    const user = await consented()
    await withAdmin(async c => {
      for (let i = 0; i < 10; i++) {
        const g = await c.query(
          "insert into public.groups (name, created_by) values ($1, $2) returning id",
          [unique(`Quota ${i}`), user.userId])
        await c.query(
          "insert into public.group_members (group_id, user_id) values ($1, $2)",
          [g.rows[0].id, user.userId])
      }
    })

    const { error } = await user.client.rpc("create_group", {
      p_name: unique("Over Quota"), p_description: ""
    })
    expect(error?.code).toBe("22023")
  })
})
```

The quota test inserts 10 groups and 5-per-hour is also breached, so either branch produces `22023` — that is the assertion, and both branches are exercised because the rate-limit check runs first on the eleventh call.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `Could not find the function public.create_group`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
create or replace function public.create_group(
  p_name        text,
  p_description text default ''
)
returns public.groups
language plpgsql security definer set search_path = '' as $fn$
declare
  v_display     text;
  v_canonical   text;
  v_description text;
  v_live        integer;
  v_recent      integer;
  v_group       public.groups;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.policy_acceptances a
     where a.user_id = auth.uid() and a.policy_key = 'groups' and a.version >= 1
  ) then
    raise exception 'groups policy not accepted' using errcode = '42501';
  end if;

  v_display     := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_canonical   := public.canonical_group_name(p_name);
  v_description := btrim(coalesce(p_description, ''));

  if char_length(v_display) < 2 or char_length(v_display) > 40 then
    raise exception 'group name must be 2-40 characters' using errcode = '22023';
  end if;

  if char_length(v_description) > 200 then
    raise exception 'description must be 200 characters or fewer' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.moderation_terms t
     where v_canonical like '%' || t.term || '%'
  ) then
    raise exception 'group name is not allowed' using errcode = '22023';
  end if;

  select count(*)::integer into v_live
    from public.groups g where g.created_by = auth.uid();

  if v_live >= 10 then
    raise exception 'group limit reached' using errcode = '22023';
  end if;

  select count(*)::integer into v_recent
    from public.groups g
   where g.created_by = auth.uid()
     and g.created_at > timezone('utc', now()) - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'too many groups created recently' using errcode = '22023';
  end if;

  begin
    insert into public.groups (name, description, created_by)
    values (v_display, v_description, auth.uid())
    returning * into v_group;
  exception when unique_violation then
    raise exception 'group name already taken' using errcode = '23505';
  end;

  insert into public.group_members (group_id, user_id)
  values (v_group.id, auth.uid());

  return v_group;
end;
$fn$;

revoke execute on function public.create_group(text, text) from public, anon;
grant  execute on function public.create_group(text, text) to authenticated;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, 8 tests in this file.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/createGroup.test.ts
git commit -m "feat(groups): add create_group with validation, quota and denylist"
```

---

### Task 8: `join_group` and `leave_group`

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/membership.test.ts`

**Interfaces:**
- Consumes: `lock_group`, `create_group`, `accept_policy`
- Produces: `public.join_group(p_group_id uuid) returns void`, `public.leave_group(p_group_id uuid) returns void`

Taking the lock *before* the existence check is what turns a lost race into a clean `P0002` instead of a raw `23503` foreign-key violation.

- [ ] **Step 1: Write the failing test**

Create `tests/db/membership.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, type TestUser } from "./helpers/users"

async function consented(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_policy", { p_policy_key: "groups", p_version: 1 })
  return user
}

const unique = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function memberCount(groupId: string): Promise<number> {
  return withAdmin(async c => {
    const r = await c.query(
      "select count(*)::int as n from public.group_members where group_id = $1", [groupId])
    return r.rows[0].n
  })
}

describe("join_group / leave_group", () => {
  it("adds the caller, and is idempotent", async () => {
    const owner = await consented()
    const joiner = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Join Club"), p_description: ""
    })

    const first = await joiner.client.rpc("join_group", { p_group_id: group.id })
    expect(first.error).toBeNull()
    const second = await joiner.client.rpc("join_group", { p_group_id: group.id })
    expect(second.error).toBeNull()

    expect(await memberCount(group.id)).toBe(2)
  })

  it("rejects an unconsented joiner with 42501", async () => {
    const owner = await consented()
    const joiner = await createTestUser()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Consent Join"), p_description: ""
    })

    const { error } = await joiner.client.rpc("join_group", { p_group_id: group.id })
    expect(error?.code).toBe("42501")
  })

  it("raises P0002 for a group that no longer exists", async () => {
    const user = await consented()
    const { error } = await user.client.rpc("join_group", {
      p_group_id: "00000000-0000-0000-0000-0000000000ff"
    })
    expect(error?.code).toBe("P0002")
  })

  it("removes only the caller and reaps when last out", async () => {
    const owner = await consented()
    const joiner = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Leave Club"), p_description: ""
    })
    await joiner.client.rpc("join_group", { p_group_id: group.id })

    await joiner.client.rpc("leave_group", { p_group_id: group.id })
    expect(await memberCount(group.id)).toBe(1)

    await owner.client.rpc("leave_group", { p_group_id: group.id })
    const exists = await withAdmin(async c => {
      const r = await c.query(
        "select count(*)::int as n from public.groups where id = $1", [group.id])
      return r.rows[0].n
    })
    expect(exists).toBe(0)
  })

  it("treats leaving a group you are not in as a no-op", async () => {
    const owner = await consented()
    const stranger = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("NoOp Club"), p_description: ""
    })

    const { error } = await stranger.client.rpc("leave_group", { p_group_id: group.id })
    expect(error).toBeNull()
    expect(await memberCount(group.id)).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `Could not find the function public.join_group`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
create or replace function public.join_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.policy_acceptances a
     where a.user_id = auth.uid() and a.policy_key = 'groups' and a.version >= 1
  ) then
    raise exception 'groups policy not accepted' using errcode = '42501';
  end if;

  perform public.lock_group(p_group_id);

  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  insert into public.group_members (group_id, user_id)
  values (p_group_id, auth.uid())
  on conflict do nothing;
end;
$fn$;

create or replace function public.leave_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform public.lock_group(p_group_id);

  delete from public.group_members
   where group_id = p_group_id and user_id = auth.uid();
end;
$fn$;

revoke execute on function public.join_group(uuid)  from public, anon;
grant  execute on function public.join_group(uuid)  to authenticated;
revoke execute on function public.leave_group(uuid) from public, anon;
grant  execute on function public.leave_group(uuid) to authenticated;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, 5 tests in this file.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/membership.test.ts
git commit -m "feat(groups): add join_group and leave_group"
```

---

### Task 9: `user_blocks` and the block RPCs

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/blocks.test.ts`

**Interfaces:**
- Produces: `public.user_blocks` (the only client-reachable table), `public.block_group_member(p_membership_id uuid) returns void`, `public.unblock_user(p_blocked_id uuid) returns void`

`user_blocks` is the deliberate exception to "no grants": every write is self-scoped and harmless, and the client needs `select` to undo its own blocks.

- [ ] **Step 1: Write the failing test**

Create `tests/db/blocks.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, type TestUser } from "./helpers/users"

async function consented(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_policy", { p_policy_key: "groups", p_version: 1 })
  return user
}

const unique = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe("user_blocks", () => {
  it("lets a user read and delete only their own blocks", async () => {
    const a = await consented()
    const b = await consented()

    await withAdmin(c => c.query(
      "insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)",
      [a.userId, b.userId]))

    const mine = await a.client.from("user_blocks").select("blocked_id")
    expect(mine.error).toBeNull()
    expect(mine.data?.length).toBe(1)

    const theirs = await b.client.from("user_blocks").select("blocked_id")
    expect(theirs.error).toBeNull()
    expect(theirs.data?.length).toBe(0)
  })

  it("rejects self-blocking", async () => {
    const a = await consented()
    const { error } = await a.client.from("user_blocks").insert({
      blocker_id: a.userId, blocked_id: a.userId
    })
    expect(error).not.toBeNull()
  })

  it("blocks by membership id without exposing a user id", async () => {
    const a = await consented()
    const b = await consented()
    const { data: group } = await a.client.rpc("create_group", {
      p_name: unique("Block Club"), p_description: ""
    })
    await b.client.rpc("join_group", { p_group_id: group.id })

    const membershipId = await withAdmin(async c => {
      const r = await c.query(
        "select id from public.group_members where group_id = $1 and user_id = $2",
        [group.id, b.userId])
      return r.rows[0].id as string
    })

    const { error } = await a.client.rpc("block_group_member", {
      p_membership_id: membershipId
    })
    expect(error).toBeNull()

    const rows = await withAdmin(async c => {
      const r = await c.query(
        "select count(*)::int as n from public.user_blocks where blocker_id = $1 and blocked_id = $2",
        [a.userId, b.userId])
      return r.rows[0].n
    })
    expect(rows).toBe(1)
  })

  it("unblocks a previously blocked user", async () => {
    const a = await consented()
    const b = await consented()
    await withAdmin(c => c.query(
      "insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing",
      [a.userId, b.userId]))

    const { error } = await a.client.rpc("unblock_user", { p_blocked_id: b.userId })
    expect(error).toBeNull()

    const remaining = await withAdmin(async c => {
      const r = await c.query(
        "select count(*)::int as n from public.user_blocks where blocker_id = $1 and blocked_id = $2",
        [a.userId, b.userId])
      return r.rows[0].n
    })
    expect(remaining).toBe(0)
  })

  it("cannot unblock on someone else's behalf", async () => {
    const a = await consented()
    const b = await consented()
    const c3 = await consented()
    await withAdmin(c => c.query(
      "insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing",
      [a.userId, b.userId]))

    await c3.client.rpc("unblock_user", { p_blocked_id: b.userId })

    const remaining = await withAdmin(async c => {
      const r = await c.query(
        "select count(*)::int as n from public.user_blocks where blocker_id = $1 and blocked_id = $2",
        [a.userId, b.userId])
      return r.rows[0].n
    })
    expect(remaining).toBe(1)
  })

  it("refuses to block someone you share no group with", async () => {
    const a = await consented()
    const b = await consented()
    const c2 = await consented()
    const { data: group } = await b.client.rpc("create_group", {
      p_name: unique("Stranger Club"), p_description: ""
    })
    await c2.client.rpc("join_group", { p_group_id: group.id })

    const membershipId = await withAdmin(async c => {
      const r = await c.query(
        "select id from public.group_members where group_id = $1 and user_id = $2",
        [group.id, c2.userId])
      return r.rows[0].id as string
    })

    const { error } = await a.client.rpc("block_group_member", {
      p_membership_id: membershipId
    })
    expect(error?.code).toBe("42501")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `relation "public.user_blocks" does not exist`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

grant select, insert, delete on public.user_blocks to authenticated;
alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select on public.user_blocks
  for select to authenticated using (auth.uid() = blocker_id);

drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert on public.user_blocks
  for insert to authenticated with check (auth.uid() = blocker_id);

drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks
  for delete to authenticated using (auth.uid() = blocker_id);

create or replace function public.block_group_member(p_membership_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
declare
  v_target uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select m.user_id into v_target
    from public.group_members m
   where m.id = p_membership_id
     and exists (
       select 1 from public.group_members me
        where me.group_id = m.group_id and me.user_id = auth.uid());

  if v_target is null then
    raise exception 'not permitted' using errcode = '42501';
  end if;

  if v_target = auth.uid() then
    raise exception 'cannot block yourself' using errcode = '22023';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (auth.uid(), v_target)
  on conflict do nothing;
end;
$fn$;

create or replace function public.unblock_user(p_blocked_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from public.user_blocks
   where blocker_id = auth.uid() and blocked_id = p_blocked_id;
end;
$fn$;

revoke execute on function public.block_group_member(uuid) from public, anon;
grant  execute on function public.block_group_member(uuid) to authenticated;
revoke execute on function public.unblock_user(uuid) from public, anon;
grant  execute on function public.unblock_user(uuid) to authenticated;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, 4 tests in this file.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/blocks.test.ts
git commit -m "feat(groups): add user_blocks and membership-scoped block RPCs"
```

---

### Task 10: `abuse_reports` and the report RPCs

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/reports.test.ts`

**Interfaces:**
- Produces: `public.abuse_reports`, `public.report_group(p_group_id uuid, p_reason text) returns void`, `public.report_profile(p_membership_id uuid, p_reason text) returns void`

The non-cascade test is the important one: an abuser reported for an offensive group name must not be able to destroy the evidence by leaving as the last member.

- [ ] **Step 1: Write the failing test**

Create `tests/db/reports.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, type TestUser } from "./helpers/users"

async function consented(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_policy", { p_policy_key: "groups", p_version: 1 })
  return user
}

const unique = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe("abuse reports", () => {
  it("snapshots the group text and dedupes per reporter", async () => {
    const owner = await consented()
    const reporter = await consented()
    const name = unique("Report Club")
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: name, p_description: "Some description"
    })

    await reporter.client.rpc("report_group", {
      p_group_id: group.id, p_reason: "offensive"
    })
    await reporter.client.rpc("report_group", {
      p_group_id: group.id, p_reason: "offensive again"
    })

    const rows = await withAdmin(async c => {
      const r = await c.query(
        `select snapshot_name, snapshot_description, reason
           from public.abuse_reports
          where reporter_id = $1 and target_group_id = $2`,
        [reporter.userId, group.id])
      return r.rows
    })
    expect(rows.length).toBe(1)
    expect(rows[0].snapshot_name).toBe(name)
    expect(rows[0].snapshot_description).toBe("Some description")
  })

  it("survives deletion of the reported group", async () => {
    const owner = await consented()
    const reporter = await consented()
    const name = unique("Vanishing Club")
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: name, p_description: ""
    })
    await reporter.client.rpc("join_group", { p_group_id: group.id })
    await reporter.client.rpc("report_group", {
      p_group_id: group.id, p_reason: "offensive"
    })

    await reporter.client.rpc("leave_group", { p_group_id: group.id })
    await owner.client.rpc("leave_group", { p_group_id: group.id })

    const rows = await withAdmin(async c => {
      const r = await c.query(
        "select target_group_id, snapshot_name from public.abuse_reports where reporter_id = $1",
        [reporter.userId])
      return r.rows
    })
    expect(rows.length).toBe(1)
    expect(rows[0].target_group_id).toBeNull()
    expect(rows[0].snapshot_name).toBe(name)
  })

  it("truncates an over-long reason to 500 characters", async () => {
    const owner = await consented()
    const reporter = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Long Reason"), p_description: ""
    })

    await reporter.client.rpc("report_group", {
      p_group_id: group.id, p_reason: "z".repeat(900)
    })

    const len = await withAdmin(async c => {
      const r = await c.query(
        "select char_length(reason) as n from public.abuse_reports where reporter_id = $1",
        [reporter.userId])
      return r.rows[0].n
    })
    expect(len).toBe(500)
  })

  it("reports a profile by membership id", async () => {
    const a = await consented()
    const b = await consented()
    const { data: group } = await a.client.rpc("create_group", {
      p_name: unique("Profile Report"), p_description: ""
    })
    await b.client.rpc("join_group", { p_group_id: group.id })

    const membershipId = await withAdmin(async c => {
      const r = await c.query(
        "select id from public.group_members where group_id = $1 and user_id = $2",
        [group.id, b.userId])
      return r.rows[0].id as string
    })

    const { error } = await a.client.rpc("report_profile", {
      p_membership_id: membershipId, p_reason: "bad name"
    })
    expect(error).toBeNull()

    const rows = await withAdmin(async c => {
      const r = await c.query(
        `select target_type, target_user_id from public.abuse_reports
          where reporter_id = $1 and target_type = 'profile'`,
        [a.userId])
      return r.rows
    })
    expect(rows[0].target_user_id).toBe(b.userId)
  })

  it("grants no direct table access", async () => {
    const user = await consented()
    const { error } = await user.client.from("abuse_reports").select("*").limit(1)
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `relation "public.abuse_reports" does not exist`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
create table if not exists public.abuse_reports (
  id                   uuid primary key default extensions.gen_random_uuid(),
  reporter_id          uuid not null references auth.users(id) on delete cascade,
  target_type          text not null check (target_type in ('group', 'profile')),
  target_group_id      uuid null references public.groups(id) on delete set null,
  target_user_id       uuid null references auth.users(id) on delete set null,
  snapshot_name        text not null default '',
  snapshot_description text not null default '',
  reason               text not null default '',
  created_at           timestamptz not null default timezone('utc', now())
);

create unique index if not exists abuse_reports_one_per_group
  on public.abuse_reports (reporter_id, target_group_id) where target_type = 'group';
create unique index if not exists abuse_reports_one_per_profile
  on public.abuse_reports (reporter_id, target_user_id) where target_type = 'profile';

revoke all on public.abuse_reports from anon, authenticated;
alter table public.abuse_reports enable row level security;

create or replace function public.report_group(p_group_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare
  v_name text;
  v_desc text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select g.name, g.description into v_name, v_desc
    from public.groups g where g.id = p_group_id;

  if v_name is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  insert into public.abuse_reports (
    reporter_id, target_type, target_group_id,
    snapshot_name, snapshot_description, reason)
  values (
    auth.uid(), 'group', p_group_id,
    v_name, v_desc, left(coalesce(p_reason, ''), 500))
  on conflict do nothing;
end;
$fn$;

create or replace function public.report_profile(p_membership_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare
  v_target uuid;
  v_name   text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select m.user_id into v_target
    from public.group_members m
   where m.id = p_membership_id
     and exists (
       select 1 from public.group_members me
        where me.group_id = m.group_id and me.user_id = auth.uid());

  if v_target is null then
    raise exception 'not permitted' using errcode = '42501';
  end if;

  select p.full_name into v_name
    from public.profiles p where p.user_id = v_target;

  insert into public.abuse_reports (
    reporter_id, target_type, target_user_id, snapshot_name, reason)
  values (
    auth.uid(), 'profile', v_target,
    coalesce(v_name, ''), left(coalesce(p_reason, ''), 500))
  on conflict do nothing;
end;
$fn$;

revoke execute on function public.report_group(uuid, text) from public, anon;
grant  execute on function public.report_group(uuid, text) to authenticated;
revoke execute on function public.report_profile(uuid, text) from public, anon;
grant  execute on function public.report_profile(uuid, text) to authenticated;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, 5 tests in this file.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/reports.test.ts
git commit -m "feat(groups): add abuse_reports with non-cascading evidence snapshots"
```

---

### Task 11: `list_groups`

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/listGroups.test.ts`

**Interfaces:**
- Produces: `public.list_groups()` returning `(group_id uuid, group_name text, group_description text, group_logo_key text, member_count bigint, is_member boolean)`

- [ ] **Step 1: Write the failing test**

Create `tests/db/listGroups.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient, type TestUser } from "./helpers/users"

async function consented(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_policy", { p_policy_key: "groups", p_version: 1 })
  return user
}

const unique = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe("list_groups", () => {
  it("returns member counts and the caller's membership flag", async () => {
    const owner = await consented()
    const other = await consented()
    const name = unique("Listed Club")
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: name, p_description: "hi"
    })

    const asOwner = await owner.client.rpc("list_groups")
    expect(asOwner.error).toBeNull()
    const ownerRow = asOwner.data.find((r: any) => r.group_id === group.id)
    expect(ownerRow.member_count).toBe(1)
    expect(ownerRow.is_member).toBe(true)

    const asOther = await other.client.rpc("list_groups")
    const otherRow = asOther.data.find((r: any) => r.group_id === group.id)
    expect(otherRow.is_member).toBe(false)
  })

  it("never exposes created_by", async () => {
    const owner = await consented()
    await owner.client.rpc("create_group", {
      p_name: unique("No CreatedBy"), p_description: ""
    })
    const { data } = await owner.client.rpc("list_groups")
    expect(Object.keys(data[0])).not.toContain("created_by")
  })

  it("hides groups created by someone the caller blocked", async () => {
    const a = await consented()
    const b = await consented()
    const { data: group } = await b.client.rpc("create_group", {
      p_name: unique("Blocked Owner"), p_description: ""
    })

    await withAdmin(c => c.query(
      "insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing",
      [a.userId, b.userId]))

    const { data } = await a.client.rpc("list_groups")
    expect(data.find((r: any) => r.group_id === group.id)).toBeUndefined()
  })

  it("returns at most 200 rows", async () => {
    const user = await consented()
    const { data } = await user.client.rpc("list_groups")
    expect(data.length).toBeLessThanOrEqual(200)
  })

  it("is not executable anonymously", async () => {
    const { error } = await anonClient().rpc("list_groups")
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `Could not find the function public.list_groups`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
drop function if exists public.list_groups();
create function public.list_groups()
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  group_logo_key    text,
  member_count      bigint,
  is_member         boolean
)
language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  return query
  select
    g.id,
    g.name,
    g.description,
    g.logo_key,
    (select count(*) from public.group_members m where m.group_id = g.id),
    exists (select 1 from public.group_members me
             where me.group_id = g.id and me.user_id = auth.uid())
  from public.groups g
  where g.created_by is null
     or g.created_by = auth.uid()
     or not exists (
       select 1 from public.user_blocks b
        where b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
  order by (select count(*) from public.group_members m where m.group_id = g.id) desc,
           public.canonical_group_name(g.name) asc
  limit 200;
end;
$fn$;

revoke execute on function public.list_groups() from public, anon;
grant  execute on function public.list_groups() to authenticated;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, 5 tests in this file.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/listGroups.test.ts
git commit -m "feat(groups): add list_groups directory RPC"
```

---

### Task 12: `profiles.full_name` constraint and the sets index

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Modify: `src/pages/ProfileSettings.tsx:83-86`
- Create: `tests/db/profileName.test.ts`

**Interfaces:**
- Produces: `profiles_full_name_length` check constraint (≤ 60), `idx_sets_user_id_date`

`profiles.full_name` has been private since the app began and is written with no validation at `ProfileSettings.tsx:83`. Groups turns it into public UGC served on every board fetch. The `update` must run before the `alter`, or existing long rows reject the constraint.

- [ ] **Step 1: Write the failing test**

Create `tests/db/profileName.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

describe("profiles.full_name", () => {
  it("rejects a name longer than 60 characters", async () => {
    const user = await createTestUser()
    await expect(
      withAdmin(c => c.query(
        "update public.profiles set full_name = $1 where user_id = $2",
        ["x".repeat(61), user.userId]))
    ).rejects.toMatchObject({ code: "23514" })
  })

  it("accepts exactly 60 characters", async () => {
    const user = await createTestUser()
    await withAdmin(c => c.query(
      "insert into public.profiles (user_id, full_name) values ($1, $2) " +
      "on conflict (user_id) do update set full_name = excluded.full_name",
      [user.userId, "y".repeat(60)]))

    const n = await withAdmin(async c => {
      const r = await c.query(
        "select char_length(full_name) as n from public.profiles where user_id = $1",
        [user.userId])
      return r.rows[0].n
    })
    expect(n).toBe(60)
  })
})

describe("sets index", () => {
  it("has a composite index on (user_id, date)", async () => {
    const found = await withAdmin(async c => {
      const r = await c.query(
        "select count(*)::int as n from pg_indexes " +
        "where tablename = 'sets' and indexname = 'idx_sets_user_id_date'")
      return r.rows[0].n
    })
    expect(found).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — the over-long update succeeds (no constraint) and the index is missing.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
-- Clean before constraining, or the ALTER fails on existing rows.
update public.profiles
   set full_name = left(btrim(regexp_replace(full_name, '\s+', ' ', 'g')), 60)
 where full_name <> left(btrim(regexp_replace(full_name, '\s+', ' ', 'g')), 60);

alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 60);

create index if not exists idx_sets_user_id_date on public.sets (user_id, date);
```

In `src/pages/ProfileSettings.tsx`, clamp before the upsert so users get a clean message instead of a raw constraint error. Replace the upsert block at line 83:

```tsx
    const trimmed = name.trim().replace(/\s+/g, " ")
    if (trimmed.length > 60) {
      setNameError("Name must be 60 characters or fewer.")
      setNameSaving(false)
      return
    }

    const { error: upsertError } = await supabase.from("profiles").upsert({
      user_id: user.id,
      full_name: trimmed
    })
```

Add `maxLength={60}` to the name input.

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db` then `npm run test:run`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/profileName.test.ts src/pages/ProfileSettings.tsx
git commit -m "feat(groups): cap profile names at 60 chars and index sets(user_id, date)"
```

---

### Task 13: `fetch_group_leaderboard`

**Files:**
- Modify: `tests/e2e/db/schema.sql`
- Create: `tests/db/leaderboard.test.ts`

**Interfaces:**
- Consumes: everything above
- Produces: `public.fetch_group_leaderboard(p_group_id uuid, p_period text, p_timezone text)` returning `(membership_id uuid, member_name text, is_self boolean, slalom_count bigint, tricks_count bigint, jump_count bigint, other_count bigint, total_count bigint)`

The membership check in step 5 is the whole privacy posture of the feature. The period enum exists so a caller cannot express a single-day window and enumerate who trained on a given date.

- [ ] **Step 1: Write the failing test**

Create `tests/db/leaderboard.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient, type TestUser } from "./helpers/users"

async function consented(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_policy", { p_policy_key: "groups", p_version: 1 })
  return user
}

const unique = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function addSet(userId: string, event: string, daysAgo: number) {
  await withAdmin(c => c.query(
    `insert into public.sets (user_id, event_type, date)
     values ($1, $2, (current_date - $3::int))`,
    [userId, event, daysAgo]))
}

async function setName(userId: string, name: string) {
  await withAdmin(c => c.query(
    "insert into public.profiles (user_id, full_name) values ($1, $2) " +
    "on conflict (user_id) do update set full_name = excluded.full_name",
    [userId, name]))
}

describe("fetch_group_leaderboard", () => {
  it("refuses a non-member with 42501", async () => {
    const owner = await consented()
    const stranger = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Private Board"), p_description: ""
    })

    const { error } = await stranger.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "UTC"
    })
    expect(error?.code).toBe("42501")
  })

  it("counts by discipline within the 7-day window", async () => {
    const owner = await consented()
    await setName(owner.userId, "Owner One")
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Counting Board"), p_description: ""
    })

    await addSet(owner.userId, "slalom", 0)
    await addSet(owner.userId, "slalom", 3)
    await addSet(owner.userId, "tricks", 6)
    await addSet(owner.userId, "jump", 10)   // outside 7d, inside 30d

    const week = await owner.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "UTC"
    })
    const row = week.data[0]
    expect(row.slalom_count).toBe(2)
    expect(row.tricks_count).toBe(1)
    expect(row.jump_count).toBe(0)
    expect(row.total_count).toBe(3)
    expect(row.is_self).toBe(true)
    expect(row.member_name).toBe("Owner One")

    const month = await owner.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "30d", p_timezone: "UTC"
    })
    expect(month.data[0].total_count).toBe(4)
  })

  it("returns a membership id, never an auth user id", async () => {
    const owner = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Opaque Board"), p_description: ""
    })
    const { data } = await owner.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "UTC"
    })
    expect(data[0].membership_id).not.toBe(owner.userId)
    expect(Object.keys(data[0])).not.toContain("user_id")
  })

  it("shows a member with no sets as zero", async () => {
    const owner = await consented()
    const quiet = await consented()
    await setName(quiet.userId, "Quiet Member")
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Zero Board"), p_description: ""
    })
    await quiet.client.rpc("join_group", { p_group_id: group.id })

    const { data } = await owner.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "UTC"
    })
    const row = data.find((r: any) => r.member_name === "Quiet Member")
    expect(row.total_count).toBe(0)
    expect(row.slalom_count).toBe(0)
  })

  it("falls back to Skier for a blank name", async () => {
    const owner = await consented()
    await setName(owner.userId, "")
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Blank Name Board"), p_description: ""
    })
    const { data } = await owner.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "UTC"
    })
    expect(data[0].member_name).toBe("Skier")
  })

  it("hides blocked members symmetrically but never the caller", async () => {
    const a = await consented()
    const b = await consented()
    await setName(a.userId, "Blocker A")
    await setName(b.userId, "Blocked B")
    const { data: group } = await a.client.rpc("create_group", {
      p_name: unique("Block Board"), p_description: ""
    })
    await b.client.rpc("join_group", { p_group_id: group.id })

    await withAdmin(c => c.query(
      "insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing",
      [a.userId, b.userId]))

    const asA = await a.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "UTC"
    })
    expect(asA.data.map((r: any) => r.member_name)).toEqual(["Blocker A"])

    const asB = await b.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "UTC"
    })
    expect(asB.data.map((r: any) => r.member_name)).toEqual(["Blocked B"])
  })

  it("rejects any period other than 7d or 30d", async () => {
    const owner = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("Period Board"), p_description: ""
    })
    for (const period of ["all", "1d", "", "365d"]) {
      const { error } = await owner.client.rpc("fetch_group_leaderboard", {
        p_group_id: group.id, p_period: period, p_timezone: "UTC"
      })
      expect(error?.code, `period=${period}`).toBe("22023")
    }
  })

  it("rejects an unknown timezone", async () => {
    const owner = await consented()
    const { data: group } = await owner.client.rpc("create_group", {
      p_name: unique("TZ Board"), p_description: ""
    })
    const { error } = await owner.client.rpc("fetch_group_leaderboard", {
      p_group_id: group.id, p_period: "7d", p_timezone: "Mars/Olympus"
    })
    expect(error?.code).toBe("22023")
  })

  it("is not executable anonymously", async () => {
    const { error } = await anonClient().rpc("fetch_group_leaderboard", {
      p_group_id: "00000000-0000-0000-0000-000000000001",
      p_period: "7d", p_timezone: "UTC"
    })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:db`
Expected: FAIL — `Could not find the function public.fetch_group_leaderboard`.

- [ ] **Step 3: Write minimal implementation**

Append to `tests/e2e/db/schema.sql`:

```sql
drop function if exists public.fetch_group_leaderboard(uuid, text, text);
create function public.fetch_group_leaderboard(
  p_group_id uuid,
  p_period   text,
  p_timezone text
)
returns table (
  membership_id uuid,
  member_name   text,
  is_self       boolean,
  slalom_count  bigint,
  tricks_count  bigint,
  jump_count    bigint,
  other_count   bigint,
  total_count   bigint
)
language plpgsql security definer set search_path = '' as $fn$
declare
  v_days  integer;
  v_start date;
  v_end   date;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_days := case p_period when '7d' then 6 when '30d' then 29 else null end;
  if v_days is null then
    raise exception 'unsupported period' using errcode = '22023';
  end if;

  if p_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names z where z.name = p_timezone
  ) then
    raise exception 'unknown timezone' using errcode = '22023';
  end if;

  v_end   := (pg_catalog.now() at time zone p_timezone)::date;
  v_start := v_end - v_days;

  if not exists (
    select 1 from public.group_members m
     where m.group_id = p_group_id and m.user_id = auth.uid()
  ) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;

  return query
  select
    m.id,
    coalesce(nullif(btrim(p.full_name), ''), 'Skier'),
    (m.user_id = auth.uid()),
    count(s.id) filter (where s.event_type = 'slalom'),
    count(s.id) filter (where s.event_type = 'tricks'),
    count(s.id) filter (where s.event_type = 'jump'),
    count(s.id) filter (where s.event_type = 'other'),
    count(s.id)
  from public.group_members m
  left join public.profiles p on p.user_id = m.user_id
  left join public.sets s on s.user_id = m.user_id
                         and s.date between v_start and v_end
  where m.group_id = p_group_id
    and (m.user_id = auth.uid()
         or not exists (
           select 1 from public.user_blocks b
            where (b.blocker_id = auth.uid() and b.blocked_id = m.user_id)
               or (b.blocker_id = m.user_id and b.blocked_id = auth.uid())))
  group by m.id, m.user_id, p.full_name
  order by count(s.id) desc,
           coalesce(nullif(btrim(p.full_name), ''), 'Skier') asc;
end;
$fn$;

revoke execute on function public.fetch_group_leaderboard(uuid, text, text) from public, anon;
grant  execute on function public.fetch_group_leaderboard(uuid, text, text) to authenticated;
```

Apply: `npm run e2e:db:prepare`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:db`
Expected: PASS, 9 tests in this file.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/db/leaderboard.test.ts
git commit -m "feat(groups): add fetch_group_leaderboard with server-resolved windows"
```

---

### Task 14: Idempotent schema, ACL sweep and test-data cleanup

**Files:**
- Modify: `tests/e2e/scripts/_db.mjs` (inside `cleanupTestData`)
- Create: `tests/db/acl.test.ts`

**Interfaces:**
- Consumes: every object created above
- Produces: a re-runnable `schema.sql` and a catalogue-level guarantee that no Groups function is executable by `public` or `anon`

`global.setup.ts` re-applies `schema.sql` on every E2E run, so anything not written idempotently breaks the second run.

- [ ] **Step 1: Write the failing test**

Create `tests/db/acl.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"

const FUNCTIONS = [
  "accept_policy", "create_group", "join_group", "leave_group",
  "list_groups", "fetch_group_leaderboard", "report_group",
  "report_profile", "block_group_member", "unblock_user"
]

const LOCKED_TABLES = [
  "groups", "group_members", "abuse_reports",
  "policy_acceptances", "moderation_terms"
]

describe("ACL sweep", () => {
  it("grants EXECUTE to authenticated and to nobody else", async () => {
    const rows = await withAdmin(async c => {
      const out: Record<string, { pub: boolean; anon: boolean; auth: boolean }> = {}
      for (const fn of FUNCTIONS) {
        const r = await c.query(
          `select p.oid::regprocedure::text as sig,
                  has_function_privilege('public', p.oid, 'execute')        as pub,
                  has_function_privilege('anon', p.oid, 'execute')          as anon,
                  has_function_privilege('authenticated', p.oid, 'execute') as auth
             from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = $1`, [fn])
        expect(r.rows.length, `${fn} should exist exactly once`).toBe(1)
        out[fn] = r.rows[0]
      }
      return out
    })

    for (const [fn, acl] of Object.entries(rows)) {
      expect(acl.pub, `${fn}: PUBLIC must not execute`).toBe(false)
      expect(acl.anon, `${fn}: anon must not execute`).toBe(false)
      expect(acl.auth, `${fn}: authenticated must execute`).toBe(true)
    }
  })

  it("grants no table privileges outside user_blocks", async () => {
    const violations = await withAdmin(async c => {
      const found: string[] = []
      for (const table of LOCKED_TABLES) {
        for (const role of ["anon", "authenticated"]) {
          for (const priv of ["select", "insert", "update", "delete"]) {
            const r = await c.query(
              "select has_table_privilege($1, $2, $3) as ok",
              [role, `public.${table}`, priv])
            if (r.rows[0].ok) found.push(`${role}:${table}:${priv}`)
          }
        }
      }
      return found
    })
    expect(violations).toEqual([])
  })

  it("enables RLS on every Groups table", async () => {
    const rows = await withAdmin(async c => {
      const r = await c.query(
        `select relname, relrowsecurity from pg_class
          where relname = any($1) and relnamespace = 'public'::regnamespace`,
        [[...LOCKED_TABLES, "user_blocks"]])
      return r.rows
    })
    expect(rows.length).toBe(6)
    for (const row of rows) {
      expect(row.relrowsecurity, `${row.relname} needs RLS`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

First prove the idempotency problem: run `npm run e2e:db:prepare` twice in a row.
Expected: the second run FAILS if any policy or function was written non-idempotently.

Then run: `npm run test:db`
Expected: the ACL tests should already pass if Tasks 4–13 were done correctly. If any fail, the missing `revoke`/`grant` is the bug — fix it in `schema.sql`.

- [ ] **Step 3: Write minimal implementation**

Confirm every `create policy` in the Groups section has a preceding `drop policy if exists`, and every `returns table` function has a preceding `drop function if exists`. Fix any that don't.

Add Groups cleanup to `cleanupTestData` in `tests/e2e/scripts/_db.mjs`, immediately before the `delete from public.profiles` line:

```js
    await client.query("delete from public.abuse_reports where reporter_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.user_blocks where blocker_id::text in (select id::text from auth.users where email like $1) or blocked_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.policy_acceptances where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.group_members where user_id::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
    await client.query("delete from public.groups where created_by::text in (select id::text from auth.users where email like $1)", [`%@${emailDomain}`])
```

Deleting `group_members` first lets the reap trigger clear most groups; the explicit `groups` delete catches any created by a test user that another user still belongs to.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run e2e:db:prepare
npm run e2e:db:prepare   # must succeed twice
npm run test:db          # full suite
npm run test:run         # existing unit tests still green
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/db/schema.sql tests/e2e/scripts/_db.mjs tests/db/acl.test.ts
git commit -m "test(groups): assert ACL posture and make schema re-runnable"
```

---

## Definition of done for Plan A

- `npm run test:db` passes with roughly 45 tests across 11 files.
- `npm run e2e:db:prepare` succeeds twice consecutively.
- `npm run test:run` and `npm run e2e` still pass — Plan A changes no existing behaviour except the `profiles.full_name` cap.
- No client code calls any Groups RPC yet. That is Plan B.

## Self-review notes

**Spec coverage.** §4 data model → Tasks 3, 5, 9, 10, 12. §5 privileges and RLS → Tasks 4, 9, 14. §6.0 helpers → Task 2. §6.1 trigger → Task 6. §6.2 `create_group` → Task 7. §6.3 join/leave → Task 8. §6.4 `list_groups` → Task 11. §6.5 leaderboard → Task 13. §6.6 moderation and consent RPCs → Tasks 5, 9, 10. §12 database boundary tests → distributed across every task, swept in Task 14.

**Deferred to Plan B/C by design:** §7 client architecture, §8 UI, §9.1–9.2 consent gate UI and policy copy, §9.3 moderation runbook, §10 error-to-copy mapping, §12 unit and E2E suites.

**Known gap to carry into Plan B:** `create_group` and `join_group` hard-code policy version `>= 1`. When the Groups policy version increments, that predicate and the client's `accept_policy` call must move in step. Plan B should introduce a single shared constant rather than repeating the literal.
