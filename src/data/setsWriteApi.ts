import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"
import { buildCreateSetSubtypeRpcPayload } from "./setSubtypeRpcPayload"

export async function createSet(args: { set: SkiSet }): Promise<string> {
  const { set } = args
  const payload = buildCreateSetSubtypeRpcPayload(set)

  const { data, error } = await supabase.rpc("create_set_with_subtype", payload)
  if (error) throw error
  if (typeof data !== "string" || data.length === 0) {
    throw new Error("Create set RPC returned an invalid set id.")
  }

  return data
}
