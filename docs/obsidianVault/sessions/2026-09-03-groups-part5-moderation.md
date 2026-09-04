---
title: "2026-09-03 — Groups Part 5: moderation, policy, hardening (pushed)"
date: 2026-09-03
tags:
  - session
  - groups
  - database
  - frontend
  - moderation
  - tdd
---

# 2026-09-03 — Groups Part 5: moderation, policy, hardening

Built and **pushed to production** the whole of Part 5. Branch
`feature/groups-workflow`, commits `a200641` → `856e181`. `supabase db push`
2026-09-03: `20260903175342` + `20260903194544` + `20260903195701` — all live,
`groups_enabled = 'false'`.

## The scope reversal

Part 5 was "moderation of names and groups only, no blocking"
([[blocking-and-reporting-are-deferred]]). The user's call this session: Groups
ships in the **native App Store / Play builds**, which require in-app report
*and* block for UGC. So blocking + reporting came **back in**
([[groups-ships-with-report-and-block]]). Cheap, because the Part 1 SQL for all
of it was kept dormant — Part 5 is UI wiring + copy + two migrations, no new RPC.

Also cut: an early plan to *delete* reporting entirely. Talked through with the
user — reporting is a store-review requirement once Groups is native, not a
nice-to-have, so removing it would just mean rebuilding under App Review pressure.

## Delivered

| Area | What |
|---|---|
| `20260903194544_groups_part5_denylist.sql` | `normalise_profile_name` → `contains_denylisted_term` (literal, case-insensitive; the old `LIKE` never lowercased the term and `%`/`_` were wildcards). Seed **6** terms *before* a trigger-safe CTE backfill, so a first production run cleans existing names, not only re-runs. |
| `20260903195701_groups_part5_hardening.sql` | `ALTER FUNCTION ... SET search_path` on `create/update_set_with_subtype` (no body restated); `revoke execute ... from anon, public` on both (`authenticated` keeps its grant); `join_code` from `extensions.gen_random_bytes` via `groups_new_join_code()`; `list_groups`/`search_groups`/`list_my_groups` → `STABLE`. |
| `ReportDialog`, `MemberActionSheet`, `BlockedMembersList` | new components |
| `GroupJoinModal` / `Groups.tsx` | "Report this group" → `reportGroup` |
| `LeaderboardRow` / `GroupLeaderboard.tsx` | non-self rows are buttons → sheet (Report / Block); block refetches |
| `PrivacySecurity.tsx` | blocked-members list (`list_blocks` / `unblock`) + a Groups data-sharing blurb |
| `GroupsConsentGate` | "Agree and continue" + a Terms of Service link (PolicyModal on native) |
| `public/policy.html` | dropped "no social features"; Groups + moderation section naming the event-type breakdown; reconciled "no third-party sharing" vs Groups; corrected "shown to members" (directory is all signed-in users) |
| `About.tsx` | "Report abuse" contact |
| `docs/groups-moderation-runbook.md` | daily check, one-business-day target, takedown, blocklist maintenance, store-submission notes |

## The denylist seed — reviewed down to 6

First draft was 13. Two external review rounds caught substring false positives:
`spic`→"Spice", `coon`→"Raccoon", `rapist`→"Therapist", `kike`→the name "Kike",
`chink`→"a chink in", `retard`→"retardant". Final seed:
`nigger, nigga, faggot, wetback, pedophile, paedophile` — no plausible English
substring collision in club names. The maintainer expands it in the dashboard.

## What the reviews caught (and how it was handled)

- **First-run backfill gap** — seed was *after* the backfill, so a prod first-run
  would not clean an existing abusive name. Fixed: seed first. Test runs the
  migration file directly against a pre-planted row (can't use
  `applyFeatureMigrations` — it re-runs the immutable foundation backfill, which
  aborts on a planted denylisted row).
- **`revoke ... from anon` was not enough** — `anon` also held EXECUTE via
  `PUBLIC`. Needed `from anon, public`. Caught by a failing test.
- **Private-group copy still said "hidden from the directory"** (v3), contradicting
  the shipped v4 "discoverable with a lock" and the new policy text. Fixed
  `CreateGroupModal` ×2, `InviteCodeCard`, `types/groups.ts`.
- **No non-member discovery test** — added one: an unrelated user sees the private
  group (`is_private` true, `is_member` false, no `join_code`) and `join_group`
  by id → `groups.code_required`.
- **Stale docs** — plan/spec still described "hidden" private groups; a stray NUL
  byte made `rg` treat the spec as binary. Both fixed. Also corrected the earlier
  false claim that `20260903175342` was already on prod — it was not until this
  push.

## Post-push verification

`groups_enabled = 'false'` · 6 `moderation_terms` · **0** production profiles match
the denylist · `anon` cannot execute the set RPCs, `authenticated` can ·
`search_path` pinned · `list_*` STABLE · `create_group` uses the CSPRNG helper.

`get_advisors` (security): no new actionable findings. `rls_enabled_no_policy`
(INFO) is the RPC-only design (D25). `authenticated_security_definer_function_executable`
(WARN, new lint 0029) flags every Groups RPC + the two set RPCs — the deliberate
SECURITY DEFINER architecture, each with its own `auth.uid()` guard.
`function_search_path_mutable` remains on three **invoker** functions
(`set_updated_at`, `fetch_sets_hydrated`, `set_active_season_atomic`) — pre-existing,
lower risk, queued. `auth_leaked_password_protection` — pre-existing dashboard toggle.

## Verification

`npm run test:db` 161/161 (seeded and `--no-seed`) · `npm run test:run` 184/184 ·
`tsc` + `npm run build` clean · `npx supabase db reset` clean twice.

## Follow-ups

- [ ] Part 6: two-user E2E for report / block / unblock; `groups.spec.ts` at
  360×800; `npx cap sync` both platforms; then flip `groups_enabled`.
- [ ] `git push feature/groups-workflow` — deferred by the user this session.
- [ ] Pin `search_path` on `set_updated_at` / `fetch_sets_hydrated` /
  `set_active_season_atomic` (invoker, low priority).
- [ ] Enable Auth leaked-password protection in the dashboard.
- [ ] `moderation_terms` is a starter set — expect to expand it once real names
  come through.

## Documentation impact

- New: [[groups-ships-with-report-and-block]], `docs/groups-moderation-runbook.md`,
  `docs/superpowers/plans/2026-09-03-groups-part5-moderation.md`
- Updated: spec → v5, the 6-part plan (Part 5), [[current_priorities]], [[index]],
  [[blocking-and-reporting-are-deferred]] (marked superseded)
