export type EventKey = "slalom" | "tricks" | "jump" | "cuts" | "other"

export type SetBase = {
  id: string
  event: EventKey

  // Logical date of the training session (user input)
  date: string

  // Stored season membership from the database.
  // This is the source of truth for which season the set belongs to.
  seasonId: string | null

  notes: string

  // Timestamp of last user interaction with this set.
  // Used for "Recent" ordering (last created OR last updated).
  // Comes from DB updated_at or is set locally on create/update.
  touchedAt?: string
}

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

export type SkiSet =
  | (SetBase & { event: "slalom"; data: SlalomData })
  | (SetBase & { event: "tricks"; data: TricksData })
  | (SetBase & { event: "jump"; data: JumpData })
  | (SetBase & { event: "cuts"; data: CutsData })
  | (SetBase & { event: "other"; data: OtherData })

export type Season = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}
