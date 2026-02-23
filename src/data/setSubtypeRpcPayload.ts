import type { EventKey, SkiSet } from "../types/sets"

type BaseSetSubtypeRpcPayload = {
  p_season_id: string | null
  p_is_favorite: boolean
  p_event_type: EventKey
  p_date: string
  p_notes: string
  p_buoys: number | null
  p_rope_length: string | null
  p_speed: number | null
  p_passes_count: number | null
  p_duration_minutes: number | null
  p_trick_type: "hands" | "toes" | null
  p_subevent: "jump" | "cuts" | null
  p_attempts: number | null
  p_passed: number | null
  p_made: number | null
  p_distance: number | null
  p_cuts_type: "cut_pass" | "open_cuts" | null
  p_cuts_count: number | null
  p_other_name: string | null
}

export type CreateSetSubtypeRpcPayload = BaseSetSubtypeRpcPayload

export type UpdateSetSubtypeRpcPayload = BaseSetSubtypeRpcPayload & {
  p_set_id: string
  p_event_changed: boolean
}

function parseNumericSpeed(value: string) {
  if (!value) return null
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function buildCreateSetSubtypeRpcPayload(set: SkiSet): CreateSetSubtypeRpcPayload {
  const base: CreateSetSubtypeRpcPayload = {
    p_season_id: set.seasonId,
    p_is_favorite: set.isFavorite,
    p_event_type: set.event,
    p_date: set.date,
    p_notes: set.notes,
    p_buoys: null,
    p_rope_length: null,
    p_speed: null,
    p_passes_count: null,
    p_duration_minutes: null,
    p_trick_type: null,
    p_subevent: null,
    p_attempts: null,
    p_passed: null,
    p_made: null,
    p_distance: null,
    p_cuts_type: null,
    p_cuts_count: null,
    p_other_name: null
  }

  if (set.event === "slalom") {
    return {
      ...base,
      p_buoys: set.data.buoys ?? 0,
      p_rope_length: set.data.ropeLength ?? "",
      p_speed: parseNumericSpeed(set.data.speed),
      p_passes_count: set.data.passesCount ?? 0
    }
  }

  if (set.event === "tricks") {
    return {
      ...base,
      p_duration_minutes: set.data.duration,
      p_trick_type: set.data.trickType
    }
  }

  if (set.event === "jump") {
    return {
      ...base,
      p_subevent: set.data.subEvent ?? "jump",
      p_attempts: set.data.subEvent === "cuts" ? 0 : set.data.attempts ?? 0,
      p_passed: set.data.subEvent === "cuts" ? 0 : set.data.passed ?? 0,
      p_made: set.data.subEvent === "cuts" ? 0 : set.data.made ?? 0,
      p_distance: set.data.distance ?? null,
      p_cuts_type: set.data.cutsType ?? null,
      p_cuts_count: set.data.cutsCount ?? null
    }
  }

  return {
    ...base,
    p_other_name: set.data.name ?? ""
  }
}

export function buildUpdateSetSubtypeRpcPayload(
  set: SkiSet,
  previousEvent: EventKey
): UpdateSetSubtypeRpcPayload {
  return {
    ...buildCreateSetSubtypeRpcPayload(set),
    p_set_id: set.id,
    p_event_changed: previousEvent !== set.event
  }
}
