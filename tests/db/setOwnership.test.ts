import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

/**
 * update_set_with_subtype is SECURITY DEFINER and writes set_notes / subtype
 * rows keyed only by p_set_id. Without an ownership guard, the scoped UPDATE on
 * public.sets simply hits zero rows and execution falls through — letting any
 * authenticated caller clobber another user's set. 20260903164850 restores the
 * `if not found then raise` guard that schema.sql always carried.
 */
describe("update_set_with_subtype ownership guard", () => {
  it("refuses a set the caller does not own and leaves it intact", async () => {
    const owner = await createTestUser()
    const attacker = await createTestUser()

    const { data: setId, error: createErr } = await owner.client.rpc("create_set_with_subtype", {
      p_season_id: null,
      p_is_favorite: false,
      p_event_type: "slalom",
      p_date: "2026-03-01",
      p_notes: { summary: "owner private summary" },
      p_buoys: 3,
      p_rope_length: "13m",
      p_speed: 55,
      p_passes_count: 2
    })
    expect(createErr).toBeNull()
    expect(setId).toBeTruthy()

    const { error: attackErr } = await attacker.client.rpc("update_set_with_subtype", {
      p_set_id: setId,
      p_season_id: null,
      p_is_favorite: true,
      p_event_type: "tricks",
      p_date: "2026-03-01",
      p_notes: { summary: "HACKED" },
      p_event_changed: true
    })
    expect(attackErr).not.toBeNull()
    expect(attackErr?.code).toBe("42501")

    const state = await withAdmin(async c => {
      const r = await c.query(
        `select sn.summary,
                exists(select 1 from public.slalom_sets s where s.set_id = $1) as has_slalom,
                exists(select 1 from public.tricks_sets t where t.set_id = $1) as has_tricks,
                s.event_type::text as event_type
           from public.sets s
           join public.set_notes sn on sn.set_id = s.id
          where s.id = $1`,
        [setId]
      )
      return r.rows[0]
    })
    expect(state.summary).toBe("owner private summary")
    expect(state.event_type).toBe("slalom")
    expect(state.has_slalom).toBe(true)
    expect(state.has_tricks).toBe(false)
  })

  it("still lets the owner update their own set", async () => {
    const owner = await createTestUser()

    const { data: setId } = await owner.client.rpc("create_set_with_subtype", {
      p_season_id: null,
      p_is_favorite: false,
      p_event_type: "slalom",
      p_date: "2026-03-01",
      p_notes: { summary: "before" },
      p_buoys: 1,
      p_rope_length: "18m",
      p_speed: 52,
      p_passes_count: 1
    })

    const { error } = await owner.client.rpc("update_set_with_subtype", {
      p_set_id: setId,
      p_season_id: null,
      p_is_favorite: true,
      p_event_type: "slalom",
      p_date: "2026-03-02",
      p_notes: { summary: "after" },
      p_buoys: 2,
      p_rope_length: "16m",
      p_speed: 55,
      p_passes_count: 2
    })
    expect(error).toBeNull()

    const summary = await withAdmin(async c => {
      const r = await c.query("select summary from public.set_notes where set_id = $1", [setId])
      return r.rows[0].summary
    })
    expect(summary).toBe("after")
  })
})
