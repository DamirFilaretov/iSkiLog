import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"

/**
 * Fetch sets ordered by last touched.
 * Primary: updated_at desc (so edits move to the top after refresh)
 * Fallback: date desc (for schemas that do not have updated_at)
 */
export async function fetchSets(): Promise<SkiSet[]> {
  // Try ordering by updated_at first.
  let { data: sets, error } = await supabase
    .from("sets")
    .select("*")
    .order("updated_at", { ascending: false })

  // If the column does not exist, Supabase will return an error.
  // In that case, fall back to date ordering so the app still works.
  if (error) {
    const fallback = await supabase
      .from("sets")
      .select("*")
      .order("date", { ascending: false })

    sets = fallback.data
    error = fallback.error
  }

  if (error) throw error
  if (!sets) return []

  const results: SkiSet[] = []

  for (const s of sets) {
    const seasonId = (s.season_id as string | null) ?? null

    // Prefer updated_at, fall back to created_at if it exists, otherwise undefined.
    const touchedAt =
      (s.updated_at as string | undefined) ??
      (s.created_at as string | undefined) ??
      undefined

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
        seasonId,
        notes: s.notes ?? "",
        touchedAt,
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
        seasonId,
        notes: s.notes ?? "",
        touchedAt,
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
        seasonId,
        notes: s.notes ?? "",
        touchedAt,
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
        seasonId,
        notes: s.notes ?? "",
        touchedAt,
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
        seasonId,
        notes: s.notes ?? "",
        touchedAt,
        data: {
          name: data?.name ?? ""
        }
      })
    }
  }

  return results
}
