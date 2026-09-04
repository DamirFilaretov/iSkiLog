import { describe, expect, it } from "vitest"

import { isCompleteJoinCode, normalizeJoinCode } from "./joinCode"

describe("normalizeJoinCode", () => {
  it("keeps a clean 6-digit code as-is", () => {
    expect(normalizeJoinCode("123456")).toBe("123456")
  })

  it("strips separators and surrounding text", () => {
    expect(normalizeJoinCode("123-456")).toBe("123456")
    expect(normalizeJoinCode("  123 456 ")).toBe("123456")
    expect(normalizeJoinCode("code: 123456")).toBe("123456")
  })

  it("caps at six digits", () => {
    expect(normalizeJoinCode("1234567890")).toBe("123456")
  })

  it("returns fewer digits while the user is still typing", () => {
    expect(normalizeJoinCode("12")).toBe("12")
    expect(normalizeJoinCode("")).toBe("")
  })
})

describe("isCompleteJoinCode", () => {
  it("is true only at exactly six digits", () => {
    expect(isCompleteJoinCode("123456")).toBe(true)
    expect(isCompleteJoinCode("12345")).toBe(false)
    expect(isCompleteJoinCode("1234567")).toBe(true) // trailing digit trimmed
    expect(isCompleteJoinCode("12 34 56")).toBe(true)
  })
})
