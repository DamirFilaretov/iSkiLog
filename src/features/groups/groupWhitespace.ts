/**
 * The characters PostgreSQL's `\s` collapses in this database — the set
 * `canonical_group_name` and `create_group` normalise with.
 *
 * This is NOT JavaScript's `\s`. The two differ in both directions, and both
 * directions break the create flow's reconciliation (D18, EC-26), which decides
 * "is this the group I just made?" by comparing canonical names:
 *
 * - Collapsing *less* than the server makes the client miss its own group. The
 *   server stores `A<U+0085>B` as `A B`; a client that leaves U+0085 alone sees
 *   two different names and tells the user someone else took the name.
 * - Collapsing *more* than the server can match a different group. The server
 *   keeps `A<U+FEFF>B` and `A B` apart, so a client that folds U+FEFF into a
 *   space can navigate to a group the user never created.
 *
 * So this mirrors the server exactly rather than approximating it. The lists
 * were measured against the database; `tests/db/groupNameMirror.test.ts`
 * re-measures them, so a locale or version change breaks a test instead of the
 * create flow.
 *
 * Whitespace to JavaScript but not to the server: U+FEFF.
 * Whitespace to the server but not to JavaScript: U+001C-U+001F, U+0085.
 */

const CLASS =
  "\t\n\v\f\r \u001c-\u001f\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000"

/** Matches one or more server-whitespace characters. A fresh object each call: /g is stateful. */
export const serverWhitespaceRun = (): RegExp => new RegExp(`[${CLASS}]+`, "g")

/** Matches a leading or trailing run, which is what the server's btrim removes. */
export const serverWhitespaceEdges = (): RegExp =>
  new RegExp(`^[${CLASS}]+|[${CLASS}]+$`, "g")

/** The corpus the unit tests and the database mirror test share. */
export const SERVER_WHITESPACE_CHARS: readonly string[] = [
  "\u0009", "\u000a", "\u000b", "\u000c", "\u000d", "\u0020",
  "\u001c", "\u001d", "\u001e", "\u001f", "\u0085", "\u00a0",
  "\u1680", "\u2000", "\u2001", "\u2002", "\u2003", "\u2004",
  "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200a",
  "\u2028", "\u2029", "\u202f", "\u205f", "\u3000"
]

/** Look-alikes the server preserves, so the client must preserve them too. */
export const SERVER_NON_WHITESPACE_CHARS: readonly string[] = [
  "\ufeff", "\u200b", "\u200c", "\u200d", "\u180e", "\u00ad"
]
