import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"

/**
 * Insert a SkiSet into Supabase.
 * Writes to base table and exactly one subtype table.
 * Returns the created set id from the database.
 */
export async function createSet(args: {
  set: SkiSet
  seasonId: string | null
}): Promise<string> {
  const { set, seasonId } = args

  // Get the authenticated user so we can satisfy RLS policy (user_id must match auth.uid()).
  const { data: userResult, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const authUser = userResult.user

  if (!authUser) {
    throw new Error("Not authenticated")
  }

  // Insert base row into sets.
  const { data: base, error: baseError } = await supabase
    .from("sets")
    .insert({
      user_id: authUser.id,
      season_id: seasonId, // Season assignment happens here
      event_type: set.event,
      date: set.date,
      notes: set.notes
    })
    .select("id")
    .single()

  if (baseError || !base) {
    throw baseError
  }

  const setId = base.id as string

  // Insert exactly one subtype row depending on event.
  if (set.event === "slalom") {
    const { error } = await supabase.from("slalom_sets").insert({
      set_id: setId,
      buoys: set.data.buoys ?? 0,
      rope_length: set.data.ropeLength ?? "",
      speed: set.data.speed ? Number(set.data.speed) : null
    })

    if (error) throw error
  }

  if (set.event === "tricks") {
    const { error } = await supabase.from("tricks_sets").insert({
      set_id: setId,
      duration_minutes: set.data.duration,
      trick_type: set.data.trickType
    })

    if (error) throw error
  }

  if (set.event === "jump") {
    const { error } = await supabase.from("jump_sets").insert({
      set_id: setId,
      attempts: set.data.attempts ?? 0,
      passed: set.data.passed ?? 0,
      made: set.data.made ?? 0
    })

    if (error) throw error
  }

  if (set.event === "cuts") {
    const { error } = await supabase.from("cuts_sets").insert({
      set_id: setId,
      passes_num: set.data.passes ?? 0
    })

    if (error) throw error
  }

  if (set.event === "other") {
    const { error } = await supabase.from("other_sets").insert({
      set_id: setId,
      name: set.data.name ?? ""
    })

    if (error) throw error
  }

  return setId
}
