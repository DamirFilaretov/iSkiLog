import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { withFeatureDisabled, withFeatureEnabled } from "./helpers/featureFlag"
import { createTestUser, anonClient } from "./helpers/users"

describe("app_settings", () => {
  // The shipped default (`groups_enabled = 'false'`) is set by the Groups
  // migration's seed and guarded again by the staged rollout; a developer may leave the local
  // flag on to use the app, so this pins the row shape and the policy version
  // with the flag explicitly held off.
  it("holds the Groups flag and a policy version", async () => {
    await withFeatureDisabled(async () => {
      const rows = await withAdmin(async c => {
        const r = await c.query(
          "select key, value from public.app_settings where key = any($1) order by key",
          [["groups_enabled", "groups_policy_version"]]
        )
        return r.rows
      })
      expect(rows).toEqual([
        { key: "groups_enabled", value: "false" },
        { key: "groups_policy_version", value: "1" }
      ])
    })
  })

  it("is not readable by a signed-in client", async () => {
    const user = await createTestUser()
    const { error } = await user.client.from("app_settings").select("*").limit(1)
    expect(error).not.toBeNull()
  })
})

describe("groups_status", () => {
  it("reports the feature disabled and consent outstanding", async () => {
    await withFeatureDisabled(async () => {
      const user = await createTestUser()
      const { data, error } = await user.client.rpc("groups_status")
      expect(error).toBeNull()
      expect(data).toMatchObject({ enabled: false, consent_needed: true })
    })
  })

  it("reports the feature enabled once the flag is flipped", async () => {
    await withFeatureEnabled(async () => {
      const user = await createTestUser()
      const { data } = await user.client.rpc("groups_status")
      expect(data).toMatchObject({ enabled: true })
    })
  })

  it("reports consent satisfied once the current version is accepted", async () => {
    const user = await createTestUser()
    await user.client.rpc("accept_groups_policy")

    const { data } = await user.client.rpc("groups_status")
    expect(data).toMatchObject({ consent_needed: false })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("groups_status")
    expect(error).not.toBeNull()
  })
})

describe("accept_groups_policy", () => {
  it("records the server's current version, not one the client supplies", async () => {
    const user = await createTestUser()
    const { error } = await user.client.rpc("accept_groups_policy")
    expect(error).toBeNull()

    const rows = await withAdmin(async c => {
      const r = await c.query(
        `select policy_key, version from public.policy_acceptances
          where user_id = $1`,
        [user.userId]
      )
      return r.rows
    })
    expect(rows).toEqual([{ policy_key: "groups", version: 1 }])
  })

  it("is idempotent", async () => {
    const user = await createTestUser()
    await user.client.rpc("accept_groups_policy")
    await user.client.rpc("accept_groups_policy")

    const count = await withAdmin(async c => {
      const r = await c.query(
        "select count(*)::int as n from public.policy_acceptances where user_id = $1",
        [user.userId]
      )
      return r.rows[0].n
    })
    expect(count).toBe(1)
  })

  it("goes stale when the server bumps the policy version", async () => {
    const user = await createTestUser()
    await user.client.rpc("accept_groups_policy")

    await withAdmin(c =>
      c.query("update public.app_settings set value = '2' where key = 'groups_policy_version'")
    )
    try {
      const { data } = await user.client.rpc("groups_status")
      expect(data.consent_needed).toBe(true)
    } finally {
      await withAdmin(c =>
        c.query("update public.app_settings set value = '1' where key = 'groups_policy_version'")
      )
    }
  })

  it("stamps accepted_at on the server, not from the client", async () => {
    const user = await createTestUser()
    await user.client.rpc("accept_groups_policy")

    const drift = await withAdmin(async c => {
      const r = await c.query(
        `select abs(extract(epoch from (timezone('utc', now()) - accepted_at))) as drift
           from public.policy_acceptances where user_id = $1`,
        [user.userId]
      )
      return Number(r.rows[0].drift)
    })
    expect(drift).toBeLessThan(60)
  })

  it("is not writable directly", async () => {
    const user = await createTestUser()
    const { error } = await user.client
      .from("policy_acceptances")
      .insert({ user_id: user.userId, policy_key: "groups", version: 99 })
    expect(error).not.toBeNull()
  })
})
