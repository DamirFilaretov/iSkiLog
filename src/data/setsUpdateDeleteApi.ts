// src/data/setsUpdateDeleteApi.ts
import { supabase } from "../lib/supabaseClient"
import type { EventKey, SkiSet } from "../types/sets"
import { buildUpdateSetSubtypeRpcPayload } from "./setSubtypeRpcPayload"
import { withTimeoutRetry } from "./withTimeoutRetry"

/**
 * Update a set through a single transactional RPC in Supabase.
 */
export async function updateSetInDb(args: { set: SkiSet; previousEvent: EventKey }): Promise<void> {
  const { set, previousEvent } = args
  const payload = buildUpdateSetSubtypeRpcPayload(set, previousEvent)

  await withTimeoutRetry(async signal => {
    const { error, status } = await supabase
      .rpc("update_set_with_subtype", payload)
      .abortSignal(signal)
    // See setsWriteApi.ts: status lets isRetryableError distinguish a real
    // server response from a request that never got one.
    if (error) throw Object.assign(error, { status })
  })
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
