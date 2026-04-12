import { describe, it, expect, vi } from "vitest"

vi.mock("../lib/supabaseClient", () => ({ supabase: {} }))

import { mapHydratedRowToSet } from "./setsApi"

const baseRow = {
  set_id: "abc-123",
  event_type: "slalom" as const,
  date: "2024-07-01",
  season_id: "season-1",
  is_favorite: false,
  notes_summary: "Good session",
  notes_worked_on: "Entry timing",
  notes_mistakes: "",
  notes_what_helped: "Slower pre-turn",
  notes_next_set: "Pullout width",
  notes_other: "",
  buoys: 4,
  rope_length: "13",
  speed: 58,
  passes_count: 6,
  duration_minutes: null,
  trick_type: null,
  jump_subevent: null,
  jump_attempts: null,
  jump_passed: null,
  jump_made: null,
  jump_distance: null,
  jump_cuts_type: null,
  jump_cuts_count: null,
  other_name: null,
  other_duration_minutes: null,
}

describe("mapHydratedRowToSet", () => {
  it("maps notes columns to StructuredNotes object", () => {
    const result = mapHydratedRowToSet(baseRow)
    expect(result.notes).toEqual({
      summary: "Good session",
      workedOn: "Entry timing",
      mistakes: "",
      whatHelped: "Slower pre-turn",
      nextSet: "Pullout width",
      other: "",
    })
  })

  it("defaults all notes fields to empty string when columns are null", () => {
    const row = {
      ...baseRow,
      notes_summary: null,
      notes_worked_on: null,
      notes_mistakes: null,
      notes_what_helped: null,
      notes_next_set: null,
      notes_other: null,
    }
    const result = mapHydratedRowToSet(row)
    expect(result.notes).toEqual({
      summary: "",
      workedOn: "",
      mistakes: "",
      whatHelped: "",
      nextSet: "",
      other: "",
    })
  })

  it("maps a slalom row correctly", () => {
    const result = mapHydratedRowToSet(baseRow)
    expect(result.event).toBe("slalom")
    if (result.event === "slalom") {
      expect(result.data.buoys).toBe(4)
      expect(result.data.ropeLength).toBe("13")
    }
  })
})
