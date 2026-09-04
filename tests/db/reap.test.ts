import { describe, it, expect } from "vitest"
import { withAdmin, openAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function makeGroup(name: string, userIds: string[]): Promise<string> {
  return withAdmin(async c => {
    const g = await c.query("insert into public.groups (name) values ($1) returning id", [name])
    for (const userId of userIds) {
      await c.query("insert into public.group_members (group_id, user_id) values ($1, $2)", [
        g.rows[0].id,
        userId
      ])
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
    const user = await createTestUser()
    const id = await makeGroup(unique("Reap Solo"), [user.userId])

    await withAdmin(c =>
      c.query("delete from public.group_members where group_id = $1", [id])
    )

    expect(await groupExists(id)).toBe(false)
  })

  it("keeps the group while another member remains", async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    const id = await makeGroup(unique("Reap Pair"), [a.userId, b.userId])

    await withAdmin(c =>
      c.query("delete from public.group_members where group_id = $1 and user_id = $2", [
        id,
        a.userId
      ])
    )

    expect(await groupExists(id)).toBe(true)
    await withAdmin(c => c.query("delete from public.groups where id = $1", [id]))
  })

  it("reaps when the last two members leave concurrently", async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    const id = await makeGroup(unique("Reap Race"), [a.userId, b.userId])

    const first = await openAdmin()
    const second = await openAdmin()

    try {
      await first.query("begin")
      await first.query(
        "delete from public.group_members where group_id = $1 and user_id = $2",
        [id, a.userId]
      )

      // Fire the second delete without awaiting: its trigger must block on the
      // advisory lock the first transaction still holds. Without the lock it
      // would run now, still see A's uncommitted row, and skip the cleanup -
      // leaving a permanent zero-member group.
      await second.query("begin")
      const secondDelete = second.query(
        "delete from public.group_members where group_id = $1 and user_id = $2",
        [id, b.userId]
      )

      await new Promise(resolve => setTimeout(resolve, 300))
      await first.query("commit")

      await secondDelete
      await second.query("commit")
    } finally {
      await first.end()
      await second.end()
    }

    expect(await groupExists(id)).toBe(false)
  })

  it("reaps when a member's account is deleted and the membership cascades", async () => {
    const user = await createTestUser()
    const id = await makeGroup(unique("Reap Cascade"), [user.userId])

    await withAdmin(c => c.query("delete from auth.users where id = $1", [user.userId]))

    expect(await groupExists(id)).toBe(false)
  })
})
