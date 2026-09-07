import { describe, expect, it } from "vitest"
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_NAME_MIN,
  canonicalGroupName,
  checkGroupDescription,
  checkGroupName,
  normaliseGroupDescription,
  normaliseGroupName
} from "./groupName"
import { SERVER_NON_WHITESPACE_CHARS, SERVER_WHITESPACE_CHARS } from "./groupWhitespace"

describe("normaliseGroupName", () => {
  it("trims and collapses runs of whitespace like the server does", () => {
    expect(normaliseGroupName("  Ski   Club  ")).toBe("Ski Club")
  })

  it("collapses newlines and tabs, not only spaces", () => {
    expect(normaliseGroupName("Ski\n\tClub")).toBe("Ski Club")
  })

  it("treats a null-ish name as empty", () => {
    expect(normaliseGroupName("")).toBe("")
  })
})

describe("canonicalGroupName", () => {
  it("collides the three EC-1 spellings of one name", () => {
    expect(canonicalGroupName("Ski Club")).toBe("ski club")
    expect(canonicalGroupName("ski club")).toBe("ski club")
    expect(canonicalGroupName(" Ski  Club ")).toBe("ski club")
  })
})

describe("checkGroupName", () => {
  it("accepts a name inside the bounds", () => {
    expect(checkGroupName("Ski Club")).toBeNull()
  })

  it("accepts a name that only reaches the minimum after trimming", () => {
    expect(checkGroupName("   ab   ")).toBeNull()
  })

  it("rejects an empty name", () => {
    expect(checkGroupName("")).not.toBeNull()
  })

  it("rejects a name below the minimum length", () => {
    expect(checkGroupName("a")).not.toBeNull()
  })

  it("accepts a name at the maximum length", () => {
    expect(checkGroupName("a".repeat(GROUP_NAME_MAX))).toBeNull()
  })

  it("rejects a name one character over the maximum", () => {
    expect(checkGroupName("a".repeat(GROUP_NAME_MAX + 1))).not.toBeNull()
  })

  it("counts the collapsed form, not the raw input", () => {
    expect(checkGroupName("a".repeat(GROUP_NAME_MAX) + "     ")).toBeNull()
  })

  it("exposes the bounds it enforces", () => {
    expect(GROUP_NAME_MIN).toBe(2)
    expect(GROUP_NAME_MAX).toBe(40)
  })
})

describe("checkGroupDescription", () => {
  it("accepts an empty description", () => {
    expect(checkGroupDescription("")).toBeNull()
  })

  it("accepts a description at the maximum length", () => {
    expect(checkGroupDescription("a".repeat(GROUP_DESCRIPTION_MAX))).toBeNull()
  })

  it("rejects a description one character over the maximum", () => {
    expect(checkGroupDescription("a".repeat(GROUP_DESCRIPTION_MAX + 1))).not.toBeNull()
  })

  it("exposes the bound it enforces", () => {
    expect(GROUP_DESCRIPTION_MAX).toBe(200)
  })
})

describe("normaliseGroupDescription", () => {
  it("trims and collapses whitespace like the server does", () => {
    expect(normaliseGroupDescription("  a   friendly \n club ")).toBe("a friendly club")
  })
})

/**
 * The shared Unicode corpus (spec §12). These two lists are the measured
 * behaviour of the database's `canonical_group_name`; `tests/db/groupNameMirror.test.ts`
 * re-measures them against a real server so a drift breaks a test, not the
 * create flow.
 */
describe("server whitespace mirror", () => {
  it("collapses every character the server collapses", () => {
    for (const ch of SERVER_WHITESPACE_CHARS) {
      expect(normaliseGroupName(`A${ch}B`)).toBe("A B")
    }
  })

  it("preserves every look-alike character the server preserves", () => {
    for (const ch of SERVER_NON_WHITESPACE_CHARS) {
      expect(normaliseGroupName(`A${ch}B`)).toBe(`A${ch}B`)
    }
  })

  it("trims every character the server trims", () => {
    for (const ch of SERVER_WHITESPACE_CHARS) {
      expect(normaliseGroupName(`${ch}Ski Club${ch}`)).toBe("Ski Club")
    }
  })

  it("canonicalises a typed name to the same value as the name the server stored", () => {
    // Reconciliation after a lost create response compares these two. The
    // server stores "A B" for every one of these inputs.
    for (const ch of SERVER_WHITESPACE_CHARS) {
      expect(canonicalGroupName(`A${ch}B`)).toBe(canonicalGroupName("A B"))
    }
  })

  it("keeps names the server keeps apart, apart", () => {
    // U+FEFF is whitespace to JavaScript but not to the server, so the server
    // can hold both of these as distinct groups. Folding them together would
    // reconcile onto a group the user never created.
    for (const ch of SERVER_NON_WHITESPACE_CHARS) {
      expect(canonicalGroupName(`A${ch}B`)).not.toBe(canonicalGroupName("A B"))
    }
  })

  it("measures the name length the way the server will", () => {
    // Two characters after collapsing, so the server accepts it at the minimum.
    expect(checkGroupName("A\u0085B")).toBeNull()
  })
})

describe("counting characters the way the server counts them", () => {
  // The server checks char_length(), which counts code points. JavaScript's
  // .length counts UTF-16 code units, so an emoji counts twice. Counting in
  // code units makes the client reject names the server would accept, and the
  // client is only allowed to be more permissive than the server, never less.
  it("accepts an emoji name that is inside the server's limit", () => {
    expect(checkGroupName("🎿".repeat(GROUP_NAME_MAX / 2 + 1))).toBeNull()
  })

  it("accepts an emoji name at exactly the server's limit", () => {
    expect(checkGroupName("🎿".repeat(GROUP_NAME_MAX))).toBeNull()
  })

  it("rejects an emoji name one code point over the limit", () => {
    expect(checkGroupName("🎿".repeat(GROUP_NAME_MAX + 1))).not.toBeNull()
  })

  it("accepts a two-emoji name, which reaches the minimum", () => {
    expect(checkGroupName("🎿🎿")).toBeNull()
  })

  it("accepts an emoji description inside the server's limit", () => {
    expect(checkGroupDescription("🎿".repeat(GROUP_DESCRIPTION_MAX))).toBeNull()
  })

  it("rejects an emoji description one code point over the limit", () => {
    expect(checkGroupDescription("🎿".repeat(GROUP_DESCRIPTION_MAX + 1))).not.toBeNull()
  })
})
