import { describe, expect, it } from "vitest"
import { withAdmin } from "./helpers/admin"
import {
  SERVER_NON_WHITESPACE_CHARS,
  SERVER_WHITESPACE_CHARS
} from "../../src/features/groups/groupWhitespace"
import { canonicalGroupName } from "../../src/features/groups/groupName"

/**
 * The client mirrors the server's whitespace rules so that reconciliation after
 * a lost create response (D18, EC-26) can tell "the group I just made" from
 * "someone else's group". A mirror that is only asserted against itself is not
 * a mirror, so this measures the real database.
 *
 * JavaScript's `\s` is wrong in both directions here: it misses U+001C-U+001F
 * and U+0085, which the server collapses, and it includes U+FEFF, which the
 * server keeps.
 */
describe("client group-name rules mirror the database", () => {
  it("agrees with canonical_group_name on every character in the corpus", async () => {
    const corpus = [...SERVER_WHITESPACE_CHARS, ...SERVER_NON_WHITESPACE_CHARS]

    const disagreements = await withAdmin(async client => {
      const found: string[] = []
      for (const ch of corpus) {
        const input = `A${ch}B`
        const { rows } = await client.query("select public.canonical_group_name($1) as v", [input])
        const server = rows[0].v as string
        const clientValue = canonicalGroupName(input)
        if (server !== clientValue) {
          const cp = "U+" + (ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")
          found.push(`${cp}: server ${JSON.stringify(server)} vs client ${JSON.stringify(clientValue)}`)
        }
      }
      return found
    })

    expect(disagreements).toEqual([])
  })

  it("classifies every corpus character the way the corpus lists claim", async () => {
    const misfiled = await withAdmin(async client => {
      const found: string[] = []
      const check = async (ch: string, expectedCollapse: boolean) => {
        const { rows } = await client.query("select public.canonical_group_name($1) as v", [`A${ch}B`])
        const collapsed = rows[0].v === "a b"
        if (collapsed !== expectedCollapse) {
          const cp = "U+" + (ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")
          found.push(`${cp} collapse=${collapsed}, corpus says ${expectedCollapse}`)
        }
      }
      for (const ch of SERVER_WHITESPACE_CHARS) await check(ch, true)
      for (const ch of SERVER_NON_WHITESPACE_CHARS) await check(ch, false)
      return found
    })

    expect(misfiled).toEqual([])
  })
})
