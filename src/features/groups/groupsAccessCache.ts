import type { GroupsAccess } from "./groupsAccess"

/**
 * The last resolved answer from `groups_status()`, persisted across app
 * launches so the tab bar doesn't render three tabs and then pop in a fourth
 * a moment later on every cold start — it shows last launch's answer for the
 * tab bar immediately, while the real check (kicked off exactly as before)
 * still runs and corrects it within one round trip if anything changed.
 *
 * Deliberately narrower than a real cache: only the tab bar reads this
 * (`GroupsStatusProvider`'s own `showGroupsTab`). `access` itself is
 * untouched and still only resolves once the real answer lands — routes
 * like `GroupsRoute` and the directory page need certainty, not a guess,
 * before rendering or redirecting.
 *
 * Only "full", "wind_down" and "unavailable" are real answers worth
 * remembering — "loading" and "unknown" (a failed check) are never written,
 * so a transient outage can't overwrite the last known-good state.
 */

const KEY = "iskilog:groups-access"

export function readCachedGroupsAccess(): GroupsAccess | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(KEY)
  return raw === "full" || raw === "wind_down" || raw === "unavailable" ? raw : null
}

export function writeCachedGroupsAccess(access: GroupsAccess): void {
  if (typeof window === "undefined") return
  if (access !== "full" && access !== "wind_down" && access !== "unavailable") return
  try {
    window.localStorage.setItem(KEY, access)
  } catch {
    // Storage full or blocked (private mode) — next launch just falls back
    // to the plain loading-then-answer behaviour.
  }
}
