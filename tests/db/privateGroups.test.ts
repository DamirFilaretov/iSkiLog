import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient, type TestUser } from "./helpers/users"
import { withFeatureDisabled, withFeatureEnabled } from "./helpers/featureFlag"

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function ready(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_groups_policy")
  return user
}

async function createPrivate(user: TestUser, name = unique("Private")) {
  const { data, error } = await user.client.rpc("create_group", {
    p_name: name,
    p_description: "",
    p_private: true
  })
  expect(error).toBeNull()
  return data as { id: string; is_private: boolean; join_code: string }
}

describe("create_group — private", () => {
  it("returns a 6-digit code and marks the group private", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const group = await createPrivate(owner)

      expect(group.is_private).toBe(true)
      expect(group.join_code).toMatch(/^\d{6}$/)

      const stored = await withAdmin(async c => {
        const r = await c.query(
          "select is_private, join_code from public.groups where id = $1",
          [group.id]
        )
        return r.rows[0]
      })
      expect(stored.is_private).toBe(true)
      expect(stored.join_code).toBe(group.join_code)
    })
  })

  it("leaves a public group with no code", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data } = await owner.client.rpc("create_group", {
        p_name: unique("Public"),
        p_description: ""
      })
      expect(data.is_private).toBe(false)
      expect(data.join_code).toBeNull()
    })
  })

  it("generates distinct codes across many creates", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const codes = new Set<string>()
      for (let i = 0; i < 8; i++) {
        const g = await createPrivate(owner, unique("Bulk"))
        codes.add(g.join_code)
        // Stay clear of the 10-live / 5-per-hour creation limits.
        await owner.client.rpc("leave_group", { p_group_id: g.id })
        await withAdmin(c =>
          c.query("delete from public.group_creation_log where creator_id = $1", [owner.userId])
        )
      }
      expect(codes.size).toBe(8)
    })
  })

  it("counts toward the creation quota like any group", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const seen = await withAdmin(async c => {
        const g = await c.query(
          "insert into public.groups (name, created_by) select $2 || n, $1 from generate_series(1,10) n returning id",
          [owner.userId, unique("Quota")]
        )
        for (const row of g.rows) {
          await c.query(
            "insert into public.group_members (group_id, user_id) values ($1, $2)",
            [row.id, owner.userId]
          )
        }
        return g.rows.length
      })
      expect(seen).toBe(10)

      const { error } = await owner.client.rpc("create_group", {
        p_name: unique("Over"),
        p_description: "",
        p_private: true
      })
      expect(error?.hint).toBe("groups.quota_exceeded")
    })
  })
})

describe("private groups are discoverable but still code-gated", () => {
  it("appears in list_groups flagged private, without leaking its code", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const group = await createPrivate(owner, unique("Disco"))

      const browse = await owner.client.rpc("list_groups")
      const row = browse.data.find((r: any) => r.group_id === group.id)
      expect(row).toBeDefined()
      expect(row.is_private).toBe(true)
      expect(row).not.toHaveProperty("join_code")
    })
  })

  it("is found by search_groups by name, flagged private", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const marker = `Zz${Date.now()}`
      const group = await createPrivate(owner, `${marker} Secret Crew`)

      const search = await owner.client.rpc("search_groups", { p_query: marker })
      expect(search.error).toBeNull()
      const row = search.data.find((r: any) => r.group_id === group.id)
      expect(row).toBeDefined()
      expect(row.is_private).toBe(true)
      expect(row).not.toHaveProperty("join_code")
    })
  })

  it("flags a public group is_private false in list_groups", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data: pub } = await owner.client.rpc("create_group", {
        p_name: unique("Open Discover"),
        p_description: ""
      })
      const browse = await owner.client.rpc("list_groups")
      const row = browse.data.find((r: any) => r.group_id === pub.id)
      expect(row.is_private).toBe(false)
    })
  })

  it("is returned by list_my_groups with its code, to a member", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const group = await createPrivate(owner)

      const mine = await owner.client.rpc("list_my_groups")
      const row = mine.data.find((r: any) => r.group_id === group.id)
      expect(row.is_private).toBe(true)
      expect(row.join_code).toBe(group.join_code)
    })
  })

  it("list_my_groups shows a public group with is_private false and a null code", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data: pub } = await owner.client.rpc("create_group", {
        p_name: unique("Open"),
        p_description: ""
      })
      const mine = await owner.client.rpc("list_my_groups")
      const row = mine.data.find((r: any) => r.group_id === pub.id)
      expect(row.is_private).toBe(false)
      expect(row.join_code).toBeNull()
    })
  })
})

describe("join_group_by_code", () => {
  it("joins a private group with the right code", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const group = await createPrivate(owner)

      const { error } = await joiner.client.rpc("join_group_by_code", {
        p_code: group.join_code
      })
      expect(error).toBeNull()

      const mine = await joiner.client.rpc("list_my_groups")
      expect(mine.data.some((r: any) => r.group_id === group.id)).toBe(true)
    })
  })

  it("trims surrounding whitespace from the code", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const group = await createPrivate(owner)

      const { error } = await joiner.client.rpc("join_group_by_code", {
        p_code: `  ${group.join_code}  `
      })
      expect(error).toBeNull()
    })
  })

  it("rejects a wrong code with groups.invalid_code", async () => {
    await withFeatureEnabled(async () => {
      const joiner = await ready()
      const { error } = await joiner.client.rpc("join_group_by_code", {
        p_code: "000000"
      })
      expect(error?.hint).toBe("groups.invalid_code")
    })
  })

  it("is idempotent for a member", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const group = await createPrivate(owner)
      await joiner.client.rpc("join_group_by_code", { p_code: group.join_code })
      const { error } = await joiner.client.rpc("join_group_by_code", {
        p_code: group.join_code
      })
      expect(error).toBeNull()

      const count = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int n from public.group_members where group_id = $1 and user_id = $2",
          [group.id, joiner.userId]
        )
        return r.rows[0].n
      })
      expect(count).toBe(1)
    })
  })

  it("refuses a caller who has not accepted the policy", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const group = await createPrivate(owner)

      const stranger = await createTestUser() // no accept_groups_policy
      const { error } = await stranger.client.rpc("join_group_by_code", {
        p_code: group.join_code
      })
      expect(error?.hint).toBe("groups.consent_required")
    })
  })

  it("refuses when the feature flag is off", async () => {
    const owner = await ready()
    const groupId = await withAdmin(async c => {
      const r = await c.query(
        // A literal code that is NOT the one seed.sql plants ('424242'), so this
        // passes on a seeded DB too (groups_join_code_unique is a partial index).
        "insert into public.groups (name, created_by, is_private, join_code) values ($1, $2, true, '314159') returning id",
        [unique("Flagged Private"), owner.userId]
      )
      await c.query(
        "insert into public.group_members (group_id, user_id) values ($1, $2)",
        [r.rows[0].id, owner.userId]
      )
      return r.rows[0].id as string
    })

    await withFeatureDisabled(async () => {
      const joiner = await ready()
      const { error } = await joiner.client.rpc("join_group_by_code", { p_code: "314159" })
      expect(error?.hint).toBe("groups.disabled")
    })

    await withAdmin(c => c.query("delete from public.group_members where group_id = $1", [groupId]))
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("join_group_by_code", { p_code: "123456" })
    expect(error).not.toBeNull()
  })
})

describe("join_group refuses a private group", () => {
  it("raises groups.code_required when called with a private group's id", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      const group = await createPrivate(owner)

      const { error } = await joiner.client.rpc("join_group", { p_group_id: group.id })
      expect(error?.hint).toBe("groups.code_required")
    })
  })
})

describe("groups_join_code_unique", () => {
  it("rejects a second group with the same code", async () => {
    await expect(
      withAdmin(c =>
        c.query(
          `insert into public.groups (name, is_private, join_code) values
             ($1, true, '999999'), ($2, true, '999999')`,
          [unique("Dup A"), unique("Dup B")]
        )
      )
    ).rejects.toThrow(/join_code_unique|duplicate key/)
  })

  it("allows many public groups (all null codes)", async () => {
    await withAdmin(c =>
      c.query(
        `insert into public.groups (name) values ($1), ($2), ($3)`,
        [unique("N1"), unique("N2"), unique("N3")]
      )
    )
  })
})
