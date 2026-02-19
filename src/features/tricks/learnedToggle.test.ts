import { describe, expect, it } from "vitest"
import { applyToggleResponse, setLearnedState } from "./learnedToggle"

describe("learnedToggle race handling", () => {
  it("stays unchecked after fast check then uncheck", () => {
    const trickId = "trick_001"

    // Request 1 optimistic: checked
    let learned = setLearnedState(new Set<string>(), trickId, true)

    // Request 2 optimistic: unchecked (user changed mind quickly)
    learned = setLearnedState(learned, trickId, false)

    // Request 1 returns late, should be ignored.
    learned = applyToggleResponse({
      current: learned,
      trickId,
      latestVersion: 2,
      responseVersion: 1,
      succeeded: true,
      previousLearned: false
    })

    // Request 2 returns, final state should stay unchecked.
    learned = applyToggleResponse({
      current: learned,
      trickId,
      latestVersion: 2,
      responseVersion: 2,
      succeeded: true,
      previousLearned: true
    })

    expect(learned.has(trickId)).toBe(false)
    expect(learned.size).toBe(0)
  })
})

