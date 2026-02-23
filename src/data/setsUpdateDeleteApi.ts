// src/data/setsUpdateDeleteApi.ts
import { supabase } from "../lib/supabaseClient"
import type { EventKey, SkiSet } from "../types/sets"
import { buildUpdateSetSubtypeRpcPayload } from "./setSubtypeRpcPayload"

/**
 * Update a set through a single transactional RPC in Supabase.
 */
export async function updateSetInDb(args: { set: SkiSet; previousEvent: EventKey }): Promise<void> {
  const { set, previousEvent } = args
  const payload = buildUpdateSetSubtypeRpcPayload(set, previousEvent)

  const { error } = await supabase.rpc("update_set_with_subtype", payload)
  if (error) throw error
}

/**
 * Delete a set in Supabase.
 * Cascades delete to subtype tables via FK on delete cascade.
 */
export async function deleteSetFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("sets").delete().eq("id", id)
  if (error) throw error
}

export async function updateSetFavoriteInDb(args: {
  id: string
  isFavorite: boolean
}): Promise<void> {
  const { error } = await supabase
    .from("sets")
    .update({ is_favorite: args.isFavorite })
    .eq("id", args.id)

  if (error) throw error
}
