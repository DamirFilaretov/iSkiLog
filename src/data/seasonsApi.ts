import { supabase } from "../lib/supabaseClient"
import type { Season } from "../types/sets"

/**
 * Fetch all seasons for the logged in user.
 */
export async function fetchSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false })

  if (error) throw error
  if (!data) return []

  return data.map(s => ({
    id: s.id,
    name: s.name,
    startDate: s.start_date,
    endDate: s.end_date,
    isActive: s.is_active
  }))
}

/**
 * Create a new season.
 * Used on first login if no seasons exist.
 */
export async function createSeason(args: {
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}): Promise<Season> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("seasons")
    .insert({
      user_id: userId,
      name: args.name,
      start_date: args.startDate,
      end_date: args.endDate,
      is_active: args.isActive
    })
    .select("*")
    .single()

  if (error || !data) throw error

  return {
    id: data.id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    isActive: data.is_active
  }
}

/**
 * Update start and end dates for a season.
 */
export async function updateSeasonDates(args: {
  seasonId: string
  startDate: string
  endDate: string
}): Promise<void> {
  const { error } = await supabase
    .from("seasons")
    .update({
      start_date: args.startDate,
      end_date: args.endDate
    })
    .eq("id", args.seasonId)

  if (error) throw error
}

/**
 * Set exactly one active season for the user.
 */
export async function setActiveSeason(seasonId: string): Promise<void> {
  const { error } = await supabase.rpc("set_active_season_atomic", {
    p_season_id: seasonId
  })
  if (error) throw error
}
