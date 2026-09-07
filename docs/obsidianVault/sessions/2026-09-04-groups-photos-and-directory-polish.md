---
title: "2026-09-04 — Groups: real photos, directory redesign, two perf fixes"
date: 2026-09-04
tags:
  - session
  - groups
  - design
  - performance
---

# 2026-09-04 — Groups: real photos, directory redesign, two perf fixes

Branch `feature/groups-workflow`, pushed to `origin` for the first time this
session (`dc059f1..04d9731`). PR #45 picks up all of it.

## Group photos (D10 superseded)

Turned the dormant `logo_key` field into a real feature end to end: a public
`group-logos` Storage bucket + RLS, `create_group`'s new `p_logo_key` param
(server-revalidates the same folder-ownership prefix the storage policy
enforces), a plain-`<input type="file">` picker in `CreateGroupModal` (no
cropper, no Capacitor Camera plugin — Capacitor's webview already routes a
file input to the native picker), and `GroupAvatar` rendering the photo (with
an `onError` fallback to initials) as a true circle everywhere. See
[[groups-ship-with-real-photos]].

Raised and explicitly **not built**: letting the creator edit the group's
name/photo after creation. Runs straight into [[groups-have-no-owner-or-admin-role|D4]]
— it would be the first privileged role in a system built flat, and the
"what happens when the creator leaves" question has no answer yet. New note
written for D4 since it kept coming up with no note of its own.

## Groups directory + create-modal redesign

A long iterative design pass on `Groups.tsx` and `CreateGroupModal.tsx`,
steered turn-by-turn rather than planned upfront:

- **Create-group modal**: went from a centered dialog with a title+subtitle,
  through a top-nav-bar variant (back/title/next), back to the original
  bottom Create/Cancel buttons — landed on: no title/heading at all, avatar+
  name and description as bordered `bg-slate-50` cards (matching the app's
  existing subtle-card idiom), full-width Create/Cancel at the bottom.
- **Directory header**: reviewed an external UI-critique against this app's
  *actual* conventions (checked `HistoryItem`, `TricksLibrary`,
  `SeasonSettings` headers directly) rather than taking the critique's
  Strava/Garmin-style suggestions at face value — kept the app's own
  `rounded-2xl`/`shadow-sm` card idiom for Discover/Your-groups instead of
  switching to a divider-list style nothing else in the app uses. `GroupCard`
  now matches `HistoryItem`'s card treatment exactly.
- **Create group / Join with a code**: iterated through page-header buttons,
  equal-size buttons, buttons moved under "Your groups" — landed on a single
  floating combined button (`GroupsFab.tsx`, new): collapsed is a plain "+"
  circle, hides on scroll-down / shows on scroll-up, tap expands to reveal
  both actions. First scroll-reactive FAB pattern in the app (the only prior
  fixed-bottom precedent, `SaveSetButton`, is a static bar).
- Search bar moved to sit flush after `pt-safe` with zero extra margin,
  matching the exact zero-top-margin convention `Home`/`Insights`/`Settings`
  already use for their first content block.
- `GroupLeaderboard` header: name centered via a fixed `60px / 1fr / 60px`
  grid (not just `flex-1` — a plain size bump on the avatar would've pushed
  the name off-center again), avatar enlarged to 60px, the private-group
  lock icon moved to the card's far edge and enlarged, the period toggle and
  date-range label put on one row.
- A neutral grey pulse now stands in for `GroupAvatar` while the group's
  name/photo are still loading, instead of the colour-and-initials fallback
  flashing before the real photo arrives (that fallback is for "no photo",
  not "don't know yet").

Each of these went through several rounds of "make it bigger" / "put it
back" / "combine them" rather than landing right the first time — normal for
a pure design-feel pass with no spec, not logged as a mistake.

## Two "why does this feel slow" fixes

Both diagnosed by walking the user through *why*, not just applying a fix:

- **Directory skeleton flash on every tab switch.** `Groups.tsx` refetches
  on every mount (D15) while Home/Insights/Settings read from
  `SetsProvider`, hydrated once above the router — Groups was never wired
  that way. Fix: stale-while-revalidate scoped to the directory only, since
  D15's actual justification (leaderboard period staleness) doesn't apply to
  a plain membership/browse list. See
  [[the-directory-shows-a-stale-snapshot-before-revalidating]].
- **Groups tab popping into the nav bar ~500ms after every cold start.**
  `showsGroupsTab("loading")` is `false` by design (fail-closed for a
  failed check) — but that rule was also eating the ordinary "haven't heard
  back yet" case, universal on every launch. Fix: a `showGroupsTab` value
  that falls back to last launch's cached answer while `access` itself
  keeps waiting for certainty, since `GroupsRoute` has its own stricter
  documented reason not to guess. See
  [[the-tab-bar-guesses-from-last-launch-while-access-waits]].

## Committing someone else's concurrent work

Mid-session, `git status` surfaced a second, unrelated body of uncommitted
work already sitting in the tree — not from this conversation, no context on
its authorship. Reviewed each diff before touching anything, left it alone
until asked, then split it into focused commits once asked to commit it:
leaderboard visual polish (medal rank badges, tie-aware competition ranking
with a new test, blue-filled toggle/invite-card), a full privacy-policy
rewrite (`policy.html` + `policyDocument.ts`, new Groups section),
`BlockedMembersList` moved into its own modal + `PrivacySecurity` copy/icon
updates, expanded local seed data (4 more demo users so the leaderboard has
a real field) plus a `groups:logo` dev script, and one tiny `TricksLibrary`
label cleanup. Verified `tsc` + the full unit suite against all of it
together before splitting into commits.

## Commits (this session, in order)

`4181ade` group photos + first redesign pass · `28b2984` skeleton-flash +
tab-pop-in fixes · `5e5bb55` leaderboard polish (not authored here) ·
`f87092b` policy rewrite (not authored here) · `36de45e` blocked-members
modal (not authored here) · `6da5b59` seed data (not authored here) ·
`04d9731` TricksLibrary label (not authored here).

## Verification

`npx tsc --noEmit` and `npm run test:run` (185/185) run after essentially
every change in this session, including once against the full combined tree
before the final round of commits. `npx supabase db reset` +
`npm run test:db` (161/161) run after the storage migration, including a
re-run after fixing a non-idempotent `create policy` (needed
`drop policy if exists` first — caught by the DB suite's re-apply check).

## Update — 2026-09-04, later same day

`20260904172428_group_logo_storage.sql` **pushed to the hosted Supabase
project** (`supabase db push`, confirmed by `supabase migration list`
showing local/remote in sync). Held off initially since it's a write to
shared production infrastructure — pushed once the user explicitly asked
for it in a follow-up. Post-push security advisor check: no new findings —
everything listed is the same pre-existing, already-documented set (RLS-
enabled-no-policy on the Groups tables, `SECURITY DEFINER` warnings across
every Groups RPC, the 3 pre-existing invoker functions with mutable
`search_path`, leaked-password-protection). `create_group` now shows its
4-arg signature live. The Vercel preview for this branch can now actually
create a group with a photo.

## Not done

- Creator-editable name/photo — see above, needs its own decision on the
  "creator leaves" question first.

## Documentation impact

- New: this note, [[groups-ship-with-real-photos]],
  [[groups-have-no-owner-or-admin-role]],
  [[the-directory-shows-a-stale-snapshot-before-revalidating]],
  [[the-tab-bar-guesses-from-last-launch-while-access-waits]]
- Updated: [[a-private-group-is-hidden-not-sealed]] (new Related link),
  [[current_priorities]], [[index]]
