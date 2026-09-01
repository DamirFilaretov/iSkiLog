# Groups — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-08-31-groups-design.md` — holds every table, RPC signature, return shape, error token and the locking protocol. This plan says what to build and how to know it works; the spec says exactly what it is.
**Reviews:** `docs/groups_findings.md` (round 1), second-round findings folded into spec v3.
**Date:** 2026-08-31

**Goal:** A public directory of user-created training groups, each with a leaderboard ranking members by sets logged in the last 7 or 30 days, broken down by discipline.

**Approach:** Six parts, built in order. Each is written test-first — the tests describe the behaviour before the thing exists — and ends at a milestone you can check yourself without reading code. Nothing user-visible ships until Part 3; Parts 1 and 2 are verified by running commands.

**Why this order:** Groups is the first cross-user feature in the app. Everything today is locked to "your data, only yours", so the security boundary goes first. Each later part depends only on parts before it.

---

## Global constraints

- **No Groups table is reachable from the client. No exceptions.** All privileges revoked from `anon` and `authenticated`; RLS enabled underneath as a second layer. No table carries a policy, because none carries a grant.
- Database functions are `security invoker` by default. `security definer` only where a function must read rows the caller does not own — the spec lists exactly which.
- Every function has an empty search path, fully qualified relations, and `EXECUTE` granted only to `authenticated`.
- No `auth.users` UUID ever reaches the client. Members, blocks and reports are addressed by opaque handles.
- The client branches on stable `hint` tokens, never on SQLSTATE. One SQLSTATE covers several distinct failures.
- Name 2–40 chars, description ≤ 200, profile name ≤ 60, report reason truncated at 500.
- Quota: 10 live groups per creator; 5 per hour counted from an append-only log that is never deleted.
- Periods are exactly `7d` and `30d`, resolved on the server from the caller's timezone.
- Feature ships behind `app_settings.groups_enabled`, which doubles as a kill switch.
- Handled user-facing failures report to Sentry via `captureHandledException`. Group mutations are never auto-retried; ambiguous creates reconcile instead.
- `schema.sql` is re-applied on every E2E run — everything must be re-runnable. This repo has no Supabase CLI migration directory.
- `CACHE_VERSION` does not change. Groups is never cached, so no existing user's data is invalidated.

---

## Non-negotiables from review

These are why the design looks the way it does. If a part seems over-built, this is the reason.

1. **The leaderboard takes a period, never dates.** Accepting start and end dates lets any member ask about a single day and learn who trained which discipline on it; 365 cheap calls reconstruct a year of everyone's schedule.
2. **Group deletion must be serialised.** Without a per-group lock, two members leaving at the same moment each still see the other's uncommitted row, so neither deletes the group. It survives with zero members, in the public directory, forever.
3. **Grants are the real boundary, not RLS.** Supabase exposes tables over its API, so any granted permission is a public endpoint, and RLS filters rows rather than columns.
4. **Reports must outlive what they describe.** Tie a report to a group by cascade and an abuser deletes the evidence by leaving as the last member.
5. **Consent must be re-taken, and recorded.** Email sign-up already requires a policy checkbox and OAuth users get a gate — nobody escaped consent. The defect is that *what* they agreed to was never recorded, so an unversioned flag passes everyone forever on terms that said there were no social features.
6. **Profile names are the other UGC surface.** Filtering only group names is trivially bypassed: set an abusive display name and it publishes to every shared board. Filtering belongs in the database, on every write, because two existing code paths write that column directly.
7. **The rate limit cannot count live rows.** Create a group, leave as sole member, and the reap trigger erases the evidence — the hourly count never rises. It counts an append-only log instead.
8. **A browse cap is not a directory.** Capping at 200 without search makes group 201 invisible *and* unfindable, and lets padding bury legitimate groups. Browse shows what is popular; server-side search reaches everything.

---

## Part 1 — Database foundation and security boundary

**Build:** eight tables, three helpers, two triggers, and the RPCs that are the only way in or out. Privilege revocation, RLS, the profile-name normalise-and-filter trigger, the creation log, the feature flag, and the index the leaderboard needs.

**Test first, in two layers** — they answer different questions and neither substitutes for the other:

- *Direct Postgres,* for locks, triggers, concurrency and catalogue facts. Race tests need two real connections; a single-threaded version passes whether or not the bug exists.
- *Through the API with real user sessions,* for grants, JWT handling, and the exact error shape the client will branch on. A SQL test can show a function raising the right hint while the real endpoint returns something else entirely.

Cover, before writing any SQL: direct reads and writes of all eight tables fail; every RPC is unreachable anonymously, asserted through the API rather than by expecting an internal error code; a non-member is refused a leaderboard; consent cannot be bypassed by a crafted call with the screen out of the picture; only the two periods and valid timezones are accepted; no response contains an auth UUID; profile-name filtering holds on a direct API write and an OAuth-shaped write; two members leaving at once leave no orphan; two creates at the quota edge produce ten not eleven; create-leave-repeat still trips the hourly limit; flipping the flag off makes every mutating RPC refuse; and a catalogue sweep proving no anonymous execute, no table grants, and `definer` only on the listed functions.

**Note:** `npm run test` only looks at `src/`, so this needs its own runner config and script. `pg` and `dotenv` are already dependencies.

**Milestone you can check:** run the new database test command and watch the suite pass. Run `npm run e2e:db:prepare` twice in a row — it must succeed both times. Then, using an authenticated test client, create a group *through the RPC* and confirm in the Supabase dashboard that the group and its creator-membership both exist — do **not** insert one by hand, which skips normalisation, quota, consent and membership, and leaves an orphan that could not exist through the real API. Finally, confirm from the API playground as a normal user that you cannot read any Groups table. Nothing has changed in the app yet.

---

## Part 2 — Client data layer

**Build:** the TypeScript types, the API modules, the hint-token to message mapping, and three small pure helpers — period label, group-name validation mirroring the server, and the initials-avatar generator.

**Test first.** Unit tests for the pure helpers and the error mapping: label text for both periods, name trimming and length bounds, initials from one-word and multi-word names, the same name always producing the same colour, and every hint token resolving to its intended user-facing outcome. The API modules are covered by Part 1 and Part 6; don't mock Supabase to test them twice.

**Recommendation:** keep client-side name validation clearly non-authoritative. JavaScript and Postgres count characters differently, so an emoji-heavy name can pass one and fail the other. The client gives fast feedback; the server decides, and its message is what the user sees. Likewise the client must never hold its own copy of the policy version or the feature flag — it asks the server.

**Milestone you can check:** `npm run test:run` passes with the new unit tests, and `npm run build` succeeds. Still nothing visible in the app.

---

## Part 3 — Directory, creating, joining, and navigation

**Build:** the Groups tab, the routes, the directory with browse and server-side search, empty and error states, the create and join modals, and the consent screen shown before a user's first create or join.

**Test first.** There is no component-test harness in this repo — no testing-library, no jsdom, no vitest DOM environment. Rather than introduce a DOM stack where none exists, keep pure view-model logic in vitest (filter and sort behaviour, the reconcile decision, hint-to-state mapping) and put anything needing a rendered page into Playwright in Part 6.

**Three things to get right:**

- The tab bar uses fixed-width buttons; four overflow a normal phone, so they must become flexible. The route-matching list that shows the bar needs the new path too, or the bar vanishes on Groups pages.
- Take consent at the first create or join, not app-wide at launch. Re-gating everyone on upgrade is hostile, and consent at the moment of actual sharing is the cleaner position. The database enforces it regardless of the screen.
- On a duplicate name, reconcile **only when the caller is currently a member** of that group. Having created it is not enough — there are no owners, so a creator who left while others stayed would be sent to a board they cannot read. Otherwise open the ordinary join modal.

**Milestone you can check:** open the app, see a fourth tab, tap it. Create a group. Search for a group by name and find it. Sign in as a second account elsewhere, find that group, get shown the consent screen, accept, and join. The leaderboard is not built yet, so joining lands on a placeholder.

---

## Part 4 — The leaderboard and blocking

**Build:** the board page, the 7/30-day toggle, the two-line rows, the member sheet holding Block and Report, Leave, and the blocked-users screen in Settings.

**Test first.** Vitest for row shaping: ranked by total descending, ties by name, members with nothing at the bottom, your own row marked, the four discipline numbers summing to the total, zeros omitted from the second line.

**The blocked-users screen is required, not a nicety.** Blocking is mutual, so the moment you block someone they disappear from every board — including the row you would have unblocked them from. Without a dedicated screen, blocking is irreversible.

**Recommendation on layout.** All five numbers on one line does not fit a 360px phone once the row needs a tappable control, and browser zoom is disabled app-wide, so large-text users have no escape. Hence two lines, with the whole row as the touch target. Keep it that way even when it looks roomy on a big phone.

**Milestone you can check:** with two accounts in one group, log a slalom set on one and watch the other's board show that discipline and the total each rise by one, other columns untouched. Switch to 30 days and see older sets appear. Block the other member; confirm they vanish from your board and you from theirs, then undo it from the blocked-users screen. Leave as the last member and watch the group disappear from the directory.

---

## Part 5 — Moderation and policy

**Build:** report flows for groups and profile names, the denylist seeded and enforced on both surfaces, the policy text in all three places it appears, the contact address in About, and a written runbook.

**Test first.** The database side is already covered in Part 1 — including that an abusive profile name is refused on a direct API write, not just through the settings screen. What is new here is copy and process, so the check is a read-through: confirm the policy names the discipline breakdown explicitly rather than saying "set counts". The breakdown reveals which disciplines someone trains, which is more than a bare total.

**Recommendation:** both stores expect a timely response to reports, and there is deliberately no in-app queue — you read them in the dashboard. Decide before submission what "timely" means and write it down; a daily check with a 24-hour target is defensible, nothing written down is not. Update the store listings' UGC declarations and tell reviewers in the notes where the report and block controls live.

**Milestone you can check:** report a group from the second account, then find that report in the dashboard with a copy of the group's name and description saved alongside. Delete the group and confirm the report is still there. Try to set an abusive display name and be refused. Read the updated policy in the app and confirm it describes what actually happens.

---

## Part 6 — End-to-end tests and release

**Build:** the two-user end-to-end suite, a 360×800 mobile browser project, then the release.

**Test first.** This part *is* the tests. Every existing spec drives one user, so the harness needs a second user in a second browser context — genuinely new ground, likely slower than it sounds. Playwright currently runs one desktop project at 1280×900, which means the 360px constraint driving the whole row layout has no automated coverage; add the mobile project before writing the specs. Scenarios are Parts 3–5's milestones, automated.

**Release in four reversible stages,** because shipping working grants before the terms exist would expose create and report to any crafted client — and on native that window is days:

1. Schema deployed with the feature flag **off**; every RPC refuses.
2. Policy, contact address, runbook and denylist live.
3. Client shipped — web and both native builds — still seeing "disabled" and hiding its entry points.
4. Flip the flag. One row, reversible in seconds.

Run the Supabase security advisors and re-check effective grants before stage 4. Sync both native projects before building.

**Milestone you can check:** `npm run e2e` passes including the new suite at both viewports, the database suite and unit tests still pass, and after you flip the flag the feature works on a real phone on both platforms — and stops working when you flip it back.

---

## Sequencing and risk

Part 1 gates everything. Parts 2 and 3 gate 4. Part 5 can run alongside 4. Part 6 is last.

**Where this is most likely to hurt:**

- **The two-user test harness (Part 6).** Nothing in the repo does this today. Budget more than feels reasonable.
- **The concurrency tests (Part 1).** They need two real database connections. A single-threaded version passes whether or not the bug is fixed, which makes it worse than no test.
- **The profiles trigger (Part 1).** It touches a column two existing code paths already write, including OAuth hydration at sign-in. A mistake here breaks login, not just Groups.
- **Moderation is an ongoing commitment,** not a build task. Everything else ends when it ships; this one does not.

**Deferred on purpose:** group logo images, a tutorial step for Groups, sorting the board by discipline, keyset pagination beyond the 200-row browse cap, and any in-app moderation queue.
