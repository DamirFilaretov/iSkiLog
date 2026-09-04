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

async function addSet(userId: string, event: string, daysAgo: number) {
  await withAdmin(c =>
    c.query(
      `insert into public.sets (user_id, event_type, date)
       values ($1, $2, current_date - $3::int)`,
      [userId, event, daysAgo]
    )
  )
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

const board = (client: TestUser["client"], groupId: string, period = "7d", timezone = "UTC") =>
  client.rpc("fetch_group_leaderboard", {
    p_group_id: groupId,
    p_period: period,
    p_timezone: timezone
  })

/** Today's calendar date in a timezone, as YYYY-MM-DD — how Postgres returns a `date`. */
const dateIn = (timezone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date())

/** Shift a YYYY-MM-DD calendar date by whole days, staying in calendar space. */
function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10)
}

describe("fetch_group_leaderboard access control", () => {
  it("refuses a non-member", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const stranger = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Private Board"),
        p_description: ""
      })

      const { error } = await board(stranger.client, group.id)
      expect(error?.hint).toBe("groups.not_a_member")
    })
  })

  it("gives a non-member the same answer for a group that does not exist", async () => {
    await withFeatureEnabled(async () => {
      const user = await ready()
      const { error } = await board(user.client, "00000000-0000-0000-0000-0000000000ff")
      expect(error?.hint).toBe("groups.not_a_member")
    })
  })

  it("is unreachable anonymously", async () => {
    const { error } = await anonClient().rpc("fetch_group_leaderboard", {
      p_group_id: "00000000-0000-0000-0000-0000000000ff",
      p_period: "7d",
      p_timezone: "UTC"
    })
    expect(error).not.toBeNull()
  })
})

describe("fetch_group_leaderboard counting", () => {
  it("counts by discipline within the window and totals them", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      await setName(owner.userId, "Owner One")
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Counting Board"),
        p_description: ""
      })

      await addSet(owner.userId, "slalom", 0)
      await addSet(owner.userId, "slalom", 3)
      await addSet(owner.userId, "tricks", 6)
      await addSet(owner.userId, "jump", 10) // outside 7d, inside 30d

      const week = await board(owner.client, group.id, "7d")
      const row = week.data[0]
      expect(row.slalom_count).toBe(2)
      expect(row.tricks_count).toBe(1)
      expect(row.jump_count).toBe(0)
      expect(row.other_count).toBe(0)
      expect(row.total_count).toBe(3)
      expect(row.member_name).toBe("Owner One")
      expect(row.is_self).toBe(true)

      const month = await board(owner.client, group.id, "30d")
      expect(month.data[0].jump_count).toBe(1)
      expect(month.data[0].total_count).toBe(4)
    })
  })

  it("shows a member with no sets as zero rather than hiding them", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const quiet = await ready()
      await setName(quiet.userId, "Quiet Member")
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Zero Board"),
        p_description: ""
      })
      await quiet.client.rpc("join_group", { p_group_id: group.id })

      const { data } = await board(owner.client, group.id)
      const row = data.find((r: any) => r.member_name === "Quiet Member")
      expect(row.total_count).toBe(0)
      expect(row.slalom_count).toBe(0)
    })
  })

  it("ranks by total descending and breaks ties by name", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const zoe = await ready()
      const adam = await ready()
      await setName(owner.userId, "Owner")
      await setName(zoe.userId, "Zoe Tie")
      await setName(adam.userId, "Adam Tie")

      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Ranked Board"),
        p_description: ""
      })
      await zoe.client.rpc("join_group", { p_group_id: group.id })
      await adam.client.rpc("join_group", { p_group_id: group.id })

      await addSet(owner.userId, "slalom", 1)
      await addSet(owner.userId, "slalom", 1)
      await addSet(owner.userId, "slalom", 1)
      await addSet(zoe.userId, "tricks", 1)
      await addSet(adam.userId, "jump", 1)

      const { data } = await board(owner.client, group.id)
      expect(data.map((r: any) => r.member_name)).toEqual(["Owner", "Adam Tie", "Zoe Tie"])
    })
  })

  it("falls back to Skier for a blank display name", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      await setName(owner.userId, "")
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Blank Name Board"),
        p_description: ""
      })

      const { data } = await board(owner.client, group.id)
      expect(data[0].member_name).toBe("Skier")
    })
  })

  it("counts sets logged before the member joined", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const joiner = await ready()
      await setName(joiner.userId, "Late Joiner")
      await addSet(joiner.userId, "slalom", 3)

      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Backfill Board"),
        p_description: ""
      })
      await joiner.client.rpc("join_group", { p_group_id: group.id })

      const { data } = await board(owner.client, group.id)
      const row = data.find((r: any) => r.member_name === "Late Joiner")
      expect(row.total_count).toBe(1)
    })
  })
})

describe("fetch_group_leaderboard boundaries", () => {
  it("returns an opaque membership handle, never an auth user id", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Opaque Board"),
        p_description: ""
      })

      const { data } = await board(owner.client, group.id)
      expect(data[0].membership_id).not.toBe(owner.userId)
      expect(JSON.stringify(data)).not.toContain(owner.userId)
    })
  })

  it("refuses any period other than 7d or 30d, so a single day cannot be probed", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Period Board"),
        p_description: ""
      })

      for (const period of ["1d", "all", "", "365d"]) {
        const { error } = await board(owner.client, group.id, period)
        expect(error?.hint, `period=${period}`).toBe("groups.invalid_period")
      }
    })
  })

  it("refuses an unknown timezone", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("TZ Board"),
        p_description: ""
      })

      const { error } = await owner.client.rpc("fetch_group_leaderboard", {
        p_group_id: group.id,
        p_period: "7d",
        p_timezone: "Mars/Olympus"
      })
      expect(error?.hint).toBe("groups.invalid_timezone")
    })
  })

  it("hides blocked members symmetrically but never the caller", async () => {
    await withFeatureEnabled(async () => {
      const a = await ready()
      const b = await ready()
      await setName(a.userId, "Blocker A")
      await setName(b.userId, "Blocked B")
      const { data: group } = await a.client.rpc("create_group", {
        p_name: unique("Block Board"),
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
      await a.client.rpc("block_group_member", { p_membership_id: handle })

      const asA = await board(a.client, group.id)
      expect(asA.data.map((r: any) => r.member_name)).toEqual(["Blocker A"])

      const asB = await board(b.client, group.id)
      expect(asB.data.map((r: any) => r.member_name)).toEqual(["Blocked B"])
    })
  })

  it("returns the resolved window, sized by the period and repeated on every row", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const other = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("Window Board"),
        p_description: ""
      })
      await other.client.rpc("join_group", { p_group_id: group.id })

      const week = await board(owner.client, group.id, "7d", "UTC")
      const end = dateIn("UTC")
      expect(week.data).toHaveLength(2)
      for (const row of week.data) {
        expect(row.window_end).toBe(end)
        expect(row.window_start).toBe(shiftDate(end, -6))
      }

      const month = await board(owner.client, group.id, "30d", "UTC")
      expect(month.data[0].window_end).toBe(end)
      expect(month.data[0].window_start).toBe(shiftDate(end, -29))
    })
  })

  it("is STABLE, so the membership gate and the row query share one snapshot", async () => {
    const volatility = await withAdmin(async c => {
      const r = await c.query(
        `select p.provolatile from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'fetch_group_leaderboard'`
      )
      return r.rows[0]?.provolatile as string
    })
    // 's' = STABLE. A VOLATILE function resnapshots per internal statement, so a
    // concurrent leave_group could land between the gate and RETURN QUERY.
    expect(volatility).toBe("s")
  })

  it("resolves the window in the caller's timezone, not the server's", async () => {
    await withFeatureEnabled(async () => {
      const owner = await ready()
      const { data: group } = await owner.client.rpc("create_group", {
        p_name: unique("TZ Window Board"),
        p_description: ""
      })

      // A 25-hour spread guarantees these do not all share one calendar date,
      // so a function that ignored the timezone would fail at least one.
      for (const tz of ["Pacific/Kiritimati", "UTC", "Pacific/Pago_Pago"]) {
        const { data } = await board(owner.client, group.id, "7d", tz)
        const end = dateIn(tz)
        expect(data[0].window_end, tz).toBe(end)
        expect(data[0].window_start, tz).toBe(shiftDate(end, -6))
      }
    })
  })

  it("keeps working when the feature flag is off, so a kill switch does not hide data from members", async () => {
    await withFeatureDisabled(async () => {
      const owner = await ready()
      const groupId = await withAdmin(async c => {
        const r = await c.query(
          "insert into public.groups (name, created_by) values ($1, $2) returning id",
          [unique("Flagged Board"), owner.userId]
        )
        await c.query("insert into public.group_members (group_id, user_id) values ($1, $2)", [
          r.rows[0].id,
          owner.userId
        ])
        return r.rows[0].id as string
      })

      const { error } = await board(owner.client, groupId)
      expect(error).toBeNull()

      await withAdmin(c =>
        c.query("delete from public.group_members where group_id = $1", [groupId])
      )
    })
  })
})
