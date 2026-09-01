import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient, type TestUser } from "./helpers/users"

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function ready(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_groups_policy")
  return user
}

async function withFeatureEnabled<T>(fn: () => Promise<T>): Promise<T> {
  await withAdmin(c =>
    c.query("update public.app_settings set value = 'true' where key = 'groups_enabled'")
  )
  try {
    return await fn()
  } finally {
    await withAdmin(c =>
      c.query("update public.app_settings set value = 'false' where key = 'groups_enabled'")
    )
  }
}

async function memberCount(groupId: string): Promise<number> {
  return withAdmin(async c => {
    const r = await c.query(
      "select count(*)::int as n from public.group_members where group_id = $1",
      [groupId]
    )
    return r.rows[0].n
  })
}

describe("join_group", () => {
  it("adds the caller and is idempotent", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Join Club"),
        p_description: ""
      })

      expect((await joiner.client.rpc("join_group", { p_group_id: group.id })).error).toBeNull()
      expect((await joiner.client.rpc("join_group", { p_group_id: group.id })).error).toBeNull()

      expect(await memberCount(group.id)).toBe(2)
    })
  })

  it("refuses a caller who has not accepted the policy", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await createTestUser()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Consent Join"),
        p_description: ""
      })

      const { error } = await joiner.client.rpc("join_group", { p_group_id: group.id })
      expect(error?.hint).toBe("groups.consent_required")
      expect(await memberCount(group.id)).toBe(1)
    })
  })

  it("refuses when the feature flag is off", async () => {
    const owner = await ready()
    const groupId = await withAdmin(async c => {
      const r = await c.query(
        "insert into public.groups (name, created_by) values ($1, $2) returning id",
        [unique("Flag Join"), owner.userId]
      )
      await c.query("insert into public.group_members (group_id, user_id) values ($1, $2)", [
        r.rows[0].id,
        owner.userId
      ])
      return r.rows[0].id as string
    })

    const joiner = await ready()
    const { error } = await joiner.client.rpc("join_group", { p_group_id: groupId })
    expect(error?.hint).toBe("groups.disabled")

    await withAdmin(c => c.query("delete from public.group_members where group_id = $1", [groupId]))
  })

  it("reports a missing group rather than a raw foreign-key violation", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const { error } = await user.client.rpc("join_group", {
        p_group_id: "00000000-0000-0000-0000-0000000000ff"
      })
      expect(error?.hint).toBe("groups.not_found")
      expect(error?.code).not.toBe("23503")
    })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("join_group", {
      p_group_id: "00000000-0000-0000-0000-0000000000ff"
    })
    expect(error).not.toBeNull()
  })
})

describe("leave_group", () => {
  it("removes only the caller", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Leave Club"),
        p_description: ""
      })
      await joiner.client.rpc("join_group", { p_group_id: group.id })

      await joiner.client.rpc("leave_group", { p_group_id: group.id })

      const remaining = await withAdmin(async c => {
        const r = await c.query(
          "select user_id from public.group_members where group_id = $1",
          [group.id]
        )
        return r.rows.map(row => row.user_id)
      })
      expect(remaining).toEqual([owner.userId])
    })
  })

  it("deletes the group when the last member leaves", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Last Out"),
        p_description: ""
      })

      await owner.client.rpc("leave_group", { p_group_id: group.id })

      const exists = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int as n from public.groups where id = $1",
          [group.id]
        )
        return r.rows[0].n > 0
      })
      expect(exists).toBe(false)
    })
  })

  it("is a silent no-op when the caller is not a member", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const stranger = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("NoOp Club"),
        p_description: ""
      })

      const { error } = await stranger.client.rpc("leave_group", { p_group_id: group.id })
      expect(error).toBeNull()
      expect(await memberCount(group.id)).toBe(1)
    })
  })

  it("works even when the feature flag is off, so nobody is trapped in a group", async () => {
    const owner = await ready()
    const groupId = await withAdmin(async c => {
      const r = await c.query(
        "insert into public.groups (name, created_by) values ($1, $2) returning id",
        [unique("Trapped"), owner.userId]
      )
      await c.query("insert into public.group_members (group_id, user_id) values ($1, $2)", [
        r.rows[0].id,
        owner.userId
      ])
      return r.rows[0].id as string
    })

    const { error } = await owner.client.rpc("leave_group", { p_group_id: groupId })
    expect(error).toBeNull()
    expect(await memberCount(groupId)).toBe(0)
  })
})
