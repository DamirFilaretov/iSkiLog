import { supabase } from "../lib/supabaseClient"

const LEARNED_CACHE_PREFIX = "iskilog:learned-tricks:"
const IN_PROGRESS_CACHE_PREFIX = "iskilog:in-progress-tricks:"

function readCachedIds(key: string): Set<string> | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return null

    const ids = parsed.filter(value => typeof value === "string" && value.length > 0)
    return new Set(ids)
  } catch {
    return null
  }
}

function writeCachedIds(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(Array.from(ids)))
}

function learnedCacheKey(userId: string) {
  return `${LEARNED_CACHE_PREFIX}${userId}`
}

function inProgressCacheKey(userId: string) {
  return `${IN_PROGRESS_CACHE_PREFIX}${userId}`
}

async function requireUserId() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  return userId
}

export function readCachedLearnedTrickIds(userId: string): Set<string> | null {
  return readCachedIds(learnedCacheKey(userId))
}

export function readCachedInProgressTrickIds(userId: string): Set<string> | null {
  return readCachedIds(inProgressCacheKey(userId))
}

export async function fetchLearnedTrickIds(): Promise<Set<string>> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from("user_learned_tricks")
    .select("trick_id, learned_at")
    .order("learned_at", { ascending: false })

  if (error) throw error

  const ids = (data ?? [])
    .map(row => row.trick_id as string | null)
    .filter((value): value is string => typeof value === "string" && value.length > 0)

  const result = new Set(ids)
  writeCachedIds(learnedCacheKey(userId), result)
  return result
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
    const cacheKey = learnedCacheKey(userId)
    const next = readCachedIds(cacheKey) ?? new Set<string>()
    const ordered = [args.trickId, ...Array.from(next).filter(id => id !== args.trickId)]
    writeCachedIds(cacheKey, new Set(ordered))
    return
  }

  const { error } = await supabase
    .from("user_learned_tricks")
    .delete()
    .eq("user_id", userId)
    .eq("trick_id", args.trickId)

  if (error) throw error
  const cacheKey = learnedCacheKey(userId)
  const next = readCachedIds(cacheKey) ?? new Set<string>()
  next.delete(args.trickId)
  writeCachedIds(cacheKey, next)
}

export async function fetchInProgressTrickIds(): Promise<Set<string>> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from("user_in_progress_tricks")
    .select("trick_id, updated_at")
    .order("updated_at", { ascending: false })

  if (error) throw error

  const ids = (data ?? [])
    .map(row => row.trick_id as string | null)
    .filter((value): value is string => typeof value === "string" && value.length > 0)

  const result = new Set(ids)
  writeCachedIds(inProgressCacheKey(userId), result)
  return result
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
    const cacheKey = inProgressCacheKey(userId)
    const next = readCachedIds(cacheKey) ?? new Set<string>()
    const ordered = [args.trickId, ...Array.from(next).filter(id => id !== args.trickId)]
    writeCachedIds(cacheKey, new Set(ordered))
    return
  }

  const { error } = await supabase
    .from("user_in_progress_tricks")
    .delete()
    .eq("user_id", userId)
    .eq("trick_id", args.trickId)

  if (error) throw error
  const cacheKey = inProgressCacheKey(userId)
  const next = readCachedIds(cacheKey) ?? new Set<string>()
  next.delete(args.trickId)
  writeCachedIds(cacheKey, next)
}
