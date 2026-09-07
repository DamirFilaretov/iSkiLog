import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient, type TestUser } from "./helpers/users"
import { withFeatureEnabled } from "./helpers/featureFlag"

/**
 * `list_my_groups` exists because `list_groups` is not a membership list.
 *
 * Browse hides groups whose creator is blocked in either direction and stops
 * at 200 rows, so a member could be shown no route to a group they are
 * standing inside — and `leave_group` is only reachable from that route. This
 * function is deliberately unfiltered and uncapped for exactly that reason,
 * which is what these tests pin down.
 */

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function ready(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_groups_policy")
  return user
}

async function block(blockerId: string, blockedId: string) {
  await withAdmin(c =>
    c.query(
      "insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing",
      [blockerId, blockedId]
    )
  )
}

describe("list_my_groups", () => {
  it("returns the caller's own memberships with counts and is_member true", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Mine Club"),
        p_description: "mine"
      })
      await joiner.client.rpc("join_group", { p_group_id: group.id })

      const { data, error } = await owner.client.rpc("list_my_groups")
      expect(error).toBeNull()
      const row = data.find((r: any) => r.group_id === group.id)
      expect(row.member_count).toBe(2)
      expect(row.is_member).toBe(true)
      expect(row.group_description).toBe("mine")
    })
  })

  it("omits groups the caller does not belong to", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const stranger = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Not Yours"),
        p_description: ""
      })

      const { data } = await stranger.client.rpc("list_my_groups")
      expect(data.map((r: any) => r.group_id)).not.toContain(group.id)
    })
  })

  it("drops a group the caller has left", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Leaving Club"),
        p_description: ""
      })
      await joiner.client.rpc("join_group", { p_group_id: group.id })
      await joiner.client.rpc("leave_group", { p_group_id: group.id })

      const { data } = await joiner.client.rpc("list_my_groups")
      expect(data.map((r: any) => r.group_id)).not.toContain(group.id)
    })
  })

  it("still lists a group whose creator has blocked the caller", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Blocked By Creator"),
        p_description: ""
      })
      await joiner.client.rpc("join_group", { p_group_id: group.id })
      await block(owner.userId, joiner.userId)

      // Browse hides it — which is the whole problem.
      const browse = await joiner.client.rpc("list_groups")
      expect(browse.data.map((r: any) => r.group_id)).not.toContain(group.id)

      const mine = await joiner.client.rpc("list_my_groups")
      expect(mine.data.map((r: any) => r.group_id)).toContain(group.id)
    })
  })

  it("still lists a group whose creator the caller has blocked", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Blocked The Creator"),
        p_description: ""
      })
      await joiner.client.rpc("join_group", { p_group_id: group.id })
      await block(joiner.userId, owner.userId)

      const mine = await joiner.client.rpc("list_my_groups")
      expect(mine.data.map((r: any) => r.group_id)).toContain(group.id)
    })
  })

  it("leaving stays possible from a group browse has hidden", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Escape Hatch"),
        p_description: ""
      })
      await joiner.client.rpc("join_group", { p_group_id: group.id })
      await block(owner.userId, joiner.userId)

      const mine = await joiner.client.rpc("list_my_groups")
      const row = mine.data.find((r: any) => r.group_id === group.id)
      const { error } = await joiner.client.rpc("leave_group", { p_group_id: row.group_id })
      expect(error).toBeNull()

      const after = await joiner.client.rpc("list_my_groups")
      expect(after.data.map((r: any) => r.group_id)).not.toContain(group.id)
    })
  })

  it("exposes no created_by and no auth user id", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      await owner.client.rpc("create_group", {
        p_name: unique("No Ids Here"),
        p_description: ""
      })

      const { data } = await owner.client.rpc("list_my_groups")
      expect(Object.keys(data[0])).not.toContain("created_by")
      expect(JSON.stringify(data)).not.toContain(owner.userId)
    })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("list_my_groups")
    expect(error).not.toBeNull()
  })

  it("returns a membership that falls past the 200-row browse cap", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const marker = `Own${Date.now()}`

      const targetId = await withAdmin(async c => {
        const filler = await c.query(
          `insert into public.groups (name)
           select 'AAA Filler ' || $1::text || ' ' || gs
             from generate_series(1, 200) gs
           returning id`,
          [marker]
        )
        for (const row of filler.rows) {
          await c.query(
            "insert into public.group_members (group_id, user_id) values ($1, $2)",
            [row.id, user.userId]
          )
        }
        const target = await c.query(
          "insert into public.groups (name) values ($1) returning id",
          [`zzz ${marker} Own Hidden Group`]
        )
        await c.query("insert into public.group_members (group_id, user_id) values ($1, $2)", [
          target.rows[0].id,
          user.userId
        ])
        return target.rows[0].id as string
      })

      const browse = await user.client.rpc("list_groups")
      expect(browse.data.find((r: any) => r.group_id === targetId)).toBeUndefined()

      const mine = await user.client.rpc("list_my_groups")
      expect(mine.data.map((r: any) => r.group_id)).toContain(targetId)

      await withAdmin(c =>
        c.query("delete from public.groups where name like $1", [`%${marker}%`])
      )
    })
  })
})
