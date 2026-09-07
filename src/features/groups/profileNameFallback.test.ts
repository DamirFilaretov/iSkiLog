import { describe, expect, it } from "vitest"
import { isDenylistedNameError } from "./profileNameFallback"

describe("isDenylistedNameError", () => {
  it("recognises the profile trigger's rejection", () => {
    expect(
      isDenylistedNameError({
        message: "display name is not allowed",
        code: "22023",
        details: null,
        hint: "groups.name_rejected"
      })
    ).toBe(true)
  })

  it("ignores an unrelated database error", () => {
    expect(
      isDenylistedNameError({
        message: "duplicate key",
        code: "23505",
        details: null,
        hint: null
      })
    ).toBe(false)
  })

  it("ignores a transport failure, which must still fail hydration", () => {
    expect(isDenylistedNameError(new Error("Failed to fetch"))).toBe(false)
  })

  it("ignores null", () => {
    expect(isDenylistedNameError(null)).toBe(false)
  })
})
