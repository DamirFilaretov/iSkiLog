import { supabase } from "../lib/supabaseClient"
import type { BlockedUser, CreatedGroup, Group, GroupsStatus } from "../types/groups"

/**
 * Every Groups read and write goes through an RPC. No Groups table carries a
 * grant, so there is no `.from("groups")` path to fall back to — a query here
 * would fail at the privilege layer, not return fewer rows.
 *
 * These functions throw the raw PostgrestError. Callers map it with
 * `toGroupError` and report it with `captureHandledException`; mapping here
 * would throw away the hint the UI needs to branch on.
 *
 * Nothing is cached (D15): no localStorage, no memo, and `CACHE_VERSION` is
 * untouched. A memo keyed by period goes stale across midnight and misses sets
 * logged while the page is mounted.
 */

type GroupRow = {
  group_id: string
  group_name: string
  group_description: string
  group_logo_key: string | null
  member_count: number | string
  is_member: boolean
  // Only list_my_groups emits these; absent (undefined) from the directory RPCs.
  is_private?: boolean
  join_code?: string | null
}

function mapGroupRow(row: GroupRow): Group {
  return {
    id: row.group_id,
    name: row.group_name,
    description: row.group_description,
    logoKey: row.group_logo_key,
    // bigint arrives as a string once it exceeds the JS safe range.
    memberCount: Number(row.member_count),
    isMember: row.is_member,
    isPrivate: row.is_private ?? false,
    joinCode: row.join_code ?? null
  }
}

/**
 * The server owns both the kill switch and the policy version, so the client
 * asks for status instead of holding constants that could drift.
 */
export async function fetchGroupsStatus(): Promise<GroupsStatus> {
  const { data, error } = await supabase.rpc("groups_status")
  if (error) throw error

  const row = (data ?? {}) as { enabled?: boolean; consent_needed?: boolean }
  return {
    enabled: row.enabled === true,
    consentNeeded: row.consent_needed !== false
  }
}

/** Records the server's current policy version. Takes no version by design. */
export async function acceptGroupsPolicy(): Promise<void> {
  const { error } = await supabase.rpc("accept_groups_policy")
  if (error) throw error
}

/** The 200 most-populated groups. Search, not this, is how the rest are reached. */
export async function listGroups(): Promise<Group[]> {
  const { data, error } = await supabase.rpc("list_groups")
  if (error) throw error
  return ((data ?? []) as GroupRow[]).map(mapGroupRow)
}

/**
 * The caller's own memberships — unfiltered by blocks and uncapped.
 *
 * `listGroups` is a directory, not a membership list: it hides groups whose
 * creator is blocked in either direction and stops at 200. Either rule can hide
 * a group the user is standing inside, and Leave is only reachable from a row
 * naming that group, so browse alone would trap a member blocked by a creator.
 */
export async function listMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase.rpc("list_my_groups")
  if (error) throw error
  return ((data ?? []) as GroupRow[]).map(mapGroupRow)
}

/** Server-side name search across every group, so a browse cap cannot hide one. */
export async function searchGroups(query: string): Promise<Group[]> {
  const { data, error } = await supabase.rpc("search_groups", { p_query: query })
  if (error) throw error
  return ((data ?? []) as GroupRow[]).map(mapGroupRow)
}

/**
 * Creates the group and the creator's membership in one transaction, so a
 * zero-member group can never reach the directory.
 *
 * Never wrapped in `withTimeoutRetry` (D18): a retry after a lost response
 * returns `groups.name_taken` for a name the caller did in fact create. The
 * create flow reconciles on that hint instead.
 */
export async function createGroup(
  name: string,
  description: string,
  isPrivate = false,
  logoKey: string | null = null
): Promise<CreatedGroup> {
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_description: description,
    p_private: isPrivate,
    p_logo_key: logoKey
  })
  if (error) throw error

  const row = data as {
    id: string
    name: string
    description: string
    logo_key: string | null
    created_at: string
    is_private: boolean
    join_code: string | null
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    logoKey: row.logo_key,
    createdAt: row.created_at,
    isPrivate: row.is_private,
    joinCode: row.join_code
  }
}

export async function joinGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc("join_group", { p_group_id: groupId })
  if (error) throw error
}

/**
 * Joins a private group by its 6-digit code (D26). A wrong code raises
 * `groups.invalid_code`. Not rate-limited server-side — "private" is a
 * discovery boundary, not access control (D27).
 */
export async function joinGroupByCode(code: string): Promise<void> {
  const { error } = await supabase.rpc("join_group_by_code", { p_code: code })
  if (error) throw error
}

/** Leaving as the last member reaps the group; the server serialises that (EC-5). */
export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_group", { p_group_id: groupId })
  if (error) throw error
}

/** The server snapshots the group's name and description, so the report outlives it. */
export async function reportGroup(groupId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("report_group", {
    p_group_id: groupId,
    p_reason: reason
  })
  if (error) throw error
}

/** Profile names are UGC too: they render on every board the member shares. */
export async function reportProfile(membershipId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("report_profile", {
    p_membership_id: membershipId,
    p_reason: reason
  })
  if (error) throw error
}

/** Takes the opaque membership handle from the board, never a user id. */
export async function blockGroupMember(membershipId: string): Promise<void> {
  const { error } = await supabase.rpc("block_group_member", {
    p_membership_id: membershipId
  })
  if (error) throw error
}

/**
 * Backs the blocked-users screen. Required, not optional: blocking is mutual,
 * so a blocked member disappears from every board, taking with them the only
 * row an unblock could have come from.
 */
export async function listBlocks(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc("list_blocks")
  if (error) throw error

  const rows = (data ?? []) as {
    block_id: string
    display_name: string
    blocked_at: string
  }[]

  return rows.map(row => ({
    blockId: row.block_id,
    displayName: row.display_name,
    blockedAt: row.blocked_at
  }))
}

export async function unblock(blockId: string): Promise<void> {
  const { error } = await supabase.rpc("unblock", { p_block_id: blockId })
  if (error) throw error
}
