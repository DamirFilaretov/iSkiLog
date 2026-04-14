import { supabase } from "../lib/supabaseClient"
import type { SkiSet, StructuredNotes } from "../types/sets"

/**
 * Fetch fully hydrated sets through one RPC call.
 * Server returns base and subtype fields in one result set, already ordered.
 */
export async function fetchSets(): Promise<SkiSet[]> {
  const { data, error } = await supabase.rpc("fetch_sets_hydrated")
  if (error) throw error
  if (!data) return []

  const rows = data as HydratedSetRow[]
  return rows.map(mapHydratedRowToSet)
}

type HydratedSetRow = {
  set_id: string
  event_type: "slalom" | "tricks" | "jump" | "other"
  date: string
  time_of_day: string | null
  season_id: string | null
  is_favorite: boolean | null
  notes_summary: string | null
  notes_worked_on: string | null
  notes_mistakes: string | null
  notes_what_helped: string | null
  notes_next_set: string | null
  notes_other: string | null
  buoys: number | null
  rope_length: string | null
  speed: number | null
  passes_count: number | null
  duration_minutes: number | null
  trick_type: "hands" | "toes" | null
  jump_subevent: "jump" | "cuts" | null
  jump_attempts: number | null
  jump_passed: number | null
  jump_made: number | null
  jump_distance: number | null
  jump_cuts_type: "cut_pass" | "open_cuts" | null
  jump_cuts_count: number | null
  other_name: string | null
  other_duration_minutes: number | null
}

export function mapHydratedRowToSet(row: HydratedSetRow): SkiSet {
  const notes: StructuredNotes = {
    summary: row.notes_summary ?? "",
    workedOn: row.notes_worked_on ?? "",
    mistakes: row.notes_mistakes ?? "",
    whatHelped: row.notes_what_helped ?? "",
    nextSet: row.notes_next_set ?? "",
    other: row.notes_other ?? "",
  }

  const base = {
    id: row.set_id,
    date: row.date,
    timeOfDay: row.time_of_day ?? null,
    seasonId: row.season_id ?? null,
    isFavorite: row.is_favorite ?? false,
    notes,
  }

  if (row.event_type === "slalom") {
    return {
      ...base,
      event: "slalom",
      data: {
        buoys: row.buoys ?? null,
        ropeLength: row.rope_length ?? "",
        speed: row.speed === null ? "" : String(row.speed),
        passesCount: row.passes_count ?? 0
      }
    }
  }

  if (row.event_type === "tricks") {
    return {
      ...base,
      event: "tricks",
      data: {
        duration: row.duration_minutes ?? null,
        trickType: row.trick_type ?? "hands"
      }
    }
  }

  if (row.event_type === "jump") {
    return {
      ...base,
      event: "jump",
      data: {
        subEvent: row.jump_subevent ?? "jump",
        attempts: row.jump_attempts ?? null,
        passed: row.jump_passed ?? null,
        made: row.jump_made ?? null,
        distance: row.jump_distance ?? null,
        cutsType: row.jump_cuts_type ?? null,
        cutsCount: row.jump_cuts_count ?? null
      }
    }
  }

  return {
    ...base,
    event: "other",
    data: {
      name: row.other_name ?? "",
      duration: row.other_duration_minutes ?? null
    }
  }
}
