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

/** A directory row, as returned by `list_groups` / `search_groups`. */
export type Group = {
  id: string
  name: string
  description: string
  logoKey: string | null
  memberCount: number
  /** Counts every member, including anyone blocked in either direction (EC-12). */
  isMember: boolean
}

/** What `create_group` returns. Deliberately carries no `created_by`. */
export type CreatedGroup = {
  id: string
  name: string
  description: string
  logoKey: string | null
  createdAt: string
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
