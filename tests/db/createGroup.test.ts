import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient, type TestUser } from "./helpers/users"
import { openAsUser, closeQuietly } from "./helpers/asUser"
import { withFeatureDisabled, withFeatureEnabled } from "./helpers/featureFlag"

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`

/** A user who has accepted the policy, with the feature switched on. */
async function ready(): Promise<TestUser> {
  const user = await createTestUser()
  await user.client.rpc("accept_groups_policy")
  return user
}

describe("create_group", () => {
  it("creates the group, joins the creator and logs the creation atomically", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const name = unique("Alpha Club")

      const { data, error } = await user.client.rpc("create_group", {
        p_name: name,
        p_description: "Weekday mornings"
      })
      expect(error).toBeNull()

      const row = await withAdmin(async c => {
        const r = await c.query(
          `select g.name, g.created_by,
                  (select count(*)::int from public.group_members m where m.group_id = g.id) as members,
                  (select count(*)::int from public.group_creation_log l where l.creator_id = g.created_by) as logged
             from public.groups g where g.id = $1`,
          [data.id]
        )
        return r.rows[0]
      })
      expect(row.name).toBe(name)
      expect(row.created_by).toBe(user.userId)
      expect(row.members).toBe(1)
      expect(row.logged).toBe(1)
    })
  })

  it("stores a whitespace-normalised display name", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const { data } = await user.client.rpc("create_group", {
        p_name: `  ${unique("Spaced")}   Club  `,
        p_description: ""
      })
      expect(data.name).not.toMatch(/^\s|\s$|\s\s/)
    })
  })

  it("refuses when the feature flag is off", async () => {
    await withFeatureDisabled(async () => {
      const user = await ready()
      const { error } = await user.client.rpc("create_group", {
        p_name: unique("Disabled Club"),
        p_description: ""
      })
      expect(error?.hint).toBe("groups.disabled")
    })
  })

  it("refuses a caller who has not accepted the policy", async () => {
    await withFeatureEnabled(async () => {
      const user = await createTestUser()
      const { error } = await user.client.rpc("create_group", {
        p_name: unique("No Consent"),
        p_description: ""
      })
      expect(error?.hint).toBe("groups.consent_required")
    })
  })

  it("refuses a duplicate name regardless of case", async () => {
    await withFeatureEnabled(async () => {
      const a = await ready()
      const b = await ready()
      const name = unique("Dup Club")

      await a.client.rpc("create_group", { p_name: name, p_description: "" })
      const { error } = await b.client.rpc("create_group", {
        p_name: name.toUpperCase(),
        p_description: ""
      })
      expect(error?.hint).toBe("groups.name_taken")
    })
  })

  it("refuses names that are too short, too long, or null", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      for (const bad of ["A", "x".repeat(41), null]) {
        const { error } = await user.client.rpc("create_group", {
          p_name: bad,
          p_description: ""
        })
        expect(error?.hint, `name=${String(bad)}`).toBe("groups.invalid_name")
      }
    })
  })

  it("refuses an over-long description", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const { error } = await user.client.rpc("create_group", {
        p_name: unique("Desc Club"),
        p_description: "y".repeat(201)
      })
      expect(error?.hint).toBe("groups.invalid_description")
    })
  })

  it("refuses a denylisted name", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      await withAdmin(c =>
        c.query("insert into public.moderation_terms (term) values ('bannedword') on conflict do nothing")
      )
      try {
        const { error } = await user.client.rpc("create_group", {
          p_name: "My bannedword crew",
          p_description: ""
        })
        expect(error?.hint).toBe("groups.name_rejected")
      } finally {
        await withAdmin(c =>
          c.query("delete from public.moderation_terms where term = 'bannedword'")
        )
      }
    })
  })

  it("enforces the live-group quota", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      await withAdmin(async c => {
        for (let i = 0; i < 10; i++) {
          const g = await c.query(
            "insert into public.groups (name, created_by) values ($1, $2) returning id",
            [unique(`Quota ${i}`), user.userId]
          )
          await c.query(
            "insert into public.group_members (group_id, user_id) values ($1, $2)",
            [g.rows[0].id, user.userId]
          )
        }
      })

      const { error } = await user.client.rpc("create_group", {
        p_name: unique("Over Quota"),
        p_description: ""
      })
      expect(error?.hint).toBe("groups.quota_exceeded")
    })
  })

  it("counts the hourly limit from the log, so create-then-leave cannot reset it", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()

      // Create and immediately leave, five times. Each group is reaped, so a
      // limit counting live rows would never see any of them.
      for (let i = 0; i < 5; i++) {
        const { data, error } = await user.client.rpc("create_group", {
          p_name: unique(`Churn ${i}`),
          p_description: ""
        })
        expect(error, `create ${i}`).toBeNull()
        await withAdmin(c =>
          c.query("delete from public.group_members where group_id = $1", [data.id])
        )
      }

      const live = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int as n from public.groups where created_by = $1",
          [user.userId]
        )
        return r.rows[0].n
      })
      expect(live).toBe(0)

      const { error } = await user.client.rpc("create_group", {
        p_name: unique("Sixth"),
        p_description: ""
      })
      expect(error?.hint).toBe("groups.rate_limited")
    })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("create_group", {
      p_name: "Anon Club",
      p_description: ""
    })
    expect(error).not.toBeNull()
  })
})

describe("create_group content filtering", () => {
  it("refuses a denylisted description, which list_groups would otherwise publish", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      await withAdmin(c =>
        c.query("insert into public.moderation_terms (term) values ('bannedword') on conflict do nothing")
      )
      try {
        const { error } = await user.client.rpc("create_group", {
          p_name: unique("Innocent Name"),
          p_description: "Come join us bannedword and friends"
        })
        expect(error?.hint).toBe("groups.description_rejected")
      } finally {
        await withAdmin(c =>
          c.query("delete from public.moderation_terms where term = 'bannedword'")
        )
      }
    })
  })

  it("matches denylist terms case-insensitively", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      await withAdmin(c =>
        c.query("insert into public.moderation_terms (term) values ('bannedword') on conflict do nothing")
      )
      try {
        const { error } = await user.client.rpc("create_group", {
          p_name: `My BANNEDWORD crew`,
          p_description: ""
        })
        expect(error?.hint).toBe("groups.name_rejected")
      } finally {
        await withAdmin(c =>
          c.query("delete from public.moderation_terms where term = 'bannedword'")
        )
      }
    })
  })

  it("treats a denylist term containing % as a literal, not a wildcard", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      await withAdmin(c =>
        c.query("insert into public.moderation_terms (term) values ('%') on conflict do nothing")
      )
      try {
        // A literal '%' must not match every name.
        const { error } = await user.client.rpc("create_group", {
          p_name: unique("Perfectly Fine"),
          p_description: ""
        })
        expect(error).toBeNull()
      } finally {
        await withAdmin(c => c.query("delete from public.moderation_terms where term = '%'"))
      }
    })
  })

  it("returns only public fields, never an auth user id", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const { data } = await user.client.rpc("create_group", {
        p_name: unique("Shape Club"),
        p_description: "hello"
      })
      expect(Object.keys(data).sort()).toEqual(
        ["created_at", "description", "id", "logo_key", "name"].sort()
      )
      expect(JSON.stringify(data)).not.toContain(user.userId)
    })
  })
})

describe("create_group concurrency", () => {
  it("cannot exceed the quota when two creates overlap at the boundary", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      await withAdmin(async c => {
        for (let i = 0; i < 9; i++) {
          const g = await c.query(
            "insert into public.groups (name, created_by) values ($1, $2) returning id",
            [unique(`Race Quota ${i}`), user.userId]
          )
          await c.query(
            "insert into public.group_members (group_id, user_id) values ($1, $2)",
            [g.rows[0].id, user.userId]
          )
        }
      })

      // Two real transactions held open across the contended window. Two
      // overlapping supabase-js calls do not achieve this - they serialise at
      // the HTTP layer and the test passes with or without the lock.
      const first = await openAsUser(user.userId)
      const second = await openAsUser(user.userId)
      const outcomes: string[] = []

      try {
        await first.query("select public.create_group($1, $2)", [unique("Racer A"), ""])
        outcomes.push("first-created")

        const secondCall = second
          .query("select public.create_group($1, $2)", [unique("Racer B"), ""])
          .then(() => {
            outcomes.push("second-created")
          })
          .catch((e: { hint?: string }) => {
            outcomes.push(e.hint === "groups.quota_exceeded" ? "second-refused" : `second-error`)
          })

        // Without lock_creator the second transaction proceeds immediately,
        // still sees nine live groups, and creates an eleventh.
        await new Promise(resolve => setTimeout(resolve, 300))
        await first.query("commit")
        await secondCall
        await second.query("commit").catch(() => undefined)
      } finally {
        await closeQuietly(first)
        await closeQuietly(second)
      }

      expect(outcomes).toEqual(["first-created", "second-refused"])

      const live = await withAdmin(async c => {
        const r = await c.query(
          "select count(*)::int as n from public.groups where created_by = $1",
          [user.userId]
        )
        return r.rows[0].n
      })
      expect(live).toBe(10)
    })
  })
})
