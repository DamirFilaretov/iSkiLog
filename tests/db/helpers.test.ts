import { describe, it, expect } from "vitest"
import { withAdmin, openAdmin } from "./helpers/admin"

async function canonical(input: string | null): Promise<string> {
  return withAdmin(async c => {
    const r = await c.query("select public.canonical_group_name($1) as v", [input])
    return r.rows[0].v
  })
}

describe("canonical_group_name", () => {
  it("lowercases, trims and collapses internal whitespace", async () => {
    expect(await canonical("  Ski   Club  ")).toBe("ski club")
    expect(await canonical("SKI\tCLUB")).toBe("ski club")
    expect(await canonical("Ski Club")).toBe("ski club")
  })

  it("maps null to the empty string rather than null", async () => {
    expect(await canonical(null)).toBe("")
  })

  it("is immutable, which is what lets it back a unique index", async () => {
    const volatility = await withAdmin(async c => {
      const r = await c.query(
        `select p.provolatile from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'canonical_group_name'`
      )
      return r.rows[0]?.provolatile
    })
    expect(volatility).toBe("i")
  })

  it("runs as invoker, not definer — it reads nothing", async () => {
    const isDefiner = await withAdmin(async c => {
      const r = await c.query(
        `select p.prosecdef from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'canonical_group_name'`
      )
      return r.rows[0]?.prosecdef
    })
    expect(isDefiner).toBe(false)
  })
})

describe("lock_group / lock_creator", () => {
  it("serialises two transactions contending for the same group", async () => {
    const id = "00000000-0000-0000-0000-0000000000aa"
    const first = await openAdmin()
    const second = await openAdmin()
    const order: string[] = []

    try {
      await first.query("begin")
      await first.query("select public.lock_group($1)", [id])

      const blocked = (async () => {
        await second.query("begin")
        await second.query("select public.lock_group($1)", [id])
        order.push("second-acquired")
        await second.query("rollback")
      })()

      // Give the second connection time to block on the lock.
      await new Promise(resolve => setTimeout(resolve, 300))
      order.push("first-releasing")
      await first.query("rollback")
      await blocked
    } finally {
      await first.end()
      await second.end()
    }

    expect(order).toEqual(["first-releasing", "second-acquired"])
  })

  it("uses a separate namespace from lock_creator, so they never collide", async () => {
    const shared = "00000000-0000-0000-0000-0000000000bb"
    const first = await openAdmin()
    const second = await openAdmin()

    try {
      await first.query("begin")
      await first.query("select public.lock_group($1)", [shared])

      await second.query("begin")
      // Must not block: same key, different namespace.
      await second.query("select public.lock_creator($1)", [shared])
      const r = await second.query("select 1 as ok")
      expect(r.rows[0].ok).toBe(1)

      await second.query("rollback")
      await first.query("rollback")
    } finally {
      await first.end()
      await second.end()
    }
  })
})
