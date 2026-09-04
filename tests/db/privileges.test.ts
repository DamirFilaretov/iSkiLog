import { describe, it, expect } from "vitest"
import { withAdmin } from "./helpers/admin"
import { createTestUser } from "./helpers/users"

const GROUPS_TABLES = ["groups", "group_members"]
const PRIVILEGES = ["select", "insert", "update", "delete"]

describe("table privileges", () => {
  it("grants nothing to anon or authenticated on any Groups table", async () => {
    const granted = await withAdmin(async c => {
      const found: string[] = []
      for (const table of GROUPS_TABLES) {
        for (const role of ["anon", "authenticated"]) {
          for (const privilege of PRIVILEGES) {
            const r = await c.query("select has_table_privilege($1, $2, $3) as ok", [
              role,
              `public.${table}`,
              privilege
            ])
            if (r.rows[0].ok) found.push(`${role}:${table}:${privilege}`)
          }
        }
      }
      return found
    })
    expect(granted).toEqual([])
  })

  it("enables row level security on every Groups table", async () => {
    const withoutRls = await withAdmin(async c => {
      const r = await c.query(
        `select relname from pg_class
          where relname = any($1) and relnamespace = 'public'::regnamespace
            and relrowsecurity = false`,
        [GROUPS_TABLES]
      )
      return r.rows.map(row => row.relname)
    })
    expect(withoutRls).toEqual([])
  })

  it("blocks a real signed-in client from reading groups through the API", async () => {
    const user = await createTestUser()
    const { data, error } = await user.client.from("groups").select("id").limit(1)
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it("blocks a real signed-in client from inserting a group through the API", async () => {
    const user = await createTestUser()
    const { error } = await user.client.from("groups").insert({ name: "Sneaky Club" })
    expect(error).not.toBeNull()
  })

  it("blocks a real signed-in client from reading group_members through the API", async () => {
    const user = await createTestUser()
    const { error } = await user.client.from("group_members").select("user_id").limit(1)
    expect(error).not.toBeNull()
  })
})
