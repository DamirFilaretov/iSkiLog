import { supabase } from "../lib/supabaseClient"
import type { SkiSet } from "../types/sets"
import { buildCreateSetSubtypeRpcPayload } from "./setSubtypeRpcPayload"
import { withTimeoutRetry } from "./withTimeoutRetry"

export async function createSet(args: { set: SkiSet }): Promise<string> {
  const { set } = args
  const payload = buildCreateSetSubtypeRpcPayload(set)

  return withTimeoutRetry(async signal => {
    const { data, error, status } = await supabase
      .rpc("create_set_with_subtype", payload)
      .abortSignal(signal)
    // `status` lets isRetryableError tell a real server response (e.g. a 504
    // gateway timeout, where the write may already be committed) apart from
    // fetch() never getting a response at all. See withTimeoutRetry.ts.
    if (error) throw Object.assign(error, { status })
    if (typeof data !== "string" || data.length === 0) {
      throw new Error("Create set RPC returned an invalid set id.")
    }

    return data
  })
}
