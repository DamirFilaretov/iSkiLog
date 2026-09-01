import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"
import { runSqlFromFile } from "./helpers/schema"

async function nameOf(userId: string): Promise<string> {
  return withAdmin(async c => {
    const r = await c.query("select full_name from public.profiles where user_id = $1", [userId])
    return r.rows[0]?.full_name
  })
}

async function setName(userId: string, name: string) {
  await withAdmin(c =>
    c.query(
      `insert into public.profiles (user_id, full_name) values ($1, $2)
       on conflict (user_id) do update set full_name = excluded.full_name`,
      [userId, name]
    )
  )
}

describe("profile name normalisation", () => {
  it("trims and collapses whitespace on insert", async () => {
    const user = await createTestUser()
    await setName(user.userId, "  Damir   Filaretov  ")
    expect(await nameOf(user.userId)).toBe("Damir Filaretov")
  })

  it("strips control characters", async () => {
    const user = await createTestUser()
    // BEL and UNIT SEPARATOR: storable in a text column, and not matched by \s.
    // NUL is deliberately not tested — Postgres rejects it at the protocol
    // layer, so it can never reach the trigger.
    const bel = String.fromCharCode(7)
    const unitSeparator = String.fromCharCode(31)
    await setName(user.userId, `Damir${bel} ${unitSeparator}Filaretov`)
    expect(await nameOf(user.userId)).toBe("Damir Filaretov")
  })

  it("truncates rather than rejecting an over-long name", async () => {
    const user = await createTestUser()
    await setName(user.userId, "x".repeat(120))
    expect((await nameOf(user.userId)).length).toBe(60)
  })

  it("normalises on update as well as insert", async () => {
    const user = await createTestUser()
    await setName(user.userId, "Fine Name")
    await setName(user.userId, "   Messy    Name   ")
    expect(await nameOf(user.userId)).toBe("Messy Name")
  })
})

describe("profile name filtering", () => {
  it("rejects a denylisted display name", async () => {
    const user = await createTestUser()
    await withAdmin(c =>
      c.query("insert into public.moderation_terms (term) values ('slur') on conflict do nothing")
    )
    try {
      await expect(setName(user.userId, "Totally slur Person")).rejects.toMatchObject({
        code: "22023"
      })
    } finally {
      await withAdmin(c => c.query("delete from public.moderation_terms where term = 'slur'"))
    }
  })

  it("cannot be bypassed by writing through the API instead of the UI", async () => {
    const user = await createTestUser()
    await withAdmin(c =>
      c.query("insert into public.moderation_terms (term) values ('slur') on conflict do nothing")
    )
    try {
      // profiles is writable by its owner - that is how ProfileSettings and
      // OAuth hydration both work - so the filter must live in the database.
      const { error } = await user.client
        .from("profiles")
        .upsert({ user_id: user.userId, full_name: "Sneaky slur Name" })
      expect(error).not.toBeNull()
      expect(error?.code).toBe("22023")
    } finally {
      await withAdmin(c => c.query("delete from public.moderation_terms where term = 'slur'"))
    }
  })

  it("still allows an ordinary name through the API", async () => {
    const user = await createTestUser()
    const { error } = await user.client
      .from("profiles")
      .upsert({ user_id: user.userId, full_name: "  Ordinary   Person " })
    expect(error).toBeNull()
    expect(await nameOf(user.userId)).toBe("Ordinary Person")
  })
})

describe("sets index for the leaderboard aggregate", () => {
  it("has a composite index on (user_id, date)", async () => {
    const found = await withAdmin(async c => {
      const r = await c.query(
        `select count(*)::int as n from pg_indexes
          where schemaname = 'public' and tablename = 'sets'
            and indexname = 'idx_sets_user_id_date'`
      )
      return r.rows[0].n
    })
    expect(found).toBe(1)
  })
})

describe("profile name migration path", () => {
  it("has the length constraint, so a bad row cannot survive in the table", async () => {
    const constraint = await withAdmin(async c => {
      const r = await c.query(
        `select conname from pg_constraint
          where conrelid = 'public.profiles'::regclass
            and conname = 'profiles_full_name_length'`
      )
      return r.rows.length
    })
    expect(constraint).toBe(1)
  })

  it("normalises a pre-existing row that predates the trigger", async () => {
    const user = await createTestUser()

    // Simulate production: a row written before the trigger and constraint
    // existed. Both are disabled to plant it, exactly as a legacy row would be.
    await withAdmin(async c => {
      await c.query("alter table public.profiles disable trigger profiles_normalise_name")
      await c.query(
        "alter table public.profiles drop constraint if exists profiles_full_name_length"
      )
      await c.query(
        `insert into public.profiles (user_id, full_name) values ($1, $2)
         on conflict (user_id) do update set full_name = excluded.full_name`,
        [user.userId, "  Legacy   " + "x".repeat(120) + "  "]
      )
      await c.query("alter table public.profiles enable trigger profiles_normalise_name")
    })

    const before = await nameOf(user.userId)
    expect(before.length).toBeGreaterThan(60)

    // Run the real migration rather than a copy of it: schema.sql carries the
    // backfill and the constraint, and re-running it is the deployment step.
    await runSqlFromFile()

    const after = await nameOf(user.userId)
    expect(after.length).toBeLessThanOrEqual(60)
    expect(after).not.toMatch(/^\s|\s$|\s\s/)

    const constraint = await withAdmin(async c => {
      const r = await c.query(
        `select conname from pg_constraint
          where conrelid = 'public.profiles'::regclass
            and conname = 'profiles_full_name_length'`
      )
      return r.rows.length
    })
    expect(constraint).toBe(1)
  })
})
