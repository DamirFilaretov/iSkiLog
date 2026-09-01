import { canonicalGroupName, normaliseGroupName } from "./groupName"

/**
 * The stand-in for the group logo that is deferred (D10): initials on a colour
 * derived from the name. The colour is hashed from the canonical name, so every
 * viewer sees the same avatar for the same group.
 */

export const GROUP_AVATAR_COLORS: readonly string[] = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-purple-600",
  "bg-rose-500",
  "bg-teal-600",
  "bg-amber-500",
  "bg-indigo-600"
]

/**
 * One *displayed* character, not one code point. A flag is a pair of regional
 * indicators and a family emoji is several code points joined by ZWJ, so
 * slicing by code point leaves half a glyph in the circle.
 *
 * `Intl.Segmenter` is in every WebView the app ships against; the code-point
 * fallback exists so an older one degrades instead of throwing.
 */
function firstGrapheme(value: string): string {
  if (value === "") return ""

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    for (const { segment } of segmenter.segment(value)) return segment
    return ""
  }

  return [...value][0] ?? ""
}

/**
 * Uppercase, then take one glyph — not the other way round. Uppercasing can
 * lengthen a string ("ß" becomes "SS", "ﬄ" becomes "FFL"), which would push a
 * two-initial avatar to three or four characters.
 */
function initial(word: string): string {
  return firstGrapheme(firstGrapheme(word).toUpperCase())
}

/** One initial for a single-word name, first and last for anything longer. */
export function groupInitials(name: string): string {
  const words = normaliseGroupName(name ?? "").split(" ").filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return initial(words[0])
  return initial(words[0]) + initial(words[words.length - 1])
}

/** FNV-1a, so the mapping is stable across browsers and runs. */
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function groupAvatarColor(name: string): string {
  const index = hash(canonicalGroupName(name)) % GROUP_AVATAR_COLORS.length
  return GROUP_AVATAR_COLORS[index]
}
