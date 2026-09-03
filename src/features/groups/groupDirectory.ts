import type { Group } from "../../types/groups"
import { canonicalGroupName } from "./groupName"

/**
 * The directory's view model, kept pure so it can be tested without a DOM.
 *
 * Three sources feed one screen and they disagree on purpose:
 *
 * - `list_my_groups` is the caller's memberships — no block filter, no cap. It
 *   is the only source that can be trusted to contain a group the user is in.
 * - `list_groups` is browse: the popular 200, minus groups whose creator is
 *   blocked in either direction.
 * - `search_groups` reaches past the cap, but applies the same block filter.
 *
 * Merging them means a membership never disappears from the screen just
 * because browse or search declined to return it.
 */

export type DirectoryView = {
  /** Groups the caller belongs to, matching the query. */
  mine: Group[]
  /** Everything else that matched. */
  discover: Group[]
  /** True when a query is narrowing the screen — an empty result means "no matches", not "no groups". */
  isSearching: boolean
}

export type ReconcileDecision =
  | { action: "open_group"; group: Group }
  | { action: "open_join"; group: Group }
  | { action: "show_error" }

export type CardTap = "open_board" | "join_public" | "join_private"

/**
 * What tapping a directory card does. A membership always opens the board, even
 * for a private group. A private group you are not in routes to the code prompt
 * — the lock on the card means "ask a member for the code", not "you can join".
 */
export function directoryCardTap(group: Group): CardTap {
  if (group.isMember) return "open_board"
  if (group.isPrivate) return "join_private"
  return "join_public"
}

/**
 * Approximates the server's `order by member_count desc, canonical_group_name
 * asc`. The database orders canonical names under its `en_US.UTF-8` collation;
 * a UTF-16 code-unit comparison would sort every accented name after `zulu`.
 * `Intl.Collator` matches for the cases that occur in practice (accented
 * Latin); exact glibc parity is not reachable in JS, and only ties on member
 * count are affected.
 */
const nameCollator = new Intl.Collator("en", { sensitivity: "variant" })

function compare(a: Group, b: Group): number {
  if (a.memberCount !== b.memberCount) return b.memberCount - a.memberCount
  return nameCollator.compare(canonicalGroupName(a.name), canonicalGroupName(b.name))
}

/**
 * Later sources win, so the caller passes the least authoritative list first.
 * A row from `list_my_groups` carries a member count read at the same instant
 * as its membership, which is the pair the screen has to keep consistent.
 */
function dedupe(sources: Group[][]): Group[] {
  const byId = new Map<string, Group>()
  for (const source of sources) {
    for (const group of source) byId.set(group.id, group)
  }
  return [...byId.values()]
}

function matches(group: Group, canonicalQuery: string): boolean {
  // Name only. `search_groups` searches the name, so filtering descriptions
  // locally would show matches that vanish the moment the server answers.
  return canonicalGroupName(group.name).includes(canonicalQuery)
}

export function buildDirectory(params: {
  mine: Group[]
  browse: Group[]
  /** `null` until a server search has been made for the current query. */
  searchResults: Group[] | null
  query: string
}): DirectoryView {
  const canonicalQuery = canonicalGroupName(params.query)
  const isSearching = canonicalQuery !== ""

  const pool = dedupe([params.browse, params.searchResults ?? [], params.mine])
  const memberIds = new Set(params.mine.map(group => group.id))

  const visible = isSearching ? pool.filter(group => matches(group, canonicalQuery)) : pool

  const mine: Group[] = []
  const discover: Group[] = []
  for (const group of visible) {
    if (memberIds.has(group.id) || group.isMember) mine.push(group)
    else discover.push(group)
  }

  mine.sort(compare)
  discover.sort(compare)

  return { mine, discover, isSearching }
}

/**
 * What to do when `create_group` answers `groups.name_taken` (EC-26).
 *
 * Reconcile only when the caller is *currently a member* of the group holding
 * that name. Having created it is not enough: there are no owners (D4), so a
 * creator who left while others stayed would be sent to a board they cannot
 * read and shown `groups.not_a_member` instead of an answer.
 *
 * `known` should be the union of a fresh `listMyGroups()` and a fresh
 * `searchGroups(name)` — search alone hides a group whose creator has blocked
 * the caller, which is the one case where reconciling matters most.
 */
export function reconcileNameTaken(name: string, known: Group[]): ReconcileDecision {
  const canonical = canonicalGroupName(name)
  const candidates = known.filter(group => canonicalGroupName(group.name) === canonical)
  if (candidates.length === 0) return { action: "show_error" }

  const membership = candidates.find(group => group.isMember)
  if (membership) return { action: "open_group", group: membership }

  return { action: "open_join", group: candidates[0] }
}
