/**
 * What a user may reach, given the server's answer.
 *
 * The kill switch is narrower than "Groups is off". Only `create_group` and
 * `join_group` consult `groups_enabled()`; `leave_group`, `list_my_groups`,
 * `fetch_group_leaderboard`, `block_group_member`, `unblock` and the report
 * RPCs all keep working, deliberately — `leave_group` carries a comment in
 * `schema.sql` saying so. Flipping the switch during an incident must stop the
 * feature spreading without trapping the people already inside a group.
 *
 * So a single boolean gate is wrong in both directions: gating everything
 * strands existing members with no route to Leave, and gating nothing puts the
 * directory back in front of people during rollout stage 3.
 */

export type GroupsAccess =
  /** The server has not answered yet. */
  | "loading"
  /** Directory, search, create, join, boards — everything. */
  | "full"
  /** Flag off, but the caller is in groups: their own groups and Leave only. */
  | "wind_down"
  /** Flag off and no memberships: the feature does not exist for this user. */
  | "unavailable"
  /** The status call failed. Not the same as "off" — offer a retry. */
  | "unknown"

export function groupsAccess(params: {
  loading: boolean
  enabled: boolean
  /** The status call itself failed, so `enabled` is a fallback, not an answer. */
  failed: boolean
  hasMemberships: boolean
}): GroupsAccess {
  if (params.loading) return "loading"
  if (params.enabled) return "full"
  if (params.failed) return "unknown"
  return params.hasMemberships ? "wind_down" : "unavailable"
}

/**
 * `unknown` hides the tab — failing closed is right for a chrome element that
 * renders on every screen. Recovery lives on the route itself, which renders a
 * retry rather than redirecting, and in the provider's revalidation on
 * reconnect.
 */
export function showsGroupsTab(access: GroupsAccess): boolean {
  return access === "full" || access === "wind_down"
}

/** Only `unavailable` sends a visitor away; every other state renders something. */
export function redirectsAwayFromGroups(access: GroupsAccess): boolean {
  return access === "unavailable"
}
