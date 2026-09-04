import { supabase } from "../lib/supabaseClient"
import type { GroupBoard, GroupPeriod, LeaderboardRow } from "../types/groups"

/**
 * The board is fetched fresh on mount and on every period change (D15).
 *
 * The call sends a period and a timezone, never dates. The server resolves the
 * window, which is what stops a member asking about a single day and learning
 * who trained which discipline on it.
 */

type LeaderboardRowResponse = {
  membership_id: string
  member_name: string
  is_self: boolean
  slalom_count: number | string
  tricks_count: number | string
  jump_count: number | string
  other_count: number | string
  total_count: number | string
  window_start: string | null
  window_end: string | null
}

/** Read per fetch, not cached: a device can change zone between two loads. */
export function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/**
 * Rows arrive ranked by total descending, name ascending, with members who
 * logged nothing at the bottom. The order is the server's; the client renders
 * it as given.
 *
 * The resolved window comes back repeated on every row (the server owns the
 * dates, D8); it is read off the first row and carried on the result so the
 * header can show the range.
 *
 * A non-member and a group that no longer exists both raise
 * `groups.not_a_member` — deliberately indistinguishable (EC-7).
 */
export async function fetchGroupLeaderboard(
  groupId: string,
  period: GroupPeriod,
  timezone: string = resolveTimezone()
): Promise<GroupBoard> {
  const { data, error } = await supabase.rpc("fetch_group_leaderboard", {
    p_group_id: groupId,
    p_period: period,
    p_timezone: timezone
  })
  if (error) throw error

  const response = (data ?? []) as LeaderboardRowResponse[]

  const rows: LeaderboardRow[] = response.map(row => ({
    membershipId: row.membership_id,
    memberName: row.member_name,
    isSelf: row.is_self,
    // bigint arrives as a string once it exceeds the JS safe range.
    slalomCount: Number(row.slalom_count),
    tricksCount: Number(row.tricks_count),
    jumpCount: Number(row.jump_count),
    otherCount: Number(row.other_count),
    totalCount: Number(row.total_count)
  }))

  return {
    windowStart: response[0]?.window_start ?? null,
    windowEnd: response[0]?.window_end ?? null,
    rows
  }
}
