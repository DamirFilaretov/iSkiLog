# Groups — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-08-31-groups-design.md`
**Review findings:** `docs/groups_findings.md`
**Date:** 2026-08-31

**Goal:** A public directory of user-created training groups, each with a leaderboard ranking members by sets logged in the last 7 or 30 days, broken down by discipline.

**Approach:** Six parts, built in order. Each part is written test-first — the tests describe the behaviour before the thing exists — and ends at a milestone you can check yourself without reading code. Nothing user-visible ships until Part 3; Parts 1 and 2 are verified by running commands.

**Why this order:** Groups is the first cross-user feature in the app. Everything today is locked to "your data, only yours", so the security boundary is the risky part and it goes first. Each later part depends only on parts before it.

---

## Global constraints

Copied from the spec; every part inherits them.

- No Groups table is reachable from the client except `user_blocks`. All privileges revoked from `anon` and `authenticated` elsewhere; RLS enabled behind that as a second layer.
- Every database function is `security definer` with an empty search path, and executable only by `authenticated` — never `public` or `anon`.
- Every policy statement is preceded by a drop. `schema.sql` is re-applied on every E2E run, so anything not re-runnable breaks the second run.
- No `auth.users` UUID is ever returned to a client.
- Name 2–40 chars, description ≤ 200, profile name ≤ 60, report reason truncated at 500.
- Quota: 10 live groups per creator, 5 per hour, directory capped at 200.
- Periods are exactly `7d` and `30d`, resolved on the server from the caller's timezone.
- Error codes are fixed: `23505` duplicate name, `22023` validation, `42501` not a member or unconsented, `P0002` group missing, `28000` unauthenticated.
- Set CRUD still goes through its existing RPCs; nothing here touches that path.
- `CACHE_VERSION` does not change — Groups is never cached, so no existing user's data is invalidated.

---

## Non-negotiables from the review

These came out of `groups_findings.md` and are the reason the design looks the way it does. If a part seems over-built, this is why.

1. **The leaderboard takes a period, never dates.** Accepting start and end dates from the client lets any member ask about a single day and learn who trained which discipline on it — 365 cheap calls reconstruct a year of everyone's schedule. The client sends `7d` or `30d` and its timezone; the server computes the window.
2. **Group deletion must be serialised.** Without a per-group lock, two members leaving at the same moment each still see the other's uncommitted row, so neither deletes the group. It survives with zero members, in the public directory, forever — no future leave will ever fire the cleanup again.
3. **Grants are the real boundary, not RLS.** Supabase exposes tables over its API, so any granted permission is a public endpoint. RLS filters rows, not columns, so even a read-only policy on the groups table would leak the creator's user ID for every group.
4. **Reports must outlive what they describe.** If a report is tied to a group by cascade, an abuser can delete the evidence by leaving as the last member. Reports keep a copy of the offending text.
5. **Consent must be re-taken.** The existing policy gate checks an unversioned flag, so every current user would pass without ever seeing the new terms — and it only ever ran for Google and Apple users, so email sign-ups have never seen it at all.
6. **The profile name is about to become public.** It has no length limit today because it was only ever shown to its owner.

---

## Part 1 — Database foundation and security boundary

**Build:** the six tables, two helpers, the cleanup trigger, and the ten RPCs that are the only way in or out. Privilege revocation and RLS. The profile-name length limit and the index the leaderboard needs.

**Test first.** Write database-level tests that connect as real anonymous and signed-in users, not through the UI — a permission hole can leak data while every screen test passes, because the app never tries the forbidden request. Cover, before writing any SQL:

- Direct reads and writes of every Groups table fail for a signed-in user.
- Every RPC fails for an anonymous caller.
- A non-member asking for a leaderboard is refused.
- Only `7d` and `30d` are accepted; an unknown timezone is rejected.
- Two members leaving simultaneously, on two real connections, leave no orphaned group.
- A report survives the deletion of the group it describes.
- Names differing only by case or spacing collide.
- A permissions sweep over the system catalogue: no function executable by anonymous or public, no table permissions outside `user_blocks`.

**Note:** `npm run test` only looks at `src/`, so this suite needs its own runner config and script. `pg` and `dotenv` are already dependencies.

**Milestone you can check:** run the new database test command and watch roughly forty tests pass. Then run `npm run e2e:db:prepare` twice in a row — it must succeed both times. Then, in the Supabase dashboard, create a group by hand and confirm you cannot read the groups table from the API playground as a normal user. Nothing has changed in the app yet.

---

## Part 2 — Client data layer

**Build:** the TypeScript types, the API modules that call the RPCs, and three small pure helpers — period-to-label, group-name validation mirroring the server, and the initials-avatar generator.

**Test first.** Unit tests for the pure helpers only: label text for both periods, name trimming and length bounds, initials from one-word and multi-word names, and the same name always producing the same avatar colour. The API modules are covered by Part 1's database tests and by Part 6's end-to-end tests; don't mock Supabase to test them twice.

**Recommendation:** keep the client's name validation clearly non-authoritative. JavaScript and Postgres count characters differently, so an emoji-heavy name can pass one and fail the other. The client gives fast feedback; the server decides, and its message is what the user sees.

**Milestone you can check:** `npm run test:run` passes with the new unit tests included, and `npm run build` succeeds. Still nothing visible in the app.

---

## Part 3 — Directory, creating, joining, and navigation

**Build:** the Groups tab, the two routes, the directory page with search and empty and error states, the create and join modals, and the consent screen that appears before a user's first create or join.

**Test first.** Component-level tests for the pieces with real logic: the directory filter, the "already a member" state showing Open rather than Join, and the duplicate-name path where the user already owns that group and should be taken to it rather than told the name is taken.

**Two things to get right:**

- The tab bar currently uses fixed-width buttons. Four of them overflow a normal phone, so they have to become flexible. The route-matching list that decides when to show the bar also needs the new path, or the bar vanishes on the Groups pages.
- Take consent at the first create or join, not app-wide at launch. Re-gating everyone on upgrade is hostile, and consent at the moment of actual sharing is the cleaner position anyway. It must cover email sign-ups too, which the current gate skips.

**Milestone you can check:** open the app, see a fourth tab, tap it. Create a group. See it in the list. Sign in as a second account on another device or browser, find that group, get shown the consent screen, accept, and join it. The leaderboard is not built yet, so joining lands on a placeholder.

---

## Part 4 — The leaderboard

**Build:** the board page, the 7/30-day toggle, the two-line rows, the member sheet holding Block and Report, and Leave.

**Test first.** Unit tests for row shaping: ranked by total descending, ties broken by name, members with nothing at the bottom, your own row marked, the four discipline numbers summing to the total, and zeros omitted from the second line.

**Recommendation on the layout.** All five numbers on one line does not fit a 360px phone once the row needs a tappable control, and browser zoom is disabled app-wide so anyone using large text has no escape. Hence two lines: name and total on the first, the breakdown on the second, and the whole row as the touch target opening a sheet. Keep it that way even if it looks roomy on a large phone.

**Milestone you can check:** with two accounts in one group, log a slalom set on one and watch the other's board show that discipline and the total each go up by one, with the other columns untouched. Switch to 30 days and see older sets appear. Block the other member and confirm they disappear from your board — and that you disappear from theirs. Leave the group as the last member and watch it vanish from the directory.

---

## Part 5 — Moderation and policy

**Build:** the report flows for both groups and profile names, the denylist behind group creation, the policy text in all three places it appears, and a written runbook for handling a report.

**Test first.** Reporting is already covered at the database level in Part 1. What is new here is the copy and the process, so the check is a read-through rather than a test: confirm the policy text names the discipline breakdown explicitly, not just "set counts". The breakdown reveals which disciplines someone trains, which is more than a bare total, and the wording has to say so.

**Recommendation:** both app stores expect a timely response to reports, and there is deliberately no in-app moderation queue — you read them in the Supabase dashboard. Before submitting, decide what "timely" means for you and write it down. A daily check with a 24-hour target is defensible; nothing written down is not. Publish a contact address in the About page.

**Milestone you can check:** report a group from the second account, then find that report in the Supabase dashboard with a copy of the group's name and description saved alongside it. Delete the group and confirm the report is still there. Read the updated privacy policy in the app and confirm it describes what actually happens.

---

## Part 6 — End-to-end tests and release

**Build:** the two-user end-to-end suite, then the release itself.

**Test first.** This part *is* the tests. Every existing spec drives one user, so the harness needs a way to sign a second user into a second browser context — that is genuinely new ground and may take longer than it sounds. The scenarios are the ones from Part 3 and 4's milestones, automated: create, discover, consent, join, log a set, see it appear on someone else's board, toggle the period, block, leave, and the last member leaving deleting the group.

**Release order matters:** the database migration goes out before the client, or the app calls functions that do not exist. The policy text ships in the same release as the feature, not after. Then sync both native projects before building.

**Milestone you can check:** `npm run e2e` passes including the new suite, `npm run test:run` and the database suite still pass, and the feature works on a real phone on both platforms.

---

## Sequencing and risk

Part 1 gates everything — no client work starts until the boundary is proven. Parts 2 and 3 gate 4. Part 5 can be done alongside 4. Part 6 is last.

**Where this is most likely to hurt:**

- **The two-user test harness (Part 6).** Nothing in the repo does this today. Budget more than feels reasonable.
- **The concurrency test (Part 1).** It needs two real database connections. A single-threaded version passes whether or not the bug is fixed, which makes it worse than no test.
- **Moderation is an ongoing commitment,** not a build task. Everything else here ends when it ships; this one does not.

**Deferred on purpose:** group logo images, a tutorial step for Groups, sorting the board by discipline, server-side search, and any in-app moderation queue.

**Carry forward:** the policy version is referenced in the database functions and again in the client. Put it in one shared place the first time Part 3 touches it, or the two will drift apart the first time it changes.
