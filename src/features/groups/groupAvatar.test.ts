import { describe, expect, it } from "vitest"
import { GROUP_AVATAR_COLORS, groupAvatarColor, groupInitials } from "./groupAvatar"

describe("groupInitials", () => {
  it("takes one initial from a single-word name", () => {
    expect(groupInitials("Waterskiers")).toBe("W")
  })

  it("takes the first and last initials from a multi-word name", () => {
    expect(groupInitials("Ski Club")).toBe("SC")
  })

  it("ignores middle words", () => {
    expect(groupInitials("Lake Placid Ski Team")).toBe("LT")
  })

  it("ignores surrounding and repeated whitespace", () => {
    expect(groupInitials("  ski   club  ")).toBe("SC")
  })

  it("falls back to a placeholder for a blank name", () => {
    expect(groupInitials("   ")).toBe("?")
  })

  it("keeps a non-letter first character rather than dropping it", () => {
    expect(groupInitials("3 Buoy Club")).toBe("3C")
  })
})

describe("groupAvatarColor", () => {
  it("returns a colour from the palette", () => {
    expect(GROUP_AVATAR_COLORS).toContain(groupAvatarColor("Ski Club"))
  })

  it("gives the same name the same colour every time", () => {
    expect(groupAvatarColor("Ski Club")).toBe(groupAvatarColor("Ski Club"))
  })

  it("gives every spelling of one name the same colour, so all viewers agree", () => {
    expect(groupAvatarColor(" Ski  Club ")).toBe(groupAvatarColor("ski club"))
  })

  it("spreads different names across more than one colour", () => {
    const names = [
      "Ski Club",
      "Lake Placid",
      "Waterskiers",
      "Slalom Squad",
      "Jump Crew",
      "Trick Team",
      "Big Dawg",
      "Nautique Nation"
    ]
    const used = new Set(names.map(groupAvatarColor))
    expect(used.size).toBeGreaterThan(1)
  })

  it("still returns a colour for a blank name", () => {
    expect(GROUP_AVATAR_COLORS).toContain(groupAvatarColor(""))
  })
})

describe("groupInitials with Unicode names", () => {
  it("keeps a flag emoji whole instead of splitting it into regional indicators", () => {
    expect(groupInitials("🇺🇸 Ski")).toBe("🇺🇸S")
  })

  it("keeps a ZWJ emoji sequence whole", () => {
    expect(groupInitials("👨‍👩‍👦 Family Club")).toBe("👨‍👩‍👦C")
  })

  it("does not let uppercasing expand one character into two", () => {
    expect(groupInitials("ßki Club")).toBe("SC")
  })

  it("never returns more than two displayed characters", () => {
    const names = [
      "ßki Club",
      "🇺🇸 Ski",
      "👨‍👩‍👦 Family Club",
      "ﬄ Club",
      "ǆena Ǆub",
      "Ski Club"
    ]
    for (const name of names) {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
      const graphemes = [...segmenter.segment(groupInitials(name))]
      expect(graphemes.length).toBeLessThanOrEqual(2)
    }
  })
})
