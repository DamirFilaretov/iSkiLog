import { supabase } from "../lib/supabaseClient"

async function requireUserId() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  return userId
}

export async function fetchLearnedTrickIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_learned_tricks")
    .select("trick_id")

  if (error) throw error

  const ids = (data ?? [])
    .map(row => row.trick_id as string | null)
    .filter((value): value is string => typeof value === "string" && value.length > 0)

  return new Set(ids)
}

export async function setTrickLearned(args: {
  trickId: string
  learned: boolean
}): Promise<void> {
  const userId = await requireUserId()

  if (args.learned) {
    const { error } = await supabase.from("user_learned_tricks").upsert(
      {
        user_id: userId,
        trick_id: args.trickId,
        learned_at: new Date().toISOString()
      },
      { onConflict: "user_id,trick_id" }
    )
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from("user_learned_tricks")
    .delete()
    .eq("user_id", userId)
    .eq("trick_id", args.trickId)

  if (error) throw error
}

export async function fetchInProgressTrickIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_in_progress_tricks")
    .select("trick_id")

  if (error) throw error

  const ids = (data ?? [])
    .map(row => row.trick_id as string | null)
    .filter((value): value is string => typeof value === "string" && value.length > 0)

  return new Set(ids)
}

export async function setTrickInProgress(args: {
  trickId: string
  inProgress: boolean
}): Promise<void> {
  const userId = await requireUserId()

  if (args.inProgress) {
    const { error } = await supabase.from("user_in_progress_tricks").upsert(
      {
        user_id: userId,
        trick_id: args.trickId,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,trick_id" }
    )
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from("user_in_progress_tricks")
    .delete()
    .eq("user_id", userId)
    .eq("trick_id", args.trickId)

  if (error) throw error
}
