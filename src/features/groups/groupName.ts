import { serverWhitespaceEdges, serverWhitespaceRun } from "./groupWhitespace"

/**
 * A client mirror of the server's group-name rules.
 *
 * Length checking is not authoritative — the server decides, and its message
 * is what the user is shown — but the client must never be the *stricter* of
 * the two, or it blocks a name the server would have accepted. So it counts
 * code points, the way char_length() does, rather than UTF-16 code units.
 *
 * Whitespace is a different matter and *is* held to the server's exact rules,
 * because `canonicalGroupName` decides which group a `groups.name_taken`
 * refers to. See `groupWhitespace.ts` for why both over- and under-collapsing
 * are bugs there.
 */

export const GROUP_NAME_MIN = 2
export const GROUP_NAME_MAX = 40
export const GROUP_DESCRIPTION_MAX = 200

function collapse(value: string): string {
  return (value ?? "")
    .replace(serverWhitespaceRun(), " ")
    .replace(serverWhitespaceEdges(), "")
}

/** The display form the server stores: whitespace collapsed, then trimmed. */
export function normaliseGroupName(name: string): string {
  return collapse(name ?? "")
}

export function normaliseGroupDescription(description: string): string {
  return collapse(description ?? "")
}

/**
 * The form the server's unique index is built on, so `"Ski Club"`,
 * `"ski club"` and `" Ski  Club "` are one name (EC-1). Used by the create
 * flow to find the group a `groups.name_taken` refers to.
 */
export function canonicalGroupName(name: string): string {
  return collapse(name ?? "").toLowerCase()
}

/** Code points, matching the server's char_length(): one emoji is one character, not two. */
function characterCount(value: string): number {
  return [...value].length
}

/** Returns a message to show under the field, or null when the name looks fine. */
export function checkGroupName(name: string): string | null {
  const length = characterCount(normaliseGroupName(name))
  if (length < GROUP_NAME_MIN) return `Use at least ${GROUP_NAME_MIN} characters.`
  if (length > GROUP_NAME_MAX) return `Use at most ${GROUP_NAME_MAX} characters.`
  return null
}

/** Returns a message to show under the field, or null when the description looks fine. */
export function checkGroupDescription(description: string): string | null {
  if (characterCount(normaliseGroupDescription(description)) > GROUP_DESCRIPTION_MAX) {
    return `Use at most ${GROUP_DESCRIPTION_MAX} characters.`
  }
  return null
}
