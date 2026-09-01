import { describe, expect, it } from "vitest"
import {
  DEFAULT_GROUP_PERIOD,
  GROUP_PERIODS,
  groupPeriodLabel,
  isGroupPeriod
} from "./groupPeriod"

describe("groupPeriod", () => {
  it("offers exactly the two periods the server accepts, seven days first", () => {
    expect(GROUP_PERIODS).toEqual(["7d", "30d"])
  })

  it("defaults to the seven day period", () => {
    expect(DEFAULT_GROUP_PERIOD).toBe("7d")
  })

  it("labels the seven day period", () => {
    expect(groupPeriodLabel("7d")).toBe("Last 7 days")
  })

  it("labels the thirty day period", () => {
    expect(groupPeriodLabel("30d")).toBe("Last 30 days")
  })

  it("accepts the two server periods as periods", () => {
    expect(isGroupPeriod("7d")).toBe(true)
    expect(isGroupPeriod("30d")).toBe(true)
  })

  it("rejects anything the server would refuse with groups.invalid_period", () => {
    expect(isGroupPeriod("all")).toBe(false)
    expect(isGroupPeriod("7D")).toBe(false)
    expect(isGroupPeriod("")).toBe(false)
    expect(isGroupPeriod(null)).toBe(false)
    expect(isGroupPeriod(7)).toBe(false)
  })
})
