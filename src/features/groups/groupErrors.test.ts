import { describe, expect, it } from "vitest"
import { toGroupError } from "./groupErrors"

function pgError(hint: string | null, message = "boom") {
  return { message, code: "22023", details: null, hint }
}

describe("toGroupError", () => {
  it("maps the kill switch so entry points can be hidden", () => {
    const result = toGroupError(pgError("groups.disabled"))
    expect(result.kind).toBe("disabled")
    expect(result.message).toBe("Groups isn't available right now.")
  })

  it("maps an unaccepted policy so the consent screen can open", () => {
    expect(toGroupError(pgError("groups.consent_required")).kind).toBe("consent_required")
  })

  it("maps a non-member to the join prompt copy", () => {
    const result = toGroupError(pgError("groups.not_a_member"))
    expect(result.kind).toBe("not_a_member")
    expect(result.message).toBe("Join this group to see its leaderboard.")
  })

  it("maps a taken name so the caller can try to reconcile first", () => {
    const result = toGroupError(pgError("groups.name_taken"))
    expect(result.kind).toBe("name_taken")
    expect(result.message).toBe("That name is already taken.")
  })

  it("surfaces the server's name message verbatim on the name field", () => {
    const result = toGroupError(pgError("groups.invalid_name", "group name must be 2-40 characters"))
    expect(result.kind).toBe("invalid_name")
    expect(result.field).toBe("name")
    expect(result.message).toBe("group name must be 2-40 characters")
  })

  it("surfaces the server's description message verbatim on the description field", () => {
    const result = toGroupError(
      pgError("groups.invalid_description", "description must be 200 characters or fewer")
    )
    expect(result.kind).toBe("invalid_description")
    expect(result.field).toBe("description")
    expect(result.message).toBe("description must be 200 characters or fewer")
  })

  it("falls back to its own copy when the server sends no message", () => {
    const result = toGroupError(pgError("groups.invalid_name", ""))
    expect(result.message).not.toBe("")
  })

  it("maps a denylisted name to the name field", () => {
    const result = toGroupError(pgError("groups.name_rejected"))
    expect(result.kind).toBe("name_rejected")
    expect(result.field).toBe("name")
    expect(result.message).toBe("That name isn't allowed.")
  })

  it("maps a denylisted description to the description field", () => {
    const result = toGroupError(pgError("groups.description_rejected"))
    expect(result.kind).toBe("description_rejected")
    expect(result.field).toBe("description")
    expect(result.message).toBe("That description isn't allowed.")
  })

  it("names the ten group limit in the quota message", () => {
    const result = toGroupError(pgError("groups.quota_exceeded"))
    expect(result.kind).toBe("quota_exceeded")
    expect(result.message).toContain("10")
  })

  it("maps the hourly limit to try-again copy", () => {
    const result = toGroupError(pgError("groups.rate_limited"))
    expect(result.kind).toBe("rate_limited")
    expect(result.message).toBe("You've created several groups recently. Try again later.")
  })

  it("asks for a refetch when the group is gone", () => {
    const result = toGroupError(pgError("groups.not_found"))
    expect(result.kind).toBe("not_found")
    expect(result.message).toBe("This group no longer exists.")
    expect(result.refetch).toBe(true)
  })

  it("asks for a refetch when a handle is stale", () => {
    const result = toGroupError(pgError("groups.invalid_handle"))
    expect(result.kind).toBe("invalid_handle")
    expect(result.refetch).toBe(true)
  })

  it("maps a rejected period, which only a client bug can produce", () => {
    expect(toGroupError(pgError("groups.invalid_period")).kind).toBe("invalid_period")
  })

  it("maps a rejected timezone, which only a client bug can produce", () => {
    expect(toGroupError(pgError("groups.invalid_timezone")).kind).toBe("invalid_timezone")
  })

  it("maps an unauthenticated call so the auth gate can take over", () => {
    expect(toGroupError(pgError("groups.unauthenticated")).kind).toBe("unauthenticated")
  })

  it("treats a hint it does not know as unexpected", () => {
    const result = toGroupError(pgError("groups.invented_later"))
    expect(result.kind).toBe("unknown")
    expect(result.message).toBe("Couldn't reach the server.")
  })

  it("treats a missing hint as a network failure", () => {
    const result = toGroupError(pgError(null, "TypeError: Failed to fetch"))
    expect(result.kind).toBe("unknown")
    expect(result.message).toBe("Couldn't reach the server.")
  })

  it("treats a plain thrown error as a network failure", () => {
    const result = toGroupError(new Error("network down"))
    expect(result.kind).toBe("unknown")
    expect(result.message).toBe("Couldn't reach the server.")
  })

  it("never asks the caller to refetch on an ordinary network failure", () => {
    expect(toGroupError(new Error("network down")).refetch).toBe(false)
  })

  it("branches on the hint, not the SQLSTATE", () => {
    const shared = { message: "boom", code: "42501", details: null }
    expect(toGroupError({ ...shared, hint: "groups.consent_required" }).kind).toBe(
      "consent_required"
    )
    expect(toGroupError({ ...shared, hint: "groups.not_a_member" }).kind).toBe("not_a_member")
    expect(toGroupError({ ...shared, hint: "groups.invalid_handle" }).kind).toBe("invalid_handle")
  })

  it("carries no field for errors that are not about a form field", () => {
    expect(toGroupError(pgError("groups.disabled")).field).toBeNull()
  })
})
