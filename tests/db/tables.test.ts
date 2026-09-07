import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe("groups table", () => {
  it("rejects a name differing only by case", async () => {
    const name = unique("Case Club")
    await withAdmin(async c => {
      await c.query("begin")
      await c.query("insert into public.groups (name) values ($1)", [name])
      await expect(
        c.query("insert into public.groups (name) values ($1)", [name.toUpperCase()])
      ).rejects.toMatchObject({ code: "23505" })
      await c.query("rollback")
    })
  })

  it("rejects a name differing only by whitespace", async () => {
    const name = unique("Space Club")
    await withAdmin(async c => {
      await c.query("begin")
      await c.query("insert into public.groups (name) values ($1)", [name])
      await expect(
        c.query("insert into public.groups (name) values ($1)", [`  ${name.replace(" ", "   ")}  `])
      ).rejects.toMatchObject({ code: "23505" })
      await c.query("rollback")
    })
  })

  it("nulls created_by when the creator's account is deleted, keeping the group", async () => {
    const user = await createTestUser()
    const groupId = await withAdmin(async c => {
      const r = await c.query(
        "insert into public.groups (name, created_by) values ($1, $2) returning id",
        [unique("Orphan Club"), user.userId]
      )
      return r.rows[0].id as string
    })

    await withAdmin(c => c.query("delete from auth.users where id = $1", [user.userId]))

    const row = await withAdmin(async c => {
      const r = await c.query("select created_by from public.groups where id = $1", [groupId])
      return r.rows[0]
    })
    expect(row.created_by).toBeNull()

    await withAdmin(c => c.query("delete from public.groups where id = $1", [groupId]))
  })
})

describe("group_members table", () => {
  it("gives each membership an opaque id distinct from the user id", async () => {
    const user = await createTestUser()
    const row = await withAdmin(async c => {
      await c.query("begin")
      const g = await c.query(
        "insert into public.groups (name) values ($1) returning id",
        [unique("Opaque Club")]
      )
      const m = await c.query(
        "insert into public.group_members (group_id, user_id) values ($1, $2) returning id, user_id",
        [g.rows[0].id, user.userId]
      )
      await c.query("rollback")
      return m.rows[0]
    })
    expect(row.id).not.toBe(row.user_id)
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("allows a user to join a group only once", async () => {
    const user = await createTestUser()
    await withAdmin(async c => {
      await c.query("begin")
      const g = await c.query(
        "insert into public.groups (name) values ($1) returning id",
        [unique("Once Club")]
      )
      await c.query(
        "insert into public.group_members (group_id, user_id) values ($1, $2)",
        [g.rows[0].id, user.userId]
      )
      await expect(
        c.query(
          "insert into public.group_members (group_id, user_id) values ($1, $2)",
          [g.rows[0].id, user.userId]
        )
      ).rejects.toMatchObject({ code: "23505" })
      await c.query("rollback")
    })
  })

  it("removes memberships when the group is deleted", async () => {
    const user = await createTestUser()
    const remaining = await withAdmin(async c => {
      const g = await c.query(
        "insert into public.groups (name) values ($1) returning id",
        [unique("Cascade Club")]
      )
      const groupId = g.rows[0].id
      await c.query(
        "insert into public.group_members (group_id, user_id) values ($1, $2)",
        [groupId, user.userId]
      )
      await c.query("delete from public.groups where id = $1", [groupId])
      const r = await c.query(
        "select count(*)::int as n from public.group_members where group_id = $1",
        [groupId]
      )
      return r.rows[0].n
    })
    expect(remaining).toBe(0)
  })
})
