import { describe, it, expect } from "vitest"
import { groupsAccess, showsGroupsTab } from "./groupsAccess"

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
