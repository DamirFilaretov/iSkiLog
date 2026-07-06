import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"
import { buildCreateSetSubtypeRpcPayload } from "./setSubtypeRpcPayload"
import { withTimeoutRetry } from "./withTimeoutRetry"

export async function createSet(args: { set: SkiSet }): Promise<string> {
  const { set } = args
  const payload = buildCreateSetSubtypeRpcPayload(set)

  return withTimeoutRetry(async signal => {
    const { data, error } = await supabase
      .rpc("create_set_with_subtype", payload)
      .abortSignal(signal)
    if (error) throw error
    if (typeof data !== "string" || data.length === 0) {
      throw new Error("Create set RPC returned an invalid set id.")
    }

    return data
  })
}
