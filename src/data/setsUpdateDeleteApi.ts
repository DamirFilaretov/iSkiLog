import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"

/**
 * Update a set in Supabase.
 * Strategy:
 * 1. Update base row in sets including season_id
 * 2. Upsert the correct subtype row
 * 3. Delete any other subtype rows to keep data consistent if event type changed
 */
export async function updateSetInDb(args: {
  set: SkiSet
  seasonId: string | null
}): Promise<void> {
  const { set, seasonId } = args

  // 1. Update base row
  const { error: baseError } = await supabase
    .from("sets")
    .update({
      event_type: set.event,
      date: set.date,
      notes: set.notes,
      season_id: seasonId
    })
    .eq("id", set.id)

  if (baseError) throw baseError

  // 2. Upsert correct subtype row
  if (set.event === "slalom") {
    const { error } = await supabase.from("slalom_sets").upsert({
      set_id: set.id,
      buoys: set.data.buoys ?? 0,
      rope_length: set.data.ropeLength ?? "",
      speed: set.data.speed ? Number(set.data.speed) : null
    })
    if (error) throw error
  }

  if (set.event === "tricks") {
    const { error } = await supabase.from("tricks_sets").upsert({
      set_id: set.id,
      duration_minutes: set.data.duration,
      trick_type: set.data.trickType
    })
    if (error) throw error
  }

  if (set.event === "jump") {
    const { error } = await supabase.from("jump_sets").upsert({
      set_id: set.id,
      attempts: set.data.attempts ?? 0,
      passed: set.data.passed ?? 0,
      made: set.data.made ?? 0
    })
    if (error) throw error
  }

  if (set.event === "cuts") {
    const { error } = await supabase.from("cuts_sets").upsert({
      set_id: set.id,
      passes_num: set.data.passes ?? 0
    })
    if (error) throw error
  }

  if (set.event === "other") {
    const { error } = await supabase.from("other_sets").upsert({
      set_id: set.id,
      name: set.data.name ?? ""
    })
    if (error) throw error
  }

  // 3. Cleanup other subtype rows
  if (set.event !== "slalom") {
    const { error } = await supabase.from("slalom_sets").delete().eq("set_id", set.id)
    if (error) throw error
  }

  if (set.event !== "tricks") {
    const { error } = await supabase.from("tricks_sets").delete().eq("set_id", set.id)
    if (error) throw error
  }

  if (set.event !== "jump") {
    const { error } = await supabase.from("jump_sets").delete().eq("set_id", set.id)
    if (error) throw error
  }

  if (set.event !== "cuts") {
    const { error } = await supabase.from("cuts_sets").delete().eq("set_id", set.id)
    if (error) throw error
  }

  if (set.event !== "other") {
    const { error } = await supabase.from("other_sets").delete().eq("set_id", set.id)
    if (error) throw error
  }
}

/**
 * Delete a set in Supabase.
 * Cascades delete to subtype tables via FK on delete cascade.
 */
export async function deleteSetFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("sets").delete().eq("id", id)
  if (error) throw error
}
