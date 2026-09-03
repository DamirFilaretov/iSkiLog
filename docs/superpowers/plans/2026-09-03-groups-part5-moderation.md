# Groups Part 5 — Moderation, Policy, Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Groups shippable to the App Store and Google Play — a working content denylist, in-app report + block controls wired to the RPCs already deployed, published policy copy and contact, a moderation runbook — plus the queued security hardening.

**Architecture:** Two idempotent migrations first (denylist fix + seed; hardening), verified against a clean `supabase db reset` and the DB suite. Then client wiring only — every moderation RPC and its `groupsApi.ts` wrapper already exist from Parts 1–2. New UI: a shared `ReportDialog`, a `MemberActionSheet` on the leaderboard row, a blocked-members section in `PrivacySecurity`. Then copy + runbook.

**Tech Stack:** React 19 + TypeScript, Supabase (Postgres + RPC), Supabase CLI migrations, vitest (unit + DB suite), Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-31-groups-design.md` (v5). Six-part plan: `docs/superpowers/plans/2026-08-31-groups-implementation-plan.md` (Part 5).

## Global Constraints

- **No `npx supabase db push` to production in this plan.** The maintainer runs it, after reviewing the migrations and the seed list. Local `npx supabase db reset` / `applyFeatureMigrations()` only.
- Every migration is idempotent: `create or replace`, `if not exists`, `drop ... if exists` first, `on conflict do nothing`. `tests/db/helpers/schema.ts::applyFeatureMigrations()` re-applies **every** post-baseline migration in filename order on each call — a migration that isn't re-runnable breaks the suite.
- Never edit a pushed migration (`20260903155020`, `20260903160619`, `20260903164850`, `20260903175342`). Add a new one.
- Groups RPCs are the only client path — no `.from("<groups table>")`. Client branches on `error.hint` tokens via `toGroupError`, never SQLSTATE.
- Handled user-facing failures call `captureHandledException` (`src/lib/sentryHandled.ts`).
- No component-test harness in this repo. Pure logic → vitest. Rendered-UI behaviour → Playwright in Part 6.
- `CACHE_VERSION` unchanged — Groups is never cached.
- Contact address is `iskilog@gmail.com` (already in `About.tsx` and `policy.html`).
- After any web change touching native: the maintainer runs `npx cap sync` at the Part 6 release sync — not per task.

---

## moderation_terms seed list (REVIEW BEFORE PRODUCTION)

Stored lowercase; matched as a **literal, case-insensitive substring** by `contains_denylisted_term` (`strpos(lower(text), lower(term)) > 0`). Substring matching means a term that is also a substring of an innocent word will over-block (the "Scunthorpe problem") — the list below is chosen to minimise that, and the maintainer refines it in the Supabase dashboard afterwards.

Starter set (Task 1 inserts exactly this; the maintainer edits the list in this file before it is approved):

```
nigger
nigga
faggot
retard
kike
spic
chink
wetback
tranny
coon
rapist
pedophile
paedophile
```

Rationale: unambiguous slurs and two abuse-accusation terms, none a common substring of ordinary names or ski vocabulary. Not included on purpose: profanity that is not targeted hate (`shit`, `damn`, …) — it is not what store review looks for and it inflates false positives; leetspeak / spacing evasions — substring matching cannot chase those and pretending it can is worse than not claiming it.

---

## File Structure

**Migrations (new):**
- `supabase/migrations/<ts>_groups_part5_denylist.sql` — fix `normalise_profile_name` to use `contains_denylisted_term`; trigger-safe re-runnable profile backfill; seed `moderation_terms`.
- `supabase/migrations/<ts>_groups_part5_hardening.sql` — `search_path=''` + `::public.event_type` on `create_set_with_subtype` / `update_set_with_subtype`; `revoke execute … from anon` on both; `join_code` via `extensions.gen_random_bytes`; `STABLE` on `list_groups` / `search_groups` / `list_my_groups`.

**DB tests (modify):**
- `tests/db/profileName.test.ts` — add: denylist match is case-insensitive and literal; backfill re-runs against seeded terms.
- `tests/db/acl.test.ts` — add `contains_denylisted_term` to `INTERNAL_FUNCTIONS`.
- `tests/db/setOwnership.test.ts` — add: `anon` cannot execute the two set RPCs; both pin an empty `search_path`.
- `tests/db/createGroup.test.ts` — add: a private group's `join_code` is 6 digits (generator swap must not change the shape).

**Client (new):**
- `src/components/groups/ReportDialog.tsx` — confirm + optional reason, one `onSubmit(reason)` prop. Used for both group and member reports.
- `src/components/groups/MemberActionSheet.tsx` — bottom sheet: Report member / Block member.

**Client (modify):**
- `src/components/groups/GroupJoinModal.tsx` — "Report this group" link.
- `src/pages/Groups.tsx` — hold report state, render `ReportDialog` for the join-modal group.
- `src/components/groups/LeaderboardRow.tsx` — becomes a `<button>` when not `isSelf`; new `onOpen` prop.
- `src/pages/GroupLeaderboard.tsx` — `MemberActionSheet` + `ReportDialog`, block → refetch.
- `src/pages/PrivacySecurity.tsx` — blocked-members section (`listBlocks` / `unblock`).
- `src/components/groups/GroupsConsentGate.tsx` — copy alignment (one line).
- `src/features/groups/groupErrors.ts` — no new tokens needed; add a `reported`/`blocked` note only if a hint appears that isn't mapped (it won't — `invalid_handle` already is).

**Copy / docs:**
- `public/policy.html` — remove "no social features"; add a Groups + moderation section.
- `src/pages/PrivacySecurity.tsx` — Groups data-sharing summary (alongside the blocked list).
- `src/pages/About.tsx` — "Report abuse" contact line.
- `docs/groups-moderation-runbook.md` — new.

**Spec upkeep:**
- Clear the stale EC-33 follow-up in `docs/obsidianVault/00-home/current_priorities.md` (the spec itself is already correct).

---

## Task 1: Denylist fix + seed migration

**Files:**
- Create: `supabase/migrations/<ts>_groups_part5_denylist.sql`
- Test: `tests/db/profileName.test.ts` (modify), `tests/db/acl.test.ts` (modify)

**Interfaces:**
- Consumes: `public.contains_denylisted_term(text) returns boolean` (exists, `20260903160619`); `public.moderation_terms(term text primary key)` (exists, empty).
- Produces: `moderation_terms` seeded with the list above; `normalise_profile_name` trigger using `contains_denylisted_term`.

Generate the timestamp with `npx supabase migration new groups_part5_denylist` (it prints the path), then write the body into that file.

- [ ] **Step 1: Write the failing tests** in `tests/db/profileName.test.ts`

Add to the `describe("profile name filtering", ...)` block:

```ts
it("matches denylist terms case-insensitively and literally", async () => {
  const user = await createTestUser()
  await withAdmin(c =>
    c.query("insert into public.moderation_terms (term) values ('slur') on conflict do nothing")
  )
  try {
    // stored lowercase, name mixed-case -> still blocked
    await expect(setName(user.userId, "The SLUR Team")).rejects.toMatchObject({ code: "22023" })
    // a term is a literal substring, not a LIKE pattern: '_' is not a wildcard
    await withAdmin(c =>
      c.query("insert into public.moderation_terms (term) values ('a_b') on conflict do nothing")
    )
    await setName(user.userId, "axb name") // 'a_b' must NOT match 'axb'
    expect(await nameOf(user.userId)).toBe("axb name")
  } finally {
    await withAdmin(c =>
      c.query("delete from public.moderation_terms where term in ('slur','a_b')")
    )
  }
})
```

Add a new `describe` block:

```ts
describe("denylist migration is re-runnable against seeded terms", () => {
  it("re-applies without aborting when moderation_terms is populated", async () => {
    // The seed migration has already run once (fresh DB). Re-applying every
    // feature migration must not abort on the profiles backfill firing the
    // now-active normalise trigger.
    await applyFeatureMigrations()
    await applyFeatureMigrations()
    const seeded = await withAdmin(async c => {
      const r = await c.query("select count(*)::int as n from public.moderation_terms")
      return r.rows[0].n
    })
    expect(seeded).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the tests, watch them fail**

Run: `npm run test:db -- profileName`
Expected: the case-insensitive test FAILS (current trigger lowercases only `NEW.full_name`, not `t.term`, and uses `like`); the `a_b` assertion FAILS (`_` matches under `like`). The re-runnable test passes today only because `moderation_terms` is empty — it will be the regression guard once the seed lands.

- [ ] **Step 3: Write the migration**

```sql
-- Groups Part 5: fix the profile-name denylist and seed moderation_terms.
--
-- Two defects carried forward verbatim from 20260903160619_groups_foundation.sql
-- (which is pushed and cannot be edited):
--   1. normalise_profile_name() matched with
--        lower(NEW.full_name) like '%' || t.term || '%'
--      — it never lowercased t.term, and %/_ inside a term acted as wildcards.
--      The group path (create_group) already uses contains_denylisted_term();
--      this brings the profile path onto the same matcher.
--   2. The foundation migration's profiles backfill runs AFTER the trigger is
--      created, so re-applying it against a populated moderation_terms fires the
--      trigger and can abort. This migration runs its own trigger-safe backfill
--      that leaves every full_name already normalised AND denylist-clean, so the
--      foundation backfill becomes a no-op on every subsequent re-apply.

-- 1. Same literal, case-insensitive matcher as create_group.
create or replace function public.normalise_profile_name()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  NEW.full_name := left(
    btrim(regexp_replace(
      regexp_replace(coalesce(NEW.full_name, ''), '[[:cntrl:]]', '', 'g'),
      '\s+', ' ', 'g')),
    60);

  if NEW.full_name <> '' and public.contains_denylisted_term(NEW.full_name) then
    raise exception 'display name is not allowed'
      using errcode = '22023', hint = 'groups.name_rejected';
  end if;

  return NEW;
end;
$fn$;

-- 2. Trigger-safe, re-runnable backfill. A denylisted legacy name is blanked
--    (the leaderboard renders '' as "Skier", EC-9) rather than raising, exactly
--    as the sign-in path already degrades (profileNameFallback.ts).
alter table public.profiles disable trigger profiles_normalise_name;

update public.profiles
   set full_name = case
     when public.contains_denylisted_term(
            left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)) then ''
     else left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)
   end
 where full_name is distinct from case
     when public.contains_denylisted_term(
            left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)) then ''
     else left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)
   end;

alter table public.profiles enable trigger profiles_normalise_name;

-- 3. Seed. Lowercase, literal substrings. on conflict do nothing so a re-apply
--    never clobbers terms the maintainer added in the dashboard.
insert into public.moderation_terms (term) values
  ('nigger'), ('nigga'), ('faggot'), ('retard'), ('kike'), ('spic'),
  ('chink'), ('wetback'), ('tranny'), ('coon'), ('rapist'),
  ('pedophile'), ('paedophile')
on conflict (term) do nothing;
```

- [ ] **Step 4: Verify a clean rebuild and the suite**

Run: `npx supabase db reset` then `npm run test:db -- profileName`
Expected: `db reset` completes with no error; all `profileName` tests PASS, including the two new ones.

- [ ] **Step 5: Add `contains_denylisted_term` to the ACL catalogue test**

In `tests/db/acl.test.ts`, add `"contains_denylisted_term"` to the `INTERNAL_FUNCTIONS` array (it is `security definer` and must be unreachable by `anon`/`authenticated`; the existing "keeps internal helpers unreachable" and "pins an empty search path" tests then cover it).

Run: `npm run test:db -- acl`
Expected: PASS.

- [ ] **Step 6: Full suite + second reset**

Run: `npm run test:db` then `npx supabase db reset` then `npm run test:db` again
Expected: green both times (proves flag-state independence and re-runnability).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations tests/db/profileName.test.ts tests/db/acl.test.ts
git commit -m "$(cat <<'EOF'
feat(groups): fix profile-name denylist matcher and seed moderation_terms

normalise_profile_name now uses contains_denylisted_term (literal,
case-insensitive) instead of an un-lowercased LIKE whose %/_ were wildcards,
matching the create_group path. Trigger-safe backfill so re-applying the
foundation migration over seeded terms no longer aborts.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Hardening migration

**Files:**
- Create: `supabase/migrations/<ts>_groups_part5_hardening.sql`
- Test: `tests/db/setOwnership.test.ts` (modify), `tests/db/createGroup.test.ts` (modify)

**Interfaces:**
- Consumes: `create_set_with_subtype(...)`, `update_set_with_subtype(...)` (baseline + `20260903164850`); `create_group`, `list_groups`, `search_groups`, `list_my_groups` (`20260903160619` / `20260903175342`).
- Produces: those functions, unchanged in behaviour, with pinned search paths / narrowed grants / CSPRNG code / `STABLE` labels.

`npx supabase migration new groups_part5_hardening`.

- [ ] **Step 1: Write the failing tests**

In `tests/db/setOwnership.test.ts` add:

```ts
import { withAdmin } from "./helpers/admin"

describe("set RPC hardening", () => {
  it("does not let anon execute the set write RPCs", async () => {
    const bad = await withAdmin(async c => {
      const r = await c.query(
        `select p.proname,
                has_function_privilege('anon', p.oid, 'execute') as anon
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('create_set_with_subtype','update_set_with_subtype')`
      )
      return r.rows.filter(row => row.anon).map(row => row.proname)
    })
    expect(bad).toEqual([])
  })

  it("pins an empty search_path on the set write RPCs", async () => {
    const unpinned = await withAdmin(async c => {
      const r = await c.query(
        `select p.proname, p.proconfig from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('create_set_with_subtype','update_set_with_subtype')`
      )
      return r.rows
        .filter(row => !(row.proconfig ?? []).some((e: string) => e.startsWith("search_path=")))
        .map(row => row.proname)
    })
    expect(unpinned).toEqual([])
  })
})
```

In `tests/db/createGroup.test.ts`, add to the private-group coverage (or a new `it`):

```ts
it("still returns a 6-digit numeric join code after the CSPRNG swap", async () => {
  await withFeatureEnabled(async () => {
    const user = await ready()
    const { data } = await user.client.rpc("create_group", {
      p_name: unique("Hardening Private"),
      p_description: "",
      p_private: true
    })
    expect(data.join_code).toMatch(/^[0-9]{6}$/)
  })
})
```

(Match the existing helpers in that file — `ready`, `unique`, `withFeatureEnabled` — check its imports and reuse them.)

- [ ] **Step 2: Run, watch fail**

Run: `npm run test:db -- setOwnership`
Expected: both new tests FAIL (baseline grants `anon` execute and pins no path).

- [ ] **Step 3: Write the migration**

```sql
-- Groups Part 5 hardening. No behaviour change — security posture only.
-- Queued from the automated security review of 2026-09-03 and the Part 4 review.

-- 1. Pin search_path and qualify the enum cast on the SECURITY DEFINER set
--    writers. With an empty path, `::event_type` no longer resolves — use the
--    schema-qualified name. Bodies are otherwise verbatim from
--    20260903155020 (create) and 20260903164850 (update).
create or replace function public.create_set_with_subtype(
  -- ... COPY THE FULL SIGNATURE VERBATIM FROM 20260903155020 line 73 ...
) returns uuid
  language plpgsql security definer set search_path = ''
  as $$
-- ... COPY THE BODY VERBATIM, replacing every unqualified relation with
--     public.<name> and `p_event_type::event_type` with
--     `p_event_type::public.event_type`. auth.uid() stays as-is.
$$;

create or replace function public.update_set_with_subtype(
  -- ... FULL SIGNATURE VERBATIM FROM 20260903164850 ...
) returns void
  language plpgsql security definer set search_path = ''
  as $$
-- ... BODY VERBATIM from 20260903164850 with the same qualification treatment.
--     Keep the `if not found then raise ... 42501` guard.
$$;

-- 2. Neither has a legitimate anonymous caller; both are definer.
revoke execute on function public.create_set_with_subtype(
  uuid, boolean, text, date, time without time zone, jsonb, numeric, text, numeric,
  integer, integer, text, text, integer, integer, integer, numeric, text, integer,
  text, integer
) from anon;
revoke execute on function public.update_set_with_subtype(
  uuid, uuid, boolean, text, date, time without time zone, jsonb, numeric, text,
  numeric, integer, integer, text, text, integer, integer, integer, numeric, text,
  integer, text, integer, boolean
) from anon;

-- 3. join_code from a CSPRNG rather than random(). Discovery boundary, not
--    access control (D27), but the review flagged random() and gen_random_bytes
--    is free. 3 random bytes -> 0..16_777_215, taken mod 1e6. get_byte is
--    non-negative, so no sign surprise; the modulo bias over 1e6 is negligible
--    and irrelevant for a discovery boundary.
create or replace function public.groups_new_join_code()
returns text language plpgsql volatile security definer set search_path = '' as $fn$
declare
  b bytea := extensions.gen_random_bytes(3);
  n int := (pg_catalog.get_byte(b, 0) << 16)
         | (pg_catalog.get_byte(b, 1) << 8)
         |  pg_catalog.get_byte(b, 2);
begin
  return pg_catalog.lpad((n % 1000000)::text, 6, '0');
end;
$fn$;
revoke execute on function public.groups_new_join_code() from public, anon, authenticated;

-- create_group: drop-and-recreate is unnecessary (same signature) — use
-- `create or replace` and swap the inline lpad(...) expression in the
-- code-generation loop for `select public.groups_new_join_code() into v_code;`.
-- COPY create_group VERBATIM FROM 20260903160619 (lines ~760-880), change only
-- that one line inside the `for v_attempt in 1..20 loop` block, and keep
-- `set search_path = ''` (it already has it).
create or replace function public.create_group(
  p_name text, p_description text default '', p_private boolean default false
) returns public.group_public
language plpgsql security definer set search_path = '' as $fn$
-- ... verbatim body with the single-line join_code swap ...
$fn$;
revoke execute on function public.create_group(text, text, boolean) from public, anon;
grant  execute on function public.create_group(text, text, boolean) to authenticated;

-- 4. Honest volatility label on the pure-read directory RPCs: each runs one
--    data query after an unchanging auth.uid() check.
--    `create or replace` cannot change volatility on some PG versions if the
--    function is referenced; if it errors, `drop function` first then recreate
--    verbatim with `stable`. Otherwise:
alter function public.list_groups() stable;
alter function public.search_groups(text) stable;
alter function public.list_my_groups() stable;
```

> **Implementer note:** the three function bodies (`create_set_with_subtype`, `update_set_with_subtype`, `create_group`) must be copied **verbatim** from the named source migrations — do not paraphrase. The only edits are: add `set search_path = ''`, schema-qualify relations and the enum cast, and (for `create_group`) the one `v_code` line. Diff your copy against the source before committing.

- [ ] **Step 4: Rebuild and test**

Run: `npx supabase db reset` then `npm run test:db`
Expected: green, including the new `setOwnership` and `createGroup` assertions. Pay attention to `tests/db/setCrud`-style tests and `createGroup.test.ts` — a paraphrase error in a copied body shows up here.

- [ ] **Step 5: App smoke — set CRUD still works**

Run: `npm run test:run` (unit) — expected green. Then, with a local login, create and edit a set of each event type in the running app (`npm run dev`) to confirm the definer rewrite didn't break the happy path. (E2E `sets-crud.spec.ts` is the automated backstop but needs the `.env.test` wiring fixed — Part 6.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations tests/db/setOwnership.test.ts tests/db/createGroup.test.ts
git commit -m "$(cat <<'EOF'
feat(db): Part 5 hardening — pin search_path, drop anon grants, CSPRNG join code

- create/update_set_with_subtype: set search_path = '', schema-qualify the
  event_type cast, revoke execute from anon (both are SECURITY DEFINER)
- create_group: join_code from extensions.gen_random_bytes, not random()
- list_groups / search_groups / list_my_groups: marked STABLE

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ReportDialog + report a group

**Files:**
- Create: `src/components/groups/ReportDialog.tsx`
- Modify: `src/components/groups/GroupJoinModal.tsx`, `src/pages/Groups.tsx`

**Interfaces:**
- Consumes: `reportGroup(groupId: string, reason: string): Promise<void>` (`src/data/groupsApi.ts`, exists); `toGroupError` (exists).
- Produces: `ReportDialog` — props `{ open: boolean; title: string; submitting: boolean; error: string | null; onSubmit: (reason: string) => void; onClose: () => void }`. Reused by Task 4.

- [ ] **Step 1: Write `ReportDialog.tsx`**

Model the markup on `LeaveGroupDialog.tsx` (same overlay / `z-[60]` / rounded-3xl card). Body: one sentence ("Tell us what's wrong with this group. We review every report."), an optional `<textarea>` (label "Reason (optional)", `maxLength={500}`), a primary "Send report" button, a "Cancel" button. Local state holds the textarea value; `onSubmit(reason.trim())` on the primary button; clear the value when `open` goes false.

```tsx
type Props = {
  open: boolean
  title: string
  submitting: boolean
  error: string | null
  onSubmit: (reason: string) => void
  onClose: () => void
}
```

- [ ] **Step 2: Add the trigger to `GroupJoinModal.tsx`**

Replace the stale comment (lines 9-11) and add, below the Close button, a quiet link shown only when `!group.isMember`:

```tsx
<button
  type="button"
  onClick={() => props.onReport(group)}
  className="mt-3 w-full text-center text-xs font-medium text-slate-400 underline"
>
  Report this group
</button>
```

Add `onReport: (group: Group) => void` to `GroupJoinModal`'s `Props`.

- [ ] **Step 3: Wire state in `Groups.tsx`**

Add:

```tsx
const [reportTarget, setReportTarget] = useState<Group | null>(null)
const [reportSubmitting, setReportSubmitting] = useState(false)
const [reportError, setReportError] = useState<string | null>(null)

async function submitReport(reason: string) {
  if (!reportTarget) return
  setReportSubmitting(true)
  setReportError(null)
  try {
    await reportGroup(reportTarget.id, reason)
    if (!live.current) return
    setReportTarget(null)
    setNotice("Thanks — we'll take a look.")
  } catch (error) {
    captureHandledException(error, { area: "groups", action: "report_group", screen: "groups" })
    if (live.current) setReportError(toGroupError(error).message)
  } finally {
    if (live.current) setReportSubmitting(false)
  }
}
```

Pass `onReport={(g) => { setJoinTarget(null); setReportError(null); setReportTarget(g) }}` to `GroupJoinModal`, and render:

```tsx
<ReportDialog
  open={reportTarget !== null}
  title={reportTarget ? `Report ${reportTarget.name}` : "Report"}
  submitting={reportSubmitting}
  error={reportError}
  onSubmit={reason => void submitReport(reason)}
  onClose={() => setReportTarget(null)}
/>
```

Import `reportGroup` from `../data/groupsApi` and `ReportDialog`.

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: clean (tsc + vite).

- [ ] **Step 5: Manual smoke**

`npm run groups:on`, `npm run dev`, sign in, open a group you're not in from the directory, tap "Report this group", send. The join modal closes and the amber notice shows. Check the row landed: `select * from abuse_reports order by created_at desc limit 1;` (via `npx supabase db` or dashboard) — `snapshot_name` / `snapshot_description` populated, `target_type = 'group'`.

- [ ] **Step 6: Commit**

```bash
git add src/components/groups/ReportDialog.tsx src/components/groups/GroupJoinModal.tsx src/pages/Groups.tsx
git commit -m "feat(groups): report a group from the join modal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: MemberActionSheet + report / block a member

**Files:**
- Create: `src/components/groups/MemberActionSheet.tsx`
- Modify: `src/components/groups/LeaderboardRow.tsx`, `src/pages/GroupLeaderboard.tsx`

**Interfaces:**
- Consumes: `reportProfile(membershipId, reason)`, `blockGroupMember(membershipId)` (`groupsApi.ts`, exist); `ShapedLeaderboardRow` (`leaderboardRows.ts` — has `membershipId`, `memberName`, `isSelf`); `ReportDialog` (Task 3).
- Produces: `MemberActionSheet` — props `{ member: { membershipId: string; memberName: string } | null; onReport: () => void; onBlock: () => void; onClose: () => void }`.

- [ ] **Step 1: `LeaderboardRow.tsx` — make non-self rows tappable**

Add `onOpen?: () => void` to `Props`. When `!row.isSelf && onOpen`, render the outer element as a `<button type="button" onClick={onOpen} className="w-full text-left ...">` instead of a `<div>` (keep every existing class). Self rows and rows with no handler stay a `<div>`. Update the file's header comment ("The row is static" → "Non-self rows open a member action sheet").

- [ ] **Step 2: `MemberActionSheet.tsx`**

Bottom sheet, same overlay pattern as `LeaveGroupDialog`. Shows `member.memberName` as the heading, then two full-width buttons — "Report member" (calls `onReport`) and "Block member" (calls `onBlock`, red text) — and "Cancel". Renders null when `member` is null.

- [ ] **Step 3: `GroupLeaderboard.tsx` — state + handlers**

In the `Board` component's parent (`GroupLeaderboard`), lift the sheet/report state to the page level (it already owns `leave*` state — follow that shape):

```tsx
const [sheetMember, setSheetMember] = useState<{ membershipId: string; memberName: string } | null>(null)
const [reportMember, setReportMember] = useState<{ membershipId: string; memberName: string } | null>(null)
const [reportSubmitting, setReportSubmitting] = useState(false)
const [reportError, setReportError] = useState<string | null>(null)

async function submitMemberReport(reason: string) {
  if (!reportMember) return
  setReportSubmitting(true); setReportError(null)
  try {
    await reportProfile(reportMember.membershipId, reason)
    if (!live.current) return
    setReportMember(null)
    setBoardNotice("Thanks — we'll take a look.")
  } catch (error) {
    const mapped = toGroupError(error)
    captureHandledException(error, { area: "groups", action: "report_profile", screen: "group_leaderboard" })
    if (!live.current) return
    if (mapped.refetch) { setReportMember(null); setAttempt(n => n + 1) }
    else setReportError(mapped.message)
  } finally {
    if (live.current) setReportSubmitting(false)
  }
}

async function blockMember(membershipId: string) {
  try {
    await blockGroupMember(membershipId)
    if (!live.current) return
    setSheetMember(null)
    setAttempt(n => n + 1) // refetch: the blocked member drops off both boards
  } catch (error) {
    const mapped = toGroupError(error)
    captureHandledException(error, { area: "groups", action: "block_group_member", screen: "group_leaderboard" })
    if (!live.current) return
    setSheetMember(null)
    setBoardNotice(mapped.refetch ? "That list was out of date — refreshed." : mapped.message)
    if (mapped.refetch) setAttempt(n => n + 1)
  }
}
```

Thread an `onOpenMember` callback down through `Board` → `rows.map` → `<LeaderboardRow onOpen={...}>` that calls `setSheetMember({ membershipId: row.membershipId, memberName: row.memberName })`.

Render at the page level:

```tsx
<MemberActionSheet
  member={sheetMember}
  onReport={() => { const m = sheetMember; setSheetMember(null); setReportError(null); setReportMember(m) }}
  onBlock={() => sheetMember && void blockMember(sheetMember.membershipId)}
  onClose={() => setSheetMember(null)}
/>
<ReportDialog
  open={reportMember !== null}
  title={reportMember ? `Report ${reportMember.memberName}` : "Report"}
  submitting={reportSubmitting}
  error={reportError}
  onSubmit={reason => void submitMemberReport(reason)}
  onClose={() => setReportMember(null)}
/>
```

Import `reportProfile`, `blockGroupMember` from `../data/groupsApi`; `MemberActionSheet`, `ReportDialog`.

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Manual smoke (two accounts)**

Two local accounts in one group (`tests/e2e/scripts/seed-demo-group.mjs` or by hand). On account A's board, tap account B's row → sheet opens → Block → B's row disappears and the board refetches. Then on B's board, A is gone too (symmetric). Report a member the same way and check `abuse_reports` has a `target_type = 'profile'` row with `snapshot_name`.

- [ ] **Step 6: Commit**

```bash
git add src/components/groups/MemberActionSheet.tsx src/components/groups/LeaderboardRow.tsx src/pages/GroupLeaderboard.tsx
git commit -m "feat(groups): report and block a member from the leaderboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Blocked-members list in Privacy & Security

**Files:**
- Create: `src/components/groups/BlockedMembersList.tsx`
- Modify: `src/pages/PrivacySecurity.tsx`

**Interfaces:**
- Consumes: `listBlocks(): Promise<BlockedUser[]>`, `unblock(blockId: string): Promise<void>` (`groupsApi.ts`, exist); `BlockedUser` (`src/types/groups.ts` — `{ blockId, displayName, blockedAt }`).
- Produces: `BlockedMembersList` — no props; self-contained card.

- [ ] **Step 1: `BlockedMembersList.tsx`**

A `rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/60` card matching the others in `PrivacySecurity`. On mount, `listBlocks()`:

- loading → a short skeleton line
- error → "Couldn't load your blocked list." + a Retry button (bump a local `attempt` state)
- empty → heading "Blocked members" + "You haven't blocked anyone."
- rows → heading + each `displayName` with an "Unblock" button; on click call `unblock(blockId)`, then optimistically drop the row (re-run `listBlocks()` on failure, `captureHandledException` on error with `{ area: "groups", action: "unblock", screen: "privacy_security" }`).

`listBlocks` is not flag-gated (kill switch never traps an unblock), so no `groupsAccess` check — always render the card.

- [ ] **Step 2: Mount it in `PrivacySecurity.tsx`**

Import and render `<BlockedMembersList />` inside the `space-y-4 px-5` column, after the "Terms & Privacy Policy" card and before "Delete account".

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Manual smoke**

With one member blocked (from Task 4), open Settings → Privacy & Security → see the blocked member listed → Unblock → row disappears → return to that group's board and they're back.

- [ ] **Step 5: Commit**

```bash
git add src/components/groups/BlockedMembersList.tsx src/pages/PrivacySecurity.tsx
git commit -m "feat(groups): blocked-members list with unblock in Privacy & Security

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Policy copy, About contact, runbook, cleanup

**Files:**
- Modify: `public/policy.html`, `src/pages/PrivacySecurity.tsx`, `src/components/groups/GroupsConsentGate.tsx`, `src/pages/About.tsx`, `docs/obsidianVault/00-home/current_priorities.md`
- Create: `docs/groups-moderation-runbook.md`

- [ ] **Step 1: `public/policy.html`**

- Privacy Policy §3: change "There are no social features." → a sentence that Groups is optional and covered below.
- Terms §4 (User Content) or a new §11: add that group names and descriptions and profile display names are user content, are filtered against a denylist before they appear, and that abusive content or names can be reported in the app and will be reviewed; repeat offenders and violating groups are removed.
- Add a "Groups (optional)" subsection under Privacy Policy: joining a group shares **your profile name** and **your set counts broken down by event type — slalom, tricks, jump, other** — with other members of that group. It does not share set contents, individual set dates, notes, scores or technique. Leaving stops the sharing immediately. Counts include sets logged before you joined. A private group still appears in the directory with a lock; joining it needs a 6-digit code a member shares — the code keeps people from wandering in, it is not a password.
- Contact for reports: `iskilog@gmail.com` (already the contact address — reference it here).
- Bump the "Effective Date".

- [ ] **Step 2: `PrivacySecurity.tsx` copy**

Add a small card (or text in the existing "Your data is private" card) noting that if you join a group, that group's members see your name and event-type set counts — nothing else — and that you can leave at any time. Keep it to two sentences; the full text is in the policy.

- [ ] **Step 3: `GroupsConsentGate.tsx`**

The gate already lists what members see / don't see and says "You can block or report another member at any time." That line is now true — leave it, but change "block or report another member" to "report or block another member" for consistency with the sheet's button order, and add one line to the "They can see" list is not needed. Add, after that paragraph: "Names and group descriptions are filtered, and anything abusive can be reported for review." One sentence.

- [ ] **Step 4: `About.tsx`**

Under "Contact & Info", add a second row beside "Contact Support": "Report abuse" → `iskilog@gmail.com` with a subject hint. Mirror the existing button markup.

- [ ] **Step 5: `docs/groups-moderation-runbook.md`**

```markdown
# Groups moderation runbook

Groups exposes user-generated content: group names, group descriptions, and
profile display names, all visible to other members on shared leaderboards.
Apple (Guideline 1.2) and Google Play (UGC policy) require filtering, reporting,
blocking, a contact address, and a timely response. This is the response.

## Commitment

- Check `abuse_reports` **once every business day**.
- Action anything credible within **one business day** of that check.
- Contact address: iskilog@gmail.com (in the app: About → Report abuse, and the
  policy). Reports sent there are triaged the same way.

## Daily check

In the Supabase dashboard → SQL editor:

```sql
select id, created_at, target_type, snapshot_name, snapshot_description, reason
from abuse_reports
order by created_at desc
limit 50;
```

`target_group_id` / `target_user_id` may be null if the target was already
deleted — the snapshot columns are the evidence and are retained regardless.

## Actioning a report

- **Abusive group name or description:** delete the group —
  `delete from groups where id = '<id>';` (memberships cascade; the report
  survives with its snapshot). Or, for a borderline case, edit the row.
- **Abusive profile name:** add the offending term(s) to the denylist —
  `insert into moderation_terms (term) values ('<lowercased term>') on conflict do nothing;`
  then blank the current value:
  `update profiles set full_name = '' where user_id = '<id>';`
  (renders as "Skier"). The trigger blocks re-entry.
- **A user reported repeatedly / severe:** disable Groups for them by removing
  their memberships, or escalate to an account action per the main Terms.

## Live incident (spreading abuse, spam wave)

Flip the kill switch:

```sql
update app_settings set value = 'false' where key = 'groups_enabled';
```

This stops **new** groups and **new** joins only. Existing members keep their
boards, Leave, Report and Block — deliberately, so people aren't trapped
(`knowledge/decisions/the-kill-switch-stops-spread-not-escape`). Re-enable with
`'true'` once handled.

## Denylist maintenance

`moderation_terms` is lowercase literal substrings, matched case-insensitively.
Substring matching over-blocks innocent words that contain a term — prefer
longer, unambiguous terms and remove any that cause false reports. The seed set
is in `supabase/migrations/*_groups_part5_denylist.sql`.

## Store submission notes

Tell reviewers: report controls are on the group's join screen ("Report this
group") and on each leaderboard row (tap a member → Report / Block); the
blocked-members list with Unblock is in Settings → Privacy & Security.
```

- [ ] **Step 6: Clear the stale follow-up**

In `docs/obsidianVault/00-home/current_priorities.md`, remove or strike the "Spec §11 EC-33 is wrong" follow-up bullet — the spec was corrected in v3; only the note lagged. Leave a one-line "done" trace.

- [ ] **Step 7: Build + full test**

Run: `npm run build` then `npm run test:run` then `npm run test:db`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add public/policy.html src/pages/PrivacySecurity.tsx src/components/groups/GroupsConsentGate.tsx src/pages/About.tsx docs/groups-moderation-runbook.md docs/obsidianVault/00-home/current_priorities.md
git commit -m "docs(groups): policy copy, abuse contact, and moderation runbook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Done criteria

- `npx supabase db reset` clean; `npm run test:db` green run twice in a row; `npm run test:run` green; `npm run build` clean.
- In the app (flag on, two accounts): report a group from the join modal → row in `abuse_reports` with snapshot; tap a member → Report and Block both work; blocked member drops off both boards; unblock from Privacy & Security restores them; an abusive display name is refused.
- Policy names the event-type breakdown explicitly and describes private groups accurately; About has a "Report abuse" contact; runbook committed.
- **Not done here:** two-user E2E specs (Part 6), `npx cap sync` (Part 6 release sync), `npx supabase db push` (maintainer, after reviewing the two migrations and the seed list).

## Spec coverage check

| Spec (v5) item | Task |
|---|---|
| §6.6 wire report_group / report_profile / block / list_blocks / unblock | 3, 4, 5 |
| §6.7 hardening migration (search_path, anon revoke, CSPRNG, STABLE) | 2 |
| §9.2 policy copy in three places + private-group line | 6 |
| §9.3 denylist fixed matcher + seed; contact; one-business-day runbook | 1, 6 |
| §7 MemberActionSheet / ReportDialog / BlockedMembersList | 3, 4, 5 |
| §8 Report link on join modal; leaderboard row opens a sheet | 3, 4 |
| §11 EC-33 already correct — clear the stale vault note | 6 |
| D21 denylist on both write surfaces, same matcher | 1 |
