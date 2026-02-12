import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"

export async function createSet(args: { set: SkiSet }): Promise<string> {
  const { set } = args

  const { data: userResult, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const authUser = userResult.user
  if (!authUser) throw new Error("Not authenticated")

  const { data: base, error: baseError } = await supabase
    .from("sets")
    .insert({
      user_id: authUser.id,
      season_id: set.seasonId,
      is_favorite: set.isFavorite,
      event_type: set.event,
      date: set.date,
      notes: set.notes
    })
    .select("id")
    .single()

  if (baseError || !base) throw baseError

  const setId = base.id as string

  if (set.event === "slalom") {
    const { error } = await supabase.from("slalom_sets").insert({
      set_id: setId,
      buoys: set.data.buoys ?? 0,
      rope_length: set.data.ropeLength ?? "",
      speed: set.data.speed ? Number(set.data.speed) : null,
      passes_count: set.data.passesCount ?? 0
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
      subevent: set.data.subEvent ?? "jump",
      attempts: set.data.subEvent === "cuts" ? 0 : set.data.attempts ?? 0,
      passed: set.data.subEvent === "cuts" ? 0 : set.data.passed ?? 0,
      made: set.data.subEvent === "cuts" ? 0 : set.data.made ?? 0,
      distance: set.data.distance ?? null,
      cuts_type: set.data.cutsType ?? null,
      cuts_count: set.data.cutsCount ?? null
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
