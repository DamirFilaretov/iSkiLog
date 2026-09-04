import type { Group } from "../../types/groups"

/**
 * A session-only, in-memory snapshot of the last successful directory fetch —
 * never localStorage, never persisted, gone on reload. D15 banned caching
 * outright, but the concrete problem it was solving was the *leaderboard*: a
 * period-keyed memo goes stale across midnight and misses sets logged while
 * mounted. The plain directory (membership + browse) has no calendar window
 * to drift against, so it doesn't carry that risk — the only cost of a stale
 * read here is a moment where a just-left group is still shown, and the
 * unconditional refetch on every `load()` corrects that within one round
 * trip.
 *
 * Keyed by user id so a snapshot never leaks across an account switch within
 * the same tab; a different id (or no snapshot yet) is treated as a miss.
 */

type DirectorySnapshot = {
  mine: Group[]
  browse: Group[]
}

let cache: { userId: string; snapshot: DirectorySnapshot } | null = null

export function getGroupDirectorySnapshot(userId: string): DirectorySnapshot | null {
  return cache && cache.userId === userId ? cache.snapshot : null
}

export function setGroupDirectorySnapshot(userId: string, snapshot: DirectorySnapshot): void {
  cache = { userId, snapshot }
}
