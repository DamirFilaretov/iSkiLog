/**
 * Groups types.
 *
 * Every shape here is what an RPC returns, never what a table holds: no Groups
 * table is client-reachable. In particular no `auth.users` id ever appears —
 * members, blocks and report targets are addressed by opaque handles minted by
 * the database (`membershipId`, `blockId`).
 */

/** The only two windows the server accepts. It resolves them; the client never sends dates. */
export type GroupPeriod = "7d" | "30d"

/**
 * A directory or membership row, from `list_groups` / `search_groups` /
 * `list_my_groups`.
 */
export type Group = {
  id: string
  name: string
  description: string
  logoKey: string | null
  memberCount: number
  /** Counts every member, including anyone blocked in either direction (EC-12). */
  isMember: boolean
  /** Private groups show in the directory with a lock but are joined by code (D26, v4). */
  isPrivate: boolean
  /**
   * The 6-digit join code, for a private group the caller is a member of.
   * `null` for public groups and for any row from the directory RPCs — only
   * `list_my_groups` carries it (D28).
   */
  joinCode: string | null
}

/** What `create_group` returns. Deliberately carries no `created_by`. */
export type CreatedGroup = {
  id: string
  name: string
  description: string
  logoKey: string | null
  createdAt: string
  isPrivate: boolean
  /** The 6-digit code, shown to the creator immediately. `null` for a public group. */
  joinCode: string | null
}

/**
 * One leaderboard row. `membershipId` is scoped to a single group, so the same
 * person cannot be correlated across groups or name changes.
 */
export type LeaderboardRow = {
  membershipId: string
  memberName: string
  isSelf: boolean
  slalomCount: number
  tricksCount: number
  jumpCount: number
  otherCount: number
  totalCount: number
}

/**
 * A leaderboard fetch: the rows plus the window the server resolved them
 * against. The client sends a period and a timezone, never dates; the server
 * echoes the concrete window back so the header can show the range without the
 * client recomputing it and risking drift (D8, D15).
 *
 * `windowStart` / `windowEnd` are `YYYY-MM-DD` calendar dates. They are `null`
 * only when there are no rows at all — which cannot happen for a real member,
 * since the caller is always in the board.
 */
export type GroupBoard = {
  windowStart: string | null
  windowEnd: string | null
  rows: LeaderboardRow[]
}

/**
 * The server owns both the kill switch and the policy version, so the client
 * asks rather than holding constants of its own that could drift.
 */
export type GroupsStatus = {
  enabled: boolean
  consentNeeded: boolean
}

/** A row of the blocked-users screen. Blocking is mutual, so this is the only unblock path. */
export type BlockedUser = {
  blockId: string
  displayName: string
  blockedAt: string
}
