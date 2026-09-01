import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser, anonClient } from "./helpers/users"

describe("db test harness", () => {
  it("connects as admin and sees an existing table", async () => {
    const ok = await withAdmin(async c => {
      const r = await c.query("select to_regclass('public.sets') is not null as ok")
      return r.rows[0].ok
    })
    expect(ok).toBe(true)
  })

  it("creates a signed-in user client", async () => {
    const user = await createTestUser()
    expect(user.userId).toMatch(/^[0-9a-f-]{36}$/)

    const { data } = await user.client.auth.getUser()
    expect(data.user?.id).toBe(user.userId)
  })

  it("provides an anonymous client with no session", async () => {
    const { data } = await anonClient().auth.getUser()
    expect(data.user).toBeNull()
  })
})
