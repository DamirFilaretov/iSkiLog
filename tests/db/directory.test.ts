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

describe("list_groups", () => {
  it("returns member counts and the caller's own membership flag", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const other = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Listed Club"),
        p_description: "hello"
      })

      const asOwner = await owner.client.rpc("list_groups")
      expect(asOwner.error).toBeNull()
      const ownerRow = asOwner.data.find((r: any) => r.group_id === group.id)
      expect(ownerRow.member_count).toBe(1)
      expect(ownerRow.is_member).toBe(true)
      expect(ownerRow.group_description).toBe("hello")

      const asOther = await other.client.rpc("list_groups")
      const otherRow = asOther.data.find((r: any) => r.group_id === group.id)
      expect(otherRow.is_member).toBe(false)
    })
  })

  it("never exposes created_by or any auth user id", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      await owner.client.rpc("create_group", {
        p_name: unique("No CreatedBy"),
        p_description: ""
      })

      const { data } = await owner.client.rpc("list_groups")
      const keys = Object.keys(data[0])
      expect(keys).not.toContain("created_by")
      expect(JSON.stringify(data)).not.toContain(owner.userId)
    })
  })

  it("returns at most 200 rows", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const { data } = await user.client.rpc("list_groups")
      expect(data.length).toBeLessThanOrEqual(200)
    })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("list_groups")
    expect(error).not.toBeNull()
  })
})

describe("search_groups", () => {
  it("finds a group beyond the browse cap by name", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const searcher = await ready()
      const marker = `Zz${Date.now()}`
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: `${marker} Hidden Club`,
        p_description: ""
      })

      const { data, error } = await searcher.client.rpc("search_groups", { p_query: marker })
      expect(error).toBeNull()
      expect(data.map((r: any) => r.group_id)).toContain(group.id)
    })
  })

  it("matches case-insensitively and ignores surrounding whitespace", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const marker = `Yy${Date.now()}`
      await owner.client.rpc("create_group", {
        p_name: `${marker} Mixed Case`,
        p_description: ""
      })

      const { data } = await owner.client.rpc("search_groups", {
        p_query: `  ${marker.toUpperCase()}  `
      })
      expect(data.length).toBe(1)
    })
  })

  it("returns nothing for a query that matches no group", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const { data } = await user.client.rpc("search_groups", {
        p_query: `nomatch${Date.now()}`
      })
      expect(data).toEqual([])
    })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("search_groups", { p_query: "x" })
    expect(error).not.toBeNull()
  })
})

describe("search_groups wildcard safety", () => {
  it("treats % as a literal character, not a wildcard", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const name = unique("Wildcard Bait")
      await user.client.rpc("create_group", { p_name: name, p_description: "" })

      // A wildcard would match this group; a literal '%' must not.
      const { data } = await user.client.rpc("search_groups", { p_query: "%" })
      expect(data.map((r: any) => r.group_name)).not.toContain(name)
    })
  })

  it("treats _ as a literal character, not a wildcard", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const name = unique("Underscore Bait")
      await user.client.rpc("create_group", { p_name: name, p_description: "" })

      const { data } = await user.client.rpc("search_groups", { p_query: "_" })
      expect(data.map((r: any) => r.group_name)).not.toContain(name)
    })
  })

  it("still finds a group whose name genuinely contains a percent sign", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const marker = `Pct${Date.now()}`
      await user.client.rpc("create_group", {
        p_name: `${marker} 100% Effort`,
        p_description: ""
      })

      const { data } = await user.client.rpc("search_groups", { p_query: `${marker} 100% Effort` })
      expect(data.length).toBe(1)
    })
  })
})

describe("directory cap with a full directory", () => {
  it("browses exactly 200 and leaves the rest reachable only by search", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const marker = `Deep${Date.now()}`

      // 201 groups, all with one member so member_count cannot rank them above
      // the target, and the target named to sort last alphabetically.
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
          [`zzz ${marker} Hidden Target`]
        )
        await c.query("insert into public.group_members (group_id, user_id) values ($1, $2)", [
          target.rows[0].id,
          user.userId
        ])
        return target.rows[0].id as string
      })

      const browse = await user.client.rpc("list_groups")
      expect(browse.data.length).toBe(200)
      expect(browse.data.find((r: any) => r.group_id === targetId)).toBeUndefined()

      const search = await user.client.rpc("search_groups", { p_query: `${marker} Hidden Target` })
      expect(search.data.map((r: any) => r.group_id)).toContain(targetId)

      // Seeded groups would otherwise occupy the browse cap for every other
      // test in this file.
      await withAdmin(c =>
        c.query("delete from public.groups where name like $1", [`%${marker}%`])
      )
    })
  })
})
