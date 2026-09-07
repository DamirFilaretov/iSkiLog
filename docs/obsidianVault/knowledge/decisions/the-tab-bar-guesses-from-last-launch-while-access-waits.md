---
title: The tab bar guesses from last launch while access waits (fail-closed narrowed)
date: 2026-09-04
tags:
  - decision
  - groups
  - performance
status: active
---

# The tab bar guesses from last launch while access waits

> [!info] Narrows a fail-closed rule, only for the nav icon
> `showsGroupsTab("loading")` returning `false` was a deliberate "fail
> closed is right for a chrome element that renders on every screen" choice.
> `GroupsRoute`'s stricter twin — "while the answer is still in flight
> nothing is rendered: redirecting first would bounce a legitimate deep
> link, rendering first would flash a screen the user may not be allowed to
> see" — is untouched by this. Only the tab bar takes the shortcut; the
> route guard and the directory page still wait for a certain answer.

## The problem

`GroupsStatusProvider` starts every app launch with `loading = true`, so
`access` is `"loading"` and `showsGroupsTab("loading")` is `false` — three
tabs render, and Groups pops in a moment later once `groups_status()`
resolves. Universal on every cold start, unlike the rare failed-check case
the fail-closed rule was actually guarding against.

## The fix

Two layers, both in `showsGroupsTabNow(access, cachedAccess)`
(`src/features/groups/groupsAccess.ts`), which `GroupsStatusProvider`
exposes as `showGroupsTab` — separate from `access`:

1. **Optimistic while loading.** With the check in flight the tab shows
   unless the last resolved answer was a definite `"unavailable"`. A fresh
   install, or a new login (sign-out runs `clearAppLocalCaches()` and wipes
   the cache), has *no* cached answer — the earlier cache-only fix did
   nothing for it, so every first launch still popped the tab in. Showing
   three tabs then a fourth is worse than the opposite mistake, which is
   bounded to the loading window and server-enforced anyway (see
   Consequences).
2. **Cached last-launch answer.** `groupsAccessCache.ts` persists the last
   **resolved** answer (`"full"` / `"wind_down"` / `"unavailable"` — never
   `"loading"` or a failed check) to `localStorage` (`iskilog:` prefixed,
   so `clearAppLocalCaches()` covers it on sign-out). This only narrows
   layer 1: a user Groups is genuinely off for, who has launched before,
   never even flashes the tab.

The moment the real answer lands, `access` is no longer `"loading"` and
`showsGroupsTabNow` is exactly `showsGroupsTab(access)`; the cache refreshes.
`access` itself is computed exactly as before — nothing downstream of it
(`GroupsRoute`, `Groups.tsx`) changed. `BottomTabBar` reads `showGroupsTab`
directly instead of computing `showsGroupsTab(access)` itself.

## Consequences

- If the kill switch is flipped off while the app is closed, the tab can
  show for a moment on the next launch before self-correcting — bounded to
  the same latency the loading window always had. Cosmetic only:
  `create_group` / `join_group` still check `groups_enabled()` server-side
  regardless of what the tab bar shows, so nothing is actually reachable
  that shouldn't be.
- Same flash for a brand-new user (no cache) for whom Groups turns out to
  be off and who is in no group: the tab shows for the ~one round trip the
  check takes, then disappears. Accepted for the same reason — the server
  gates the actions, and with the flag on this state does not occur.

## Related

- [[the-kill-switch-stops-spread-not-escape]]
- [[the-directory-shows-a-stale-snapshot-before-revalidating]]
