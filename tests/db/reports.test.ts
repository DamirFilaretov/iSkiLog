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

async function reportsBy(userId: string) {
  return withAdmin(async c => {
    const r = await c.query(
      `select target_type, target_group_id, target_user_id,
              snapshot_name, snapshot_description, reason
         from public.abuse_reports where reporter_id = $1`,
      [userId]
    )
    return r.rows
  })
}

describe("report_group", () => {
  it("snapshots the offending text at report time", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const reporter = await ready()
      const name = unique("Reported Club")
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: name,
        p_description: "Something objectionable"
      })

      const { error } = await reporter.client.rpc("report_group", {
        p_group_id: group.id,
        p_reason: "offensive"
      })
      expect(error).toBeNull()

      const rows = await reportsBy(reporter.userId)
      expect(rows.length).toBe(1)
      expect(rows[0].snapshot_name).toBe(name)
      expect(rows[0].snapshot_description).toBe("Something objectionable")
      expect(rows[0].reason).toBe("offensive")
    })
  })

  it("survives deletion of the group it describes", async () => {
    await withFeatureEnabled(async () => {
      const abuser = await ready()
      const reporter = await ready()
      const name = unique("Vanishing Club")
      const { data: group } = await abuser.client.rpc("create_group", {
        p_name: name,
        p_description: ""
      })
      await reporter.client.rpc("join_group", { p_group_id: group.id })
      await reporter.client.rpc("report_group", { p_group_id: group.id, p_reason: "offensive" })

      // The abuser leaves last, reaping the group - and with a cascade this
      // would destroy the only evidence of what they did.
      await reporter.client.rpc("leave_group", { p_group_id: group.id })
      await abuser.client.rpc("leave_group", { p_group_id: group.id })

      const gone = await withAdmin(async c => {
        const r = await c.query("select count(*)::int as n from public.groups where id = $1", [
          group.id
        ])
        return r.rows[0].n === 0
      })
      expect(gone).toBe(true)

      const rows = await reportsBy(reporter.userId)
      expect(rows.length).toBe(1)
      expect(rows[0].target_group_id).toBeNull()
      expect(rows[0].snapshot_name).toBe(name)
    })
  })

  it("accepts one report per reporter per group", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const reporter = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Spam Report"),
        p_description: ""
      })

      await reporter.client.rpc("report_group", { p_group_id: group.id, p_reason: "one" })
      await reporter.client.rpc("report_group", { p_group_id: group.id, p_reason: "two" })

      expect((await reportsBy(reporter.userId)).length).toBe(1)
    })
  })

  it("truncates an over-long reason", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const reporter = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Long Reason"),
        p_description: ""
      })

      await reporter.client.rpc("report_group", {
        p_group_id: group.id,
        p_reason: "z".repeat(900)
      })

      const rows = await reportsBy(reporter.userId)
      expect(rows[0].reason.length).toBe(500)
    })
  })

  it("reports a group that no longer exists as not found", async () => {
    await withFeatureEnabled(async () => {
      const reporter = await ready()
      const { error } = await reporter.client.rpc("report_group", {
        p_group_id: "00000000-0000-0000-0000-0000000000ff",
        p_reason: "x"
      })
      expect(error?.hint).toBe("groups.not_found")
    })
  })
})

describe("report_profile", () => {
  it("reports a display name by membership handle, snapshotting it", async () => {
    await withFeatureEnabled(async () => {
      const a = await ready()
      const b = await ready()
      const { data: group } = await a.client.rpc("create_group", {
        p_name: unique("Profile Report"),
        p_description: ""
      })
      await b.client.rpc("join_group", { p_group_id: group.id })
      await withAdmin(c =>
        c.query(
          `insert into public.profiles (user_id, full_name) values ($1, $2)
           on conflict (user_id) do update set full_name = excluded.full_name`,
          [b.userId, "Rude Name"]
        )
      )

      const handle = await withAdmin(async c => {
        const r = await c.query(
          "select id from public.group_members where group_id = $1 and user_id = $2",
          [group.id, b.userId]
        )
        return r.rows[0].id as string
      })

      const { error } = await a.client.rpc("report_profile", {
        p_membership_id: handle,
        p_reason: "abusive display name"
      })
      expect(error).toBeNull()

      const rows = await reportsBy(a.userId)
      expect(rows[0].target_type).toBe("profile")
      expect(rows[0].target_user_id).toBe(b.userId)
      expect(rows[0].snapshot_name).toBe("Rude Name")
    })
  })

  it("refuses to report someone the caller shares no group with", async () => {
    await withFeatureEnabled(async () => {
      const a = await ready()
      const b = await ready()
      const outsider = await ready()
      const { data: group } = await a.client.rpc("create_group", {
        p_name: unique("Closed Circle"),
        p_description: ""
      })
      await b.client.rpc("join_group", { p_group_id: group.id })

      const handle = await withAdmin(async c => {
        const r = await c.query(
          "select id from public.group_members where group_id = $1 and user_id = $2",
          [group.id, b.userId]
        )
        return r.rows[0].id as string
      })

      const { error } = await outsider.client.rpc("report_profile", {
        p_membership_id: handle,
        p_reason: "x"
      })
      expect(error?.hint).toBe("groups.invalid_handle")
    })
  })
})

describe("abuse_reports table", () => {
  it("is neither readable nor writable by a signed-in client", async () => {
    const user = await createTestUser()
    expect((await user.client.from("abuse_reports").select("*").limit(1)).error).not.toBeNull()
    expect(
      (await user.client.from("abuse_reports").insert({
        reporter_id: user.userId,
        target_type: "group"
      })).error
    ).not.toBeNull()
  })

  it("is unreachable anonymously through either RPC", async () => {
    expect(
      (await anonClient().rpc("report_group", { p_group_id: null, p_reason: "x" })).error
    ).not.toBeNull()
    expect(
      (await anonClient().rpc("report_profile", { p_membership_id: null, p_reason: "x" })).error
    ).not.toBeNull()
  })
})
