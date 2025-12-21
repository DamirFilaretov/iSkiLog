// src/types/sets.ts

/**
 * Central data model for Milestone 2.
 * Keep all shared types here so pages and components stay consistent.
 */

/**
 * The list of supported event types in V1.
 * This replaces the EventKey type that used to live inside EventTypeSelect.
 */
export type EventKey = "slalom" | "tricks" | "jump" | "cuts" | "other"

/**
 * Common fields that every set must have, no matter the event type.
 * In Milestone 2 we will store everything in local state, so this is our core object.
 */
export type SetBase = {
  /**
   * Unique identifier for the set.
   * In Milestone 2 we will generate it on the client.
   * In Milestone 3 Supabase will store it in the database.
   */
  id: string

  /**
   * Which discipline the set belongs to.
   * This controls both the UI and which event specific fields are valid.
   */
  event: EventKey

  /**
   * ISO date string in "YYYY-MM-DD" format.
   * This matches the value returned by native date inputs.
   */
  date: string

  /**
   * Optional notes about the set.
   * Empty string is fine.
   */
  notes: string
}

/**
 * Event specific fields.
 * These mirror your current UI fields so wiring logic later is straightforward.
 */
export type SlalomData = {
  buoys: number | null
  ropeLength: string
  speed: string
}

export type TricksData = {
  duration: number | null
  trickType: "hands" | "toes"
}

export type JumpData = {
  attempts: number | null
  passed: number | null
  made: number | null
}

export type CutsData = {
  passes: number | null
}

export type OtherData = {
  name: string
}

/**
 * Union type for a full set with event specific data.
 * This is useful later for Set Summary and History display.
 */
export type SkiSet =
  | (SetBase & { event: "slalom"; data: SlalomData })
  | (SetBase & { event: "tricks"; data: TricksData })
  | (SetBase & { event: "jump"; data: JumpData })
  | (SetBase & { event: "cuts"; data: CutsData })
  | (SetBase & { event: "other"; data: OtherData })
