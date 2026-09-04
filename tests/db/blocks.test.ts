import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient, type TestUser } from "./helpers/users"
import { withFeatureEnabled } from "./helpers/featureFlag"

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function ready(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_groups_policy")
  return user
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

async function membershipId(groupId: string, userId: string): Promise<string> {
  return withAdmin(async c => {
    const r = await c.query(
      "select id from public.group_members where group_id = $1 and user_id = $2",
      [groupId, userId]
    )
    return r.rows[0].id as string
  })
}

/** A shares a group with B. Returns B's membership handle as A would see it. */
async function pairInGroup() {
  const a = await ready()
  const b = await ready()
  const { data: group } = await a.client.rpc("create_group", {
    p_name: unique("Block Club"),
    p_description: ""
  })
  await b.client.rpc("join_group", { p_group_id: group.id })
  return { a, b, group, handle: await membershipId(group.id, b.userId) }
}

describe("user_blocks table", () => {
  it("is not readable or writable by a signed-in client", async () => {
    const user = await createTestUser()
    expect((await user.client.from("user_blocks").select("*").limit(1)).error).not.toBeNull()
    expect(
      (await user.client.from("user_blocks").insert({
        blocker_id: user.userId,
        blocked_id: user.userId
      })).error
    ).not.toBeNull()
  })
})

describe("block_group_member", () => {
  it("blocks by opaque membership handle, never by user id", async () => {
    await withFeatureEnabled(async () => {
      const { a, b, handle } = await pairInGroup()

      const { error } = await a.client.rpc("block_group_member", { p_membership_id: handle })
      expect(error).toBeNull()

      const stored = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int as n from public.user_blocks where blocker_id = $1 and blocked_id = $2",
          [a.userId, b.userId]
        )
        return r.rows[0].n
      })
      expect(stored).toBe(1)
    })
  })

  it("is idempotent", async () => {
    await withFeatureEnabled(async () => {
      const { a, b, handle } = await pairInGroup()
      await a.client.rpc("block_group_member", { p_membership_id: handle })
      await a.client.rpc("block_group_member", { p_membership_id: handle })

      const stored = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int as n from public.user_blocks where blocker_id = $1 and blocked_id = $2",
          [a.userId, b.userId]
        )
        return r.rows[0].n
      })
      expect(stored).toBe(1)
    })
  })

  it("refuses a member of a group the caller does not share", async () => {
    await withFeatureEnabled(async () => {
      const outsider = await ready()
      const { handle } = await pairInGroup()

      const { error } = await outsider.client.rpc("block_group_member", {
        p_membership_id: handle
      })
      expect(error?.hint).toBe("groups.invalid_handle")
    })
  })

  it("refuses self-blocking", async () => {
    await withFeatureEnabled(async () => {
      const a = await ready()
      const { data: group } = await a.client.rpc("create_group", {
        p_name: unique("Self Block"),
        p_description: ""
      })
      const own = await membershipId(group.id, a.userId)

      const { error } = await a.client.rpc("block_group_member", { p_membership_id: own })
      expect(error).not.toBeNull()
    })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("block_group_member", {
      p_membership_id: "00000000-0000-0000-0000-0000000000ff"
    })
    expect(error).not.toBeNull()
  })
})

describe("list_blocks / unblock", () => {
  it("lists blocks by opaque id and display name, never a user id", async () => {
    await withFeatureEnabled(async () => {
      const { a, b, handle } = await pairInGroup()
      await setName(b.userId, "Blocked Person")
      await a.client.rpc("block_group_member", { p_membership_id: handle })

      const { data, error } = await a.client.rpc("list_blocks")
      expect(error).toBeNull()
      expect(data.length).toBe(1)
      expect(data[0].display_name).toBe("Blocked Person")
      expect(JSON.stringify(data)).not.toContain(b.userId)
      expect(data[0].block_id).toMatch(/^[0-9a-f-]{36}$/)
    })
  })

  it("undoes a block, which is the only path back once both rows are hidden", async () => {
    await withFeatureEnabled(async () => {
      const { a, b, handle } = await pairInGroup()
      await a.client.rpc("block_group_member", { p_membership_id: handle })

      const { data } = await a.client.rpc("list_blocks")
      const { error } = await a.client.rpc("unblock", { p_block_id: data[0].block_id })
      expect(error).toBeNull()

      const remaining = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int as n from public.user_blocks where blocker_id = $1 and blocked_id = $2",
          [a.userId, b.userId]
        )
        return r.rows[0].n
      })
      expect(remaining).toBe(0)
    })
  })

  it("cannot unblock on someone else's behalf", async () => {
    await withFeatureEnabled(async () => {
      const { a, b, handle } = await pairInGroup()
      const stranger = await ready()
      await a.client.rpc("block_group_member", { p_membership_id: handle })

      const { data } = await a.client.rpc("list_blocks")
      await stranger.client.rpc("unblock", { p_block_id: data[0].block_id })

      const remaining = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int as n from public.user_blocks where blocker_id = $1 and blocked_id = $2",
          [a.userId, b.userId]
        )
        return r.rows[0].n
      })
      expect(remaining).toBe(1)
    })
  })

  it("hides a blocked user's groups from the directory in both directions", async () => {
    await withFeatureEnabled(async () => {
      const { a, b, handle } = await pairInGroup()
      const { data: theirs } = await b.client.rpc("create_group", {
        p_name: unique("Their Own Club"),
        p_description: ""
      })
      await a.client.rpc("block_group_member", { p_membership_id: handle })

      const asA = await a.client.rpc("list_groups")
      expect(asA.data.find((r: any) => r.group_id === theirs.id)).toBeUndefined()

      // Symmetric: B, who did not block anyone, also stops seeing A's groups.
      const asB = await b.client.rpc("list_groups")
      const aGroups = await withAdmin(async c => {
        const r = await c.query("select id from public.groups where created_by = $1", [a.userId])
        return r.rows.map(row => row.id)
      })
      for (const id of aGroups) {
        expect(asB.data.find((r: any) => r.group_id === id)).toBeUndefined()
      }
    })
  })
})
