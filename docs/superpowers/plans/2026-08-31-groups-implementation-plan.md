# Groups — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-08-31-groups-design.md` — holds every table, RPC signature, return shape, error token and the locking protocol. This plan says what to build and how to know it works; the spec says exactly what it is.
**Reviews:** `docs/groups_findings.md` (round 1), second-round findings folded into the spec; Part 3 and Part 4 review findings folded into the code.
**Date:** 2026-08-31 · **last revised:** 2026-09-03 (Part 4.5 — private groups)

**Goal:** A directory of user-created training groups, each with a leaderboard ranking members by sets logged in the last 7 or 30 days, broken down by discipline. Groups are public (in the directory) by default; a creator may make one **private** — hidden from the directory, joined with a 6-digit code (Part 4.5).

**Approach:** Six parts plus an inserted Part 4.5, built in order. Each is written test-first — the tests describe the behaviour before the thing exists — and ends at a milestone you can check yourself without reading code. Nothing user-visible ships until Part 3; Parts 1 and 2 are verified by running commands. **Parts 1–4 are done; Part 4.5 is next.**

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

## Part 4 — The leaderboard

**Scope reduced (2026-09-01).** Blocking and reporting — the member sheet, the
Block and Report controls, and the blocked-users screen in Settings — are
**deferred indefinitely**, not moved to Part 5. They are a future addition, not
a launch requirement. The Part 1 SQL for them (`block_group_member`,
`list_blocks`, `unblock`, and the symmetric block-filter inside
`fetch_group_leaderboard`) stays in place, dormant: nothing client-side calls
it. Part 5 is now moderation *of names and groups only* — the denylist, the
`report_group` / `report_profile` wiring, policy copy and the runbook.

**Build:** the board page, the 7/30-day toggle, the two-line rows, and Leave.

**First task (decided 2026-09-01):** `fetch_group_leaderboard` gains
`window_start` / `window_end`, returned repeated on every row, and the board
header shows the range. A **drop-and-recreate** in `schema.sql`, since `create
or replace` cannot change a `RETURNS TABLE` shape. The client still only sends a
period and a timezone (D8 untouched); computing the dates in JS was rejected
because the client's window could disagree with the server's (the drift D15
cited). Database tests: the window matches the period and the caller's
timezone, and is present on every row.

**Test first.** Vitest for the pure helpers: window-range formatting (same
month, across months, across a year), and row shaping — server order preserved,
1-based rank, the four discipline numbers with zeros omitted from the second
line and summing to the total, own row marked, an all-zero row reading "no sets
this period".

**Layout.** All five numbers on one line does not fit a 360px phone, and
browser zoom is disabled app-wide, so large-text users have no escape. Hence
two lines. The row is static — with no member sheet there is nothing for it to
open.

**Milestone you can check:** with two accounts in one group, log a slalom set
on one and watch the other's board show that discipline and the total each rise
by one, other columns untouched. Switch to 30 days and see older sets appear,
and the header range widen. Leave as the last member and watch the group
disappear from the directory.

**Part 4 shipped** 2026-09-02, commit `ed7b2b1`. `fetch_group_leaderboard` is
also now `STABLE` (a gated read must share one snapshot between its membership
check and its data query — Part 4 review P1).

---

## Part 4.5 — Private groups

**Inserted 2026-09-03**, before Part 5. Spec: design v3, D26–D28, §6.2–6.4, EC-34–EC-40.

A creator may opt a group out of the directory. It is then hidden from
`list_groups` / `search_groups` and joined with a **6-digit numeric code**
instead. The code is **not access control** (D27): `join_group_by_code` is not
rate-limited, "private" means unlisted not sealed, and the policy copy says so.
The code is shown to **every** member (D28, no owner role) and is fixed for the
group's life.

**Build — schema first, written as real SQL and reviewed before the client:**

- `groups` gains `is_private boolean not null default false` and `join_code
  text`, via `alter table ... add column if not exists`, plus a partial unique
  index on the non-null codes.
- `create_group` — **drop-and-recreate** for the new `p_private` argument.
  When private, generate a unique 6-digit code in a collision-retry loop; set
  `is_private`; return `join_code` in the result.
- `join_group_by_code(p_code text)` — new `security definer`, flag- and
  consent-gated. Look up by code → `groups.invalid_code` on no match; then the
  same lock / post-lock existence check / `insert on conflict do nothing` as
  `join_group`. No attempt counter.
- `join_group(p_group_id)` — refuse a private group with `groups.code_required`.
- `list_groups` / `search_groups` — `where is_private = false` (body edit only;
  parenthesise the block-filter OR chain first). Return shape unchanged — the
  directory has no reason to carry a code, and its rows are all public.
- `list_my_groups` — **drop-and-recreate**: return `is_private` and `join_code`,
  so a member sees the code on the board. The client's shared row mapper
  defaults both fields for the directory RPCs that omit them.

**Test first, both layers:**

- *Direct Postgres:* the code generator produces distinct 6-digit codes across
  many creates; the partial unique index rejects a duplicate; a private group's
  row carries `is_private = true` and a code.
- *Through the API:* `create_group(p_private => true)` returns a code; the group
  is absent from `list_groups` and `search_groups` and unfindable by name;
  `join_group_by_code` joins with the right code and raises `groups.invalid_code`
  with a wrong one; `join_group` on a private id raises `groups.code_required`;
  an unconsented caller is still refused; `list_my_groups` returns the code to a
  member and the board RPC is unaffected.
- *Vitest:* a `joinCode` format guard if any code logic lands in a pure module;
  the client error map gains `groups.invalid_code` / `groups.code_required`.

**Client:**

- `types/groups.ts` — `Group` gains `isPrivate` + `joinCode`; `CreatedGroup`
  gains `joinCode`. Shared mappers read the two new columns.
- `groupsApi.ts` — `createGroup(name, description, isPrivate)`; new
  `joinGroupByCode(code)`.
- `CreateGroupModal` — a "Make this group private" toggle with one line of
  explanation; a private create navigates straight to the board.
- `JoinByCodeModal` — a 6-digit input, reached from a "Join with a code" action
  on the directory; routes through the consent gate on a first join.
- `InviteCodeCard` — on a private group's board, visible to any member: the
  code, a copy button, one line of context.
- `GroupCard` — a "Private" badge on the caller's own private groups.

**Milestone you can check:** with two accounts, create a private group on one —
confirm it is **not** in the other account's directory or search. Read the code
off the board, join with it on the second account, land on the board. A wrong
code is rejected. Leave as the last member and the group is gone.

**Rollout:** no new stage — private groups ship in the same release as the rest,
behind the same flag.

---

## Part 5 — Moderation and policy

**Build:** report flows for groups and profile names (the `report_group` /
`report_profile` RPCs exist and are tested; this wires the controls — the join
modal's Report link and a member-level Report — and their copy), the denylist
seeded and enforced on both surfaces, the policy text in all three places it
appears, the contact address in About, and a written runbook. Blocking and the
blocked-users screen are **not** in Part 5 either — see the note in Part 4.

**Test first.** The database side is already covered in Part 1 — including that an abusive profile name is refused on a direct API write, not just through the settings screen. What is new here is copy and process, so the check is a read-through: confirm the policy names the discipline breakdown explicitly rather than saying "set counts". The breakdown reveals which disciplines someone trains, which is more than a bare total.

**Recommendation:** both stores expect a timely response to reports, and there is deliberately no in-app queue — you read them in the dashboard. Decide before submission what "timely" means and write it down; a daily check with a 24-hour target is defensible, nothing written down is not. Update the store listings' UGC declarations and tell reviewers in the notes where the report controls live.

**Milestone you can check:** report a group from the second account, then find that report in the dashboard with a copy of the group's name and description saved alongside. Delete the group and confirm the report is still there. Try to set an abusive display name and be refused. Read the updated policy in the app and confirm it describes what actually happens.

---

## Part 6 — End-to-end tests and release

**Build:** the two-user end-to-end suite, a 360×800 mobile browser project, then the release.

**Test first.** This part *is* the tests. Every existing spec drives one user, so the harness needs a second user in a second browser context — genuinely new ground, likely slower than it sounds. Playwright currently runs one desktop project at 1280×900, which means the 360px constraint driving the whole row layout has no automated coverage; add the mobile project before writing the specs. Scenarios are Parts 3–5's milestones plus Part 4.5's (create a private group, absent from the other user's directory, joined by code, wrong code rejected), automated.

**Release in four reversible stages,** because shipping working grants before the terms exist would expose create and report to any crafted client — and on native that window is days:

1. Schema deployed with the feature flag **off**; every RPC refuses.
2. Policy, contact address, runbook and denylist live.
3. Client shipped — web and both native builds — still seeing "disabled" and hiding its entry points.
4. Flip the flag. One row, reversible in seconds.

Run the Supabase security advisors and re-check effective grants before stage 4. Sync both native projects before building.

**Milestone you can check:** `npm run e2e` passes including the new suite at both viewports, the database suite and unit tests still pass, and after you flip the flag the feature works on a real phone on both platforms — and stops working when you flip it back.

---

## Sequencing and risk

Part 1 gates everything. Parts 2 and 3 gate 4. Parts 1–4 are done. Part 4.5
(private groups) is a schema + client slice on the same branch, before Part 5.
Part 5 can run alongside 4.5. Part 6 is last.

**Where this is most likely to hurt:**

- **The two-user test harness (Part 6).** Nothing in the repo does this today. Budget more than feels reasonable.
- **The concurrency tests (Part 1).** They need two real database connections. A single-threaded version passes whether or not the bug is fixed, which makes it worse than no test.
- **The profiles trigger (Part 1).** It touches a column two existing code paths already write, including OAuth hydration at sign-in. A mistake here breaks login, not just Groups.
- **Moderation is an ongoing commitment,** not a build task. Everything else ends when it ships; this one does not.

**Deferred on purpose:** blocking and the blocked-users screen (the Part 1 SQL
stays dormant), join-code rotation and any rate limiting on `join_group_by_code`
(D27 — private is a discovery boundary), group logo images, a tutorial step for
Groups, sorting the board by discipline, keyset pagination beyond the 200-row
browse cap, and any in-app moderation queue.
