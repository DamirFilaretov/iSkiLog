import { describe, it, expect } from "vitest"
import type { Group } from "../../types/groups"
import { buildDirectory, directoryCardTap, reconcileNameTaken } from "./groupDirectory"

function group(partial: Partial<Group> & { id: string; name: string }): Group {
  return {
    description: "",
    logoKey: null,
    memberCount: 1,
    isMember: false,
    isPrivate: false,
    joinCode: null,
    ...partial
  }
}

describe("buildDirectory", () => {
  it("splits memberships out of the browse list", () => {
    const mine = [group({ id: "a", name: "Alpha", isMember: true })]
    const browse = [
      group({ id: "a", name: "Alpha", isMember: true }),
      group({ id: "b", name: "Beta" })
    ]

    const view = buildDirectory({ mine, browse, searchResults: null, query: "" })
    expect(view.mine.map(g => g.id)).toEqual(["a"])
    expect(view.discover.map(g => g.id)).toEqual(["b"])
  })

  it("keeps a membership that browse never returned", () => {
    const mine = [group({ id: "hidden", name: "Hidden", isMember: true })]
    const view = buildDirectory({ mine, browse: [], searchResults: null, query: "" })
    expect(view.mine.map(g => g.id)).toEqual(["hidden"])
  })

  it("orders by member count descending, then canonical name ascending", () => {
    const browse = [
      group({ id: "c", name: "zeta", memberCount: 2 }),
      group({ id: "a", name: "Alpha", memberCount: 9 }),
      group({ id: "b", name: "Beta", memberCount: 2 })
    ]

    const view = buildDirectory({ mine: [], browse, searchResults: null, query: "" })
    expect(view.discover.map(g => g.id)).toEqual(["a", "b", "c"])
  })

  it("breaks an equal-member-count tie the way the database's en_US collation does", () => {
    // Postgres (en_US.UTF-8) orders these alpha, älpha, ångstrom, zulu.
    // A UTF-16 code-unit comparison would sort the accented names after "zulu".
    const browse = [
      group({ id: "z", name: "Zulu", memberCount: 3 }),
      group({ id: "ang", name: "Ångstrom", memberCount: 3 }),
      group({ id: "al", name: "Alpha", memberCount: 3 }),
      group({ id: "ae", name: "Älpha", memberCount: 3 })
    ]

    const view = buildDirectory({ mine: [], browse, searchResults: null, query: "" })
    expect(view.discover.map(g => g.id)).toEqual(["al", "ae", "ang", "z"])
  })

  it("filters locally on the canonical name, ignoring case and extra whitespace", () => {
    const browse = [
      group({ id: "a", name: "Ski  Club Malmö" }),
      group({ id: "b", name: "Jump Crew" })
    ]

    const view = buildDirectory({
      mine: [],
      browse,
      searchResults: null,
      query: "  SKI CLUB  "
    })
    expect(view.discover.map(g => g.id)).toEqual(["a"])
  })

  it("matches on a fragment, not only a prefix", () => {
    const browse = [group({ id: "a", name: "Malmo Ski Club" })]
    const view = buildDirectory({ mine: [], browse, searchResults: null, query: "ski" })
    expect(view.discover.map(g => g.id)).toEqual(["a"])
  })

  it("does not match on the description, matching what the server searches", () => {
    const browse = [group({ id: "a", name: "Jump Crew", description: "a ski club" })]
    const view = buildDirectory({ mine: [], browse, searchResults: null, query: "ski" })
    expect(view.discover).toEqual([])
  })

  it("adds server results the browse cap had hidden", () => {
    const browse = [group({ id: "a", name: "Ski Club Alpha" })]
    const searchResults = [group({ id: "z", name: "Ski Club Zeta" })]

    const view = buildDirectory({ mine: [], browse, searchResults, query: "ski club" })
    expect(view.discover.map(g => g.id)).toEqual(["a", "z"])
  })

  it("does not duplicate a group that browse and search both returned", () => {
    const row = group({ id: "a", name: "Ski Club" })
    const view = buildDirectory({
      mine: [],
      browse: [row],
      searchResults: [row],
      query: "ski"
    })
    expect(view.discover.map(g => g.id)).toEqual(["a"])
  })

  it("keeps a matching membership in the mine section while searching", () => {
    const mine = [group({ id: "a", name: "Ski Club", isMember: true })]
    const searchResults = [
      group({ id: "a", name: "Ski Club", isMember: true }),
      group({ id: "b", name: "Ski Team", isMember: false })
    ]

    const view = buildDirectory({ mine, browse: [], searchResults, query: "ski" })
    expect(view.mine.map(g => g.id)).toEqual(["a"])
    expect(view.discover.map(g => g.id)).toEqual(["b"])
  })

  it("drops a membership that does not match the query", () => {
    const mine = [group({ id: "a", name: "Jump Crew", isMember: true })]
    const view = buildDirectory({ mine, browse: [], searchResults: [], query: "ski" })
    expect(view.mine).toEqual([])
  })

  it("prefers the freshest row when the same group arrives twice", () => {
    const stale = group({ id: "a", name: "Ski Club", memberCount: 1, isMember: false })
    const fresh = group({ id: "a", name: "Ski Club", memberCount: 4, isMember: true })

    const view = buildDirectory({ mine: [fresh], browse: [stale], searchResults: null, query: "" })
    expect(view.mine[0].memberCount).toBe(4)
    expect(view.discover).toEqual([])
  })

  it("reports an empty directory distinctly from an empty search", () => {
    const empty = buildDirectory({ mine: [], browse: [], searchResults: null, query: "" })
    expect(empty.isSearching).toBe(false)

    const searched = buildDirectory({ mine: [], browse: [], searchResults: [], query: "ski" })
    expect(searched.isSearching).toBe(true)
  })

  it("treats a whitespace-only query as no query at all", () => {
    const browse = [group({ id: "a", name: "Jump Crew" })]
    const view = buildDirectory({ mine: [], browse, searchResults: null, query: "   " })
    expect(view.isSearching).toBe(false)
    expect(view.discover.map(g => g.id)).toEqual(["a"])
  })
})

describe("reconcileNameTaken", () => {
  it("opens the group when the caller is already a member of it", () => {
    const known = [group({ id: "a", name: "Ski Club", isMember: true })]
    expect(reconcileNameTaken("  ski   club ", known)).toEqual({
      action: "open_group",
      group: known[0]
    })
  })

  it("offers to join when the name belongs to a group the caller is not in", () => {
    const known = [group({ id: "a", name: "Ski Club", isMember: false })]
    expect(reconcileNameTaken("Ski Club", known)).toEqual({
      action: "open_join",
      group: known[0]
    })
  })

  it("does not reconcile on having created a group the caller has since left", () => {
    // There are no owners (D4): a creator who left cannot read the board.
    const known = [group({ id: "a", name: "Ski Club", isMember: false })]
    expect(reconcileNameTaken("Ski Club", known).action).toBe("open_join")
  })

  it("falls back to the plain error when no known group carries that name", () => {
    const known = [group({ id: "a", name: "Jump Crew", isMember: true })]
    expect(reconcileNameTaken("Ski Club", known)).toEqual({ action: "show_error" })
  })

  it("matches only on an exact canonical name, never a fragment", () => {
    const known = [group({ id: "a", name: "Ski Club Malmo", isMember: true })]
    expect(reconcileNameTaken("Ski Club", known)).toEqual({ action: "show_error" })
  })

  it("prefers a membership over a same-named row that says otherwise", () => {
    const known = [
      group({ id: "a", name: "Ski Club", isMember: false }),
      group({ id: "a", name: "Ski Club", isMember: true })
    ]
    expect(reconcileNameTaken("Ski Club", known).action).toBe("open_group")
  })
})

describe("directoryCardTap", () => {
  it("opens the board for a group the caller is already in", () => {
    expect(directoryCardTap(group({ id: "a", name: "Ski Club", isMember: true }))).toBe("open_board")
  })

  it("opens the board for a private group the caller is in, not the code prompt", () => {
    const g = group({ id: "a", name: "Ski Club", isMember: true, isPrivate: true })
    expect(directoryCardTap(g)).toBe("open_board")
  })

  it("opens the join modal for a public group the caller is not in", () => {
    expect(directoryCardTap(group({ id: "a", name: "Ski Club" }))).toBe("join_public")
  })

  it("opens the code prompt for a private group the caller is not in", () => {
    expect(directoryCardTap(group({ id: "a", name: "Ski Club", isPrivate: true }))).toBe(
      "join_private"
    )
  })
})
