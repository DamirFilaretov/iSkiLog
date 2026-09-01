---
title: "2026-09-01 — Groups: design, plan and database foundation"
date: 2026-09-01
tags:
  - session
  - groups
  - database
  - security
  - tdd
---

# 2026-09-01 — Groups: design, plan and database foundation

Designed the **Groups** feature, hardened it through two external reviews, and built and verified its entire server-side security boundary. Branch `feature/groups-workflow`. Nothing user-visible yet.

## What Groups is

A public directory of user-created training groups, each with a leaderboard ranking members by sets logged in the last 7 or 30 days, broken down by discipline. Spec: `docs/superpowers/specs/2026-08-31-groups-design.md`. Plan: `docs/superpowers/plans/2026-08-31-groups-implementation-plan.md` (six parts; this session completed Part 1).

> [!important] Why this feature is different
> Every existing table is locked to `auth.uid() = user_id`. Groups is the **first cross-user feature in the app**, so nearly all the risk is in breaking that assumption safely. See [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]].

## Delivered

Eight tables, three helpers, two triggers, 21 functions, all privileges revoked, RLS on everywhere, `groups_enabled` shipped `false`. 119 database tests across a new two-layer harness (`npm run test:db`).

Two existing-table changes: `profiles.full_name` gained normalisation, a denylist filter and a 60-char constraint; `sets` gained `idx_sets_user_id_date`.

## What the tests caught that review had not

Three defects were found by tests **failing first**, not by reading code:

- All 16 table privileges were granted to `anon` and `authenticated` by default — a signed-in client could read *and insert* into `groups`.
- A denylisted display name written straight through the API succeeded, bypassing the group-name filter entirely.
- An abusive group *description* published to every user; only the name was filtered.

Two concurrency mechanisms were proven by **removing them and watching the test fail** — see [[a-concurrency-test-must-be-proven-by-removing-the-lock]].

## Reviews

Three rounds, all external agents. Round 1 (spec) and round 2 (plan) are recorded in the spec's revision history. Round 3 reviewed the implementation: 6 of 7 findings were real and fixed in `06d9892`.

Round 3's sharpest catches were both about tests that did not test what they claimed: the quota race test passed with its lock removed, and the "at most 200 rows" assertion was vacuous on a 50-row database.

## Notable decisions

- Server resolves the leaderboard window from a period enum plus a timezone — the client cannot send dates. Accepting them would let any member probe a single day and enumerate who trained when.
- The hourly creation limit counts an **append-only log**, not live rows: create-then-leave reaps the group and would otherwise erase the evidence.
- Reports snapshot the offending text and never cascade, so leaving as the last member cannot destroy moderation evidence.
- `security invoker` is the default; `definer` only where a cross-user read requires it.
- Consent is versioned and server-owned. Nobody escaped consent previously — email sign-up requires the checkbox at `Auth.tsx:108` — but *what* was agreed to was never recorded.

## Verification

`npm run test:db` 119/119 (twice, no pollution) · `npm run e2e:db:prepare` succeeds twice consecutively · `npm run test:run` 56/56 unchanged.

## Scope

All changes are on the **local Docker Supabase only**. The hosted project is untouched and stays that way until the staged release in Parts 5–6: schema with the flag off → policy and moderation live → client shipped → flip one row.

## Follow-ups

- [ ] Part 2 — client data layer (types, API modules, hint-token mapping, pure helpers)
- [ ] `auth.spec.ts` "flow 2" fails on `main` too: `logoutUser` waits for a Settings heading that `Settings.tsx` does not have. Will block Part 6.
- [ ] No component-test harness exists (no jsdom / testing-library) and Playwright runs only desktop 1280×900, while the leaderboard row layout is driven by a 360px constraint.
- [ ] Branch carries eight pre-existing non-Groups commits (tutorial, OAuth, safe-area, event visuals). Accepted for now.

## Documentation impact

- New: [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]], [[a-concurrency-test-must-be-proven-by-removing-the-lock]]
- Updated: [[current_priorities]]
