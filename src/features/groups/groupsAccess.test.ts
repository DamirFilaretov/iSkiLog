import { describe, it, expect } from "vitest"
import { groupsAccess, showsGroupsTab, showsGroupsTabNow } from "./groupsAccess"

describe("groupsAccess", () => {
  it("waits while the server has not answered", () => {
    expect(
      groupsAccess({ loading: true, enabled: false, failed: false, hasMemberships: false })
    ).toBe("loading")
  })

  it("opens everything when the feature is on", () => {
    expect(
      groupsAccess({ loading: false, enabled: true, failed: false, hasMemberships: false })
    ).toBe("full")
  })

  it("hides the feature entirely from someone in no groups when it is off", () => {
    expect(
      groupsAccess({ loading: false, enabled: false, failed: false, hasMemberships: false })
    ).toBe("unavailable")
  })

  it("keeps a member's own groups reachable when the kill switch is off", () => {
    // create_group and join_group are the only RPCs that consult the flag.
    // leave_group, list_my_groups and the board deliberately keep working, so
    // flipping the switch must not strand somebody inside a group.
    expect(
      groupsAccess({ loading: false, enabled: false, failed: false, hasMemberships: true })
    ).toBe("wind_down")
  })

  it("does not fail closed when the status call itself failed", () => {
    // Treating an unreachable server as "disabled" would redirect away the one
    // screen still offering a retry.
    expect(
      groupsAccess({ loading: false, enabled: false, failed: true, hasMemberships: false })
    ).toBe("unknown")
  })

  it("prefers a successful enabled answer over a stale failure flag", () => {
    expect(
      groupsAccess({ loading: false, enabled: true, failed: true, hasMemberships: false })
    ).toBe("full")
  })
})

describe("showsGroupsTab", () => {
  it("shows the tab when the feature is on", () => {
    expect(showsGroupsTab("full")).toBe(true)
  })

  it("keeps the tab so a member can still navigate to Leave", () => {
    expect(showsGroupsTab("wind_down")).toBe(true)
  })

  it("hides the tab through rollout, so shipping ahead of the flag is invisible", () => {
    expect(showsGroupsTab("unavailable")).toBe(false)
    expect(showsGroupsTab("loading")).toBe(false)
  })

  it("hides the tab when status is unknown, leaving recovery to the direct route", () => {
    expect(showsGroupsTab("unknown")).toBe(false)
  })
})

describe("showsGroupsTabNow", () => {
  it("shows the tab on a first launch, before the status check has answered", () => {
    // No cached answer (fresh install, or a new login after sign-out cleared it).
    // The tab must not render three-then-four.
    expect(showsGroupsTabNow("loading", null)).toBe(true)
  })

  it("keeps showing the tab while re-checking if it was reachable last launch", () => {
    expect(showsGroupsTabNow("loading", "full")).toBe(true)
    expect(showsGroupsTabNow("loading", "wind_down")).toBe(true)
  })

  it("stays hidden while loading only when we know the feature is unavailable", () => {
    expect(showsGroupsTabNow("loading", "unavailable")).toBe(false)
  })

  it("defers to the exact rule once the real answer lands", () => {
    expect(showsGroupsTabNow("full", null)).toBe(true)
    expect(showsGroupsTabNow("wind_down", null)).toBe(true)
    expect(showsGroupsTabNow("unavailable", "full")).toBe(false)
    expect(showsGroupsTabNow("unknown", "full")).toBe(false)
  })
})
