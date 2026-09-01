import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

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
