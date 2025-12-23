import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"

/**
 * Fetch all sets for the logged in user and map them
 * into the frontend SkiSet shape.
 */
export async function fetchSets(): Promise<SkiSet[]> {
  const { data: sets, error } = await supabase
    .from("sets")
    .select("*")
    .order("date", { ascending: false })

  if (error) {
    throw error
  }

  if (!sets) return []

  const results: SkiSet[] = []

  for (const s of sets) {
    if (s.event_type === "slalom") {
      const { data } = await supabase
        .from("slalom_sets")
        .select("*")
        .eq("set_id", s.id)
        .single()

      results.push({
        id: s.id,
        event: "slalom",
        date: s.date,
        notes: s.notes ?? "",
        data: {
          buoys: data?.buoys ?? null,
          ropeLength: data?.rope_length ?? "",
          speed: data?.speed ?? ""
        }
      })
    }

    if (s.event_type === "tricks") {
      const { data } = await supabase
        .from("tricks_sets")
        .select("*")
        .eq("set_id", s.id)
        .single()

      results.push({
        id: s.id,
        event: "tricks",
        date: s.date,
        notes: s.notes ?? "",
        data: {
          duration: data?.duration_minutes ?? null,
          trickType: data?.trick_type ?? "hands"
        }
      })
    }

    if (s.event_type === "jump") {
      const { data } = await supabase
        .from("jump_sets")
        .select("*")
        .eq("set_id", s.id)
        .single()

      results.push({
        id: s.id,
        event: "jump",
        date: s.date,
        notes: s.notes ?? "",
        data: {
          attempts: data?.attempts ?? null,
          passed: data?.passed ?? null,
          made: data?.made ?? null
        }
      })
    }

    if (s.event_type === "cuts") {
      const { data } = await supabase
        .from("cuts_sets")
        .select("*")
        .eq("set_id", s.id)
        .single()

      results.push({
        id: s.id,
        event: "cuts",
        date: s.date,
        notes: s.notes ?? "",
        data: {
          passes: data?.passes_num ?? null
        }
      })
    }

    if (s.event_type === "other") {
      const { data } = await supabase
        .from("other_sets")
        .select("*")
        .eq("set_id", s.id)
        .single()

      results.push({
        id: s.id,
        event: "other",
        date: s.date,
        notes: s.notes ?? "",
        data: {
          name: data?.name ?? ""
        }
      })
    }
  }

  return results
}
