/**
 * Groups made `profiles.full_name` public UGC, so a database trigger rejects
 * denylisted display names on every write (D21). That trigger also sits on the
 * sign-in path: `AuthProvider` writes the name an OAuth provider supplied
 * before anything else is hydrated.
 *
 * A rejection there would be unrecoverable. Hydration fails, the app shows its
 * retry screen, retrying deterministically fails again, and the settings screen
 * that could change the name is behind the same gate — so a first-time Google
 * or Apple user whose provider name happens to contain a denylisted term could
 * never enter the app at all.
 *
 * The database is right to refuse; the sign-in path is wrong to treat it as
 * fatal. It falls back to a blank name, which the leaderboard already renders
 * as "Skier" (EC-9). Deliberate renames from the settings screen still surface
 * the refusal, and a direct API write is still refused outright.
 */

const DENYLIST_HINT = "groups.name_rejected"

export function isDenylistedNameError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false
  return (error as { hint?: unknown }).hint === DENYLIST_HINT
}
