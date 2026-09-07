# Groups — Design Spec

**Date:** 2026-08-31 · **Version:** 5 · **Status:** Parts 1–4.5 built; Part 5 (moderation, policy, hardening) ready to build

Revised after an adversarial review (`docs/groups_findings.md`): 14 findings, 12
accepted in full or reduced scope. Rejected: the claim that `create_group(NULL,'')`
yields an unmapped `23502` (§6.2 coalesces, giving the documented `22023`), and
wrapper functions in front of private definers. Server-side directory pagination
was reduced to a hard cap plus a creation quota.

**v3 (2026-09-03):** private groups added (D26–D28, §6.2–6.4, EC-34–EC-40). A creator
may opt a group out of the directory; it is then joined by a 6-digit code instead.
This is the only change that rewrites an earlier decision — D2 splits into public
and private. Blocking and reporting were also cut from the client scope
(`knowledge/decisions/blocking-and-reporting-are-deferred`); the Part 1 SQL for
them stays in place, dormant. Part 4 shipped the leaderboard and the resolved
window on `fetch_group_leaderboard`, which is now `STABLE`.

**v4 (2026-09-03, same day):** D26 revised — private groups are **discoverable**.
They now appear in `list_groups` / `search_groups` flagged `is_private` (but never
with `join_code`); the client shows a lock and routes the tap to a code prompt.
`join_group_by_code` is still the only way in and `join_group` still refuses a
private id. D27/D28 unchanged. Migration `20260903175342_private_groups_discoverable`.
See `knowledge/decisions/a-private-group-is-hidden-not-sealed` (retitled "visible
but code-gated"). D2 in the table below and the D26 SQL sketch describe the
superseded "hidden" behaviour.

**v5 (2026-09-03):** Part 5 scope reset. Three changes:

1. **Blocking and reporting are back in scope, not deferred.** The user's call
   is that Groups ships in the native App Store / Play builds, and both stores
   require in-app reporting *and* blocking for user-to-user content (Apple 1.2,
   Google Play UGC). The Part 1 SQL for `report_group`, `report_profile`,
   `block_group_member`, `list_blocks`, `unblock` and the `abuse_reports` /
   `user_blocks` tables — already built, tested and deployed dormant — is wired
   to a UI in Part 5. `knowledge/decisions/blocking-and-reporting-are-deferred`
   is superseded; see `knowledge/decisions/groups-ships-with-report-and-block`.
2. **The schema is Supabase CLI migrations,** not `tests/e2e/db/schema.sql`
   (`knowledge/decisions/the-database-is-managed-by-supabase-migrations`). Every
   "lands in `schema.sql`" reference below now means "lands in a timestamped
   migration under `supabase/migrations/`". Parts 1–4.5 are
   `20260903160619_groups_foundation.sql` +
   `20260903175342_private_groups_discoverable.sql`. **Only `160619` +
   `164850` are on production** (verified 2026-09-03); `175342` and the two
   Part 5 migrations are committed but unpushed.
3. **Part 5 adds a hardening migration** alongside the moderation work — see §6.7.

---

## 1. Summary

Groups adds a public directory of user-created training groups and a per-group
leaderboard ranking members by sets logged in a rolling window.

This is **the first cross-user feature in iSkiLog**. Every existing table is
locked to `auth.uid() = user_id`; hydration, caching and RLS all assume "your
data, only yours." Nearly all the risk is in breaking that assumption safely.

**Core safety rule:** no Groups table is client-reachable at all. Every read goes
through an RPC that verifies membership and returns **aggregates only** — a
display name and five counts, keyed by opaque handles. Set rows, individual
dates, notes, scores and `auth.users` identifiers never cross the boundary.

---

## 2. Decisions

| # | Decision | Value |
|---|---|---|
| D1 | Who creates groups | Any authenticated user, subject to quota (D19) |
| D2 | Directory visibility | Every signed-in user sees every group in the directory and search. **Private groups (D26):** shown flagged `is_private` (never with `join_code`); the client renders a lock and joining needs the code. *(v3 hid them entirely; reversed to "discoverable" in v4.)* |
| D3 | Group names | Globally unique, case- and whitespace-insensitive |
| D4 | Ownership / roles | **None.** Everyone has "Leave"; no owner, no admins |
| D5 | Group lifecycle | When the last member leaves, the group is deleted |
| D6 | Leaderboard identity | `profiles.full_name`, length-capped (D21) |
| D7 | Leaderboard metric | Slalom / tricks / jump / other, plus a total. Ranked by total |
| D8 | Periods | Fixed `'7d'` / `'30d'` enum, resolved **server-side**, default 7 |
| D9 | Backfill | All sets in the window count, regardless of join date |
| D10 | Group logo | Deferred. Initials avatar; `logo_key` reserved |
| D11 | Members with 0 sets | Shown at the bottom, not hidden |
| D12 | Tab order | Home · Insights · Groups · Settings |
| D13 | Directory reach | Browse shows top 200 by members; **server-side name search reaches every group** |
| D14 | Rejoining | Immediate, no cooldown |
| D15 | Caching | None at all — no localStorage, no memo. `CACHE_VERSION` unchanged |
| D16 | Reporting | Groups **and** profile names; snapshots retained |
| D17 | Blocking | Mutual, managed from a blocked-users screen via opaque block ids |
| D18 | Retry wrapper | Not used. Create reconciles instead |
| D19 | Abuse limits | 10 live groups per creator, 5 creations/hour counted from a **non-deletable creation log** |
| D20 | Consent | Versioned, server-owned, gated at first create-or-join |
| D21 | Profile names | Normalised, capped at 60 chars, **and denylist-filtered in the database** |
| D22 | Row layout | Two lines: name + total, then the discipline breakdown |
| D23 | Function privilege | `security invoker` by default; `definer` only where cross-user reads require it |
| D24 | Rollout | Ships behind a server-side feature flag that doubles as a kill switch |
| D25 | Client reachability | **Zero** Groups tables are client-reachable, without exception |
| D26 | Private groups | Creator opts in at creation. A **6-digit numeric** join code is generated server-side, unique, and **fixed for the group's life**. **(v4)** The group still appears in `list_groups` / `search_groups` flagged `is_private` — never with `join_code` — and the client shows a lock; the only ways in are `join_group_by_code` or an existing membership (`join_group` on a private id → `groups.code_required`) |
| D27 | The code is not access control | `join_group_by_code` is **not rate-limited** (deliberate). "Private" means *needs an invite*, not *sealed*: the ~1M code space is enumerable by a determined script. Accepted — private is a discovery boundary, and Part 5's policy copy says so rather than overclaiming |
| D28 | Who holds the code | **Any member** sees it, on the group's board, so anyone can invite. No creator role (D4 preserved). Not regenerable — a badly-leaked code is fixed by leave-and-recreate |

**D8** — the client sends the period and its IANA timezone, never dates. Accepting
`p_start`/`p_end` would let any member call with `p_start = p_end` and learn who
trained which discipline on a given day; 365 calls reconstruct a year of everyone's
schedule. The timezone is validated against `pg_timezone_names`; a crafted value
shifts the window by at most a day.

**D9** — matches the product intent and avoids new members staring at a zero.
Joining retroactively reveals recent volume and disciplines; named in the consent copy.

**D15** — a memo keyed by period goes stale across midnight (header shows today's
dates, rows are yesterday's window) and misses sets logged while mounted.

**D17 / D25** — an earlier draft left `user_blocks` client-readable, which
contradicted two other rules at once: `blocked_id` *is* an `auth.users` UUID, so
reading your own blocks handed you a stable cross-group identifier for everyone
you had blocked, and insert permission gave a UUID-existence oracle through the
foreign key. Making it private removes the exception entirely — the invariant is
now "no Groups table is reachable, full stop" — and forces the blocked-users
screen that mutual blocking needs anyway. Without that screen, blocking someone
removes the only row you could have unblocked them from.

**D19** — counting recent creations from live `groups` rows does not work: a
creator can make a group, leave as sole member, and the reap trigger deletes the
evidence, so the hourly count never rises. The limit is defeated by exactly the
churn it exists to stop. Counts come from an append-only creation log that is
never deleted, and check-and-insert is serialised by a per-creator lock so two
concurrent creates cannot both see nine.

**D21** — capping the length is not filtering. `profiles.full_name` is directly
writable and renders on every leaderboard, so an abusive display name bypasses
the group-name denylist completely and publishes to every shared group. The
filter has to run in the database, on every write, because the existing
`ProfileSettings` upsert and `AuthProvider`'s OAuth hydration both write it.

**D23** — pure helpers have no reason to run as the table owner. Only functions
that must read another user's rows are `definer`.

**D18** — `leave_group` is idempotent in final state, so it isn't the risk;
`create_group` is. If it commits but the response is lost, a manual retry returns
`23505` and the user is told someone else took a name they created. Retry stays
off; on `23505` the client checks for existing membership and navigates there.

**D26 / D27** — private groups are a *discovery* boundary, not a security one, and
the spec is explicit about that so nothing downstream overclaims. `is_private`
removes the group from browse and name search; a 6-digit code (`join_code`,
unique, generated with a collision-retry loop) is the only new way in. The code
is deliberately unprotected: rate-limiting it would need another append-only
attempt log and a lock, for a feature whose point is convenience, and a
determined attacker with many accounts defeats a modest limit anyway. Names stay
globally unique across public and private (the `canonical_group_name` index is
privacy-blind) — so a create that collides with a hidden private name returns
`groups.name_taken`, a minor existence-by-name oracle, accepted as consistent
with the soft-barrier posture.

**D28** — the code renders on the board for every member, mirroring D4: no member
has powers another lacks. It is fixed for the group's life; a rotation RPC would
reintroduce "one member can disrupt the others" and is not worth it here.

---

## 3. Scope boundaries

**Not planned:** admin roles, moderators, kicking members; group chat, comments or
reactions; notifications.

**Now in scope (v3):** private groups joined by a 6-digit code (D26–D28).

**Now in scope (v5):** reporting groups and profile names, and mutual blocking
with a blocked-users screen (D16, D17) — wired in Part 5, required for store
review.

**Deferred:** join-code rotation; group logo upload (needs a Storage bucket and
image pipeline); a tutorial step for Groups; sorting the board by discipline;
server-side directory search and pagination once 200 is limiting; an in-app
moderation queue if report volume ever justifies one. Self-reported counts are
gameable — accepted at club scale.

---

## 4. Data model

All DDL lands in `tests/e2e/db/schema.sql` (the source of truth) and separately as
a migration against the live project.

```sql
create table if not exists public.groups (
  id          uuid primary key default extensions.gen_random_uuid(),
  name        text not null,
  description text not null default '',
  logo_key    text null,
  created_by  uuid null references auth.users(id) on delete set null,
  created_at  timestamptz not null default timezone('utc', now())
);

-- Private groups (D26). is_private removes the group from the directory and
-- name search; join_code is a 6-digit string, null for public groups, unique
-- among the non-null values. Added by `alter ... add column if not exists` so
-- re-applying schema.sql over the Part 1 table is a no-op.
alter table public.groups add column if not exists is_private boolean not null default false;
alter table public.groups add column if not exists join_code  text;
create unique index if not exists groups_join_code_unique
  on public.groups (join_code) where join_code is not null;

-- Canonical form computed by the database, not promised by the caller. The
-- index is privacy-blind: names are globally unique across public and private.
create unique index if not exists groups_name_unique
  on public.groups (public.canonical_group_name(name));
create index if not exists idx_groups_created_by_created_at
  on public.groups (created_by, created_at desc);

create table if not exists public.group_members (
  id        uuid not null unique default extensions.gen_random_uuid(),
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);
create index if not exists idx_group_members_user_id
  on public.group_members (user_id);

-- Reports survive deletion of what they describe. Snapshots are the evidence.
create table if not exists public.abuse_reports (
  id                   uuid primary key default extensions.gen_random_uuid(),
  reporter_id          uuid not null references auth.users(id) on delete cascade,
  target_type          text not null check (target_type in ('group', 'profile')),
  target_group_id      uuid null references public.groups(id) on delete set null,
  target_user_id       uuid null references auth.users(id) on delete set null,
  snapshot_name        text not null default '',
  snapshot_description text not null default '',
  reason               text not null default '',
  created_at           timestamptz not null default timezone('utc', now())
);
create unique index if not exists abuse_reports_one_per_group
  on public.abuse_reports (reporter_id, target_group_id) where target_type = 'group';
create unique index if not exists abuse_reports_one_per_profile
  on public.abuse_reports (reporter_id, target_user_id) where target_type = 'profile';

create table if not exists public.user_blocks (
  id         uuid not null unique default extensions.gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

-- Append-only. Never deleted, so leaving a group cannot erase a creation (D19).
create table if not exists public.group_creation_log (
  id         uuid primary key default extensions.gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_group_creation_log_creator_created
  on public.group_creation_log (creator_id, created_at desc);

-- Server-owned feature flag and policy version (D20, D24)
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
-- seed: ('groups_enabled','false'), ('groups_policy_version','1')

create table if not exists public.policy_acceptances (
  user_id     uuid not null references auth.users(id) on delete cascade,
  policy_key  text not null,
  version     integer not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, policy_key, version)
);

create table if not exists public.moderation_terms (term text primary key);

-- Existing-table changes. Clean before constraining, or the ALTER fails.
update public.profiles
   set full_name = left(btrim(regexp_replace(full_name, '\s+', ' ', 'g')), 60)
 where full_name <> left(btrim(regexp_replace(full_name, '\s+', ' ', 'g')), 60);
alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 60);

-- Profile names are public UGC once Groups ships (D21). A BEFORE trigger, not an
-- RPC, because ProfileSettings and AuthProvider's OAuth hydration both write
-- this column directly and neither can be migrated without breaking old clients.
-- It normalises, strips control characters, and rejects denylisted terms.
create or replace function public.normalise_profile_name()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  NEW.full_name := left(btrim(regexp_replace(
    regexp_replace(coalesce(NEW.full_name, ''), '[-]', '', 'g'),
    '\s+', ' ', 'g')), 60);

  if exists (select 1 from public.moderation_terms t
              where lower(NEW.full_name) like '%' || t.term || '%') then
    raise exception 'name is not allowed' using errcode = '22023';
  end if;

  return NEW;
end;
$fn$;

drop trigger if exists profiles_normalise_name on public.profiles;
create trigger profiles_normalise_name
  before insert or update of full_name on public.profiles
  for each row execute function public.normalise_profile_name();

create index if not exists idx_sets_user_id_date on public.sets (user_id, date);
```

- **`group_members.id`** is an opaque per-membership identifier — what the board
  returns and what `block_group_member` accepts, so the client never handles an
  `auth.users` UUID. The composite primary key is unchanged.
- **`abuse_reports` does not cascade.** Both target FKs are `on delete set null`
  and the offending text is snapshotted at report time. Otherwise an abuser
  reported for an offensive group name could leave as the last member, the reap
  trigger would fire, and the group *and every report about it* would vanish.
- **`profiles.full_name`** has been private since the app began and has no
  constraint; Groups makes it public UGC served on every board fetch.
- `created_by` grants no privileges — a moderation breadcrumb only (D4).

---

## 5. Privileges and RLS

**Privileges first, RLS second.** RLS only filters rows a role may already touch,
and in Supabase every table is reachable over PostgREST, so a grant is a public API.

```sql
revoke all on public.groups             from anon, authenticated;
revoke all on public.group_members      from anon, authenticated;
revoke all on public.abuse_reports      from anon, authenticated;
revoke all on public.policy_acceptances from anon, authenticated;
revoke all on public.moderation_terms   from anon, authenticated;
revoke all on public.user_blocks        from anon, authenticated;
revoke all on public.group_creation_log from anon, authenticated;
revoke all on public.app_settings       from anon, authenticated;

alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.abuse_reports       enable row level security;
alter table public.user_blocks         enable row level security;
alter table public.policy_acceptances  enable row level security;
alter table public.moderation_terms    enable row level security;
alter table public.group_creation_log  enable row level security;
alter table public.app_settings        enable row level security;
```

**No table carries a policy, because no table carries a grant** (D25). Every
`create policy` elsewhere in `schema.sql` is preceded by a drop — the file is
re-applied on each E2E run — but Groups adds none.

**Why nothing is reachable.** A `select` policy on `groups` would still expose
`created_by` for every row: RLS is row-level, not column-level. A write policy
would bypass the RPCs entirely, skipping normalisation, quota, denylist and the
transactional membership insert, leaving an unreachable zero-member group in the
directory forever. And a readable `user_blocks` would hand back `blocked_id` —
an `auth.users` UUID — defeating the opaque-identifier rule that the rest of the
design maintains, while its foreign key gave a UUID-existence oracle on insert.
Granting nothing makes the RPCs the only path in or out. RLS stays enabled
underneath as defence in depth.

---

## 6. Helpers, trigger and RPCs

All functions use `set search_path = ''` with every relation fully qualified, and
each is followed by `revoke execute ... from public, anon` plus `grant execute
... to authenticated`. Postgres grants `EXECUTE` to `PUBLIC` by default, so
without the revoke an anonymous caller could enter the function.

**`security invoker` is the default (D23).** Only these are `definer`, because
only these must read rows the caller does not own: `create_group`, `join_group`,
`join_group_by_code`, `leave_group`, `list_groups`, `search_groups`,
`list_my_groups`, `fetch_group_leaderboard`, `report_group`, `report_profile`,
`block_group_member`, `list_blocks`, `unblock`, `accept_groups_policy`,
`groups_status`, `reap_empty_group` and `normalise_profile_name`. The two pure
helpers in 6.0 are `invoker`. `fetch_group_leaderboard` is additionally `STABLE`
(Part 4 review) so its membership gate and its row query share one snapshot.

**On the `auth.uid() is null` guards.** They stay as defence in depth, but they
are not observable through the API: with `EXECUTE` revoked from `anon`, an
anonymous request is rejected at the privilege layer and never enters the
function body, so a client can never receive `28000`. It is not part of the
client contract (see §10).

Where a signature or return type changes, the migration issues `drop function if
exists` first — `create or replace` cannot change a `RETURNS TABLE` shape.

### 6.0 Shared helpers

```sql
create or replace function public.canonical_group_name(p_name text)
returns text language sql immutable security invoker set search_path = '' as $fn$
  select lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')))
$fn$;

-- Two lock namespaces: one keyed by group, one by creator (D19).
create or replace function public.lock_group(p_group_id uuid)
returns void language sql security invoker set search_path = '' as $fn$
  select pg_catalog.pg_advisory_xact_lock(
    1, pg_catalog.hashtext(p_group_id::text))
$fn$;

create or replace function public.lock_creator(p_user_id uuid)
returns void language sql security invoker set search_path = '' as $fn$
  select pg_catalog.pg_advisory_xact_lock(
    2, pg_catalog.hashtext(p_user_id::text))
$fn$;
```

`canonical_group_name` is `immutable`, which is what lets it back the unique index.
Because the index and `create_group` both call it, `"Ski Club"`, `"ski club"` and
`" Ski  Club "` collide at the storage layer rather than by convention — an import
or dashboard insert cannot slip past it.

### 6.1 Reap trigger (D5)

```sql
create or replace function public.reap_empty_group()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.lock_group(OLD.group_id);
  if not exists (select 1 from public.group_members m
                  where m.group_id = OLD.group_id) then
    delete from public.groups where id = OLD.group_id;
  end if;
  return null;
end;
$fn$;

drop trigger if exists group_members_reap_empty on public.group_members;
create trigger group_members_reap_empty
  after delete on public.group_members
  for each row execute function public.reap_empty_group();
```

**A trigger, not logic in `leave_group`,** because it must also fire when a user
deletes their account and memberships cascade — a path no RPC sees.

**The lock is not optional.** Under Read Committed (Postgres's default, and
Supabase's), if members A and B leave concurrently, A's trigger still sees B's row
because B's delete is uncommitted, and B's symmetrically still sees A's. Neither
deletes the group; both commit; the result is a permanent zero-member group that
can never be reaped, because no future `group_members` delete will fire for it.
Join, leave and this trigger all take the same per-group advisory lock. Recursion
is safe: the cascade re-fires the trigger, but advisory locks are re-entrant within
a transaction and the subsequent delete matches nothing.

### 6.2 `create_group(p_name text, p_description text default '', p_private boolean default false)`

Argument list changed for `p_private` (D26) — `drop function` then recreate.

1. Reject if the feature flag is off (`hint = groups.disabled`) or the current
   policy version is unaccepted (`hint = groups.consent_required`).
2. `perform lock_creator(auth.uid())` — serialises the quota check below.
3. Compare on `canonical_group_name(p_name)`; store the display form
   `btrim(regexp_replace(p_name, '\s+', ' ', 'g'))`.
4. Validate name 2–40 chars, description ≤ 200 (`hint = groups.invalid_name` /
   `groups.invalid_description`). Null coalesces to `''` and fails the length
   check, not a not-null violation.
5. Reject names matching `moderation_terms` (`hint = groups.name_rejected`).
6. Quota (D19): ≥ 10 live groups in `groups` → `hint = groups.quota_exceeded`;
   ≥ 5 rows in `group_creation_log` for this creator in the past hour →
   `hint = groups.rate_limited`. Private groups count identically. **The hourly
   count comes from the log, not from `groups`** — a live-row count is defeated
   by creating and immediately leaving, which reaps the row and erases the evidence.
7. If `p_private`: generate a 6-digit code — `lpad((pg_catalog.floor(pg_catalog.random() * 1000000))::int::text, 6, '0')` — in a loop until it is unique among non-null `join_code`s, and set `is_private = true`. The `groups_join_code_unique` index is the backstop.
8. Insert the group, catching `unique_violation` on the name → `23505`.
9. **In the same transaction**, insert the creator's membership *and* a
   `group_creation_log` row. The membership is what guarantees a group can never
   exist with zero members; the log is what makes the rate limit real.
10. Return the group row **including `join_code`** (null for public), so the
    creator sees the code without a second call.

### 6.3 `join_group(p_group_id uuid)` / `join_group_by_code(p_code text)` / `leave_group(p_group_id uuid)`

**Join by id:** reject if unauthenticated (`28000`) or unconsented (`42501`);
**reject a private group with `hint = groups.code_required`** (a non-member has no
way to obtain a private group's id through any RPC, but the guard is explicit);
`perform lock_group`; **after** the lock, raise `P0002` if the group no longer
exists; `insert ... on conflict do nothing`. The lock plus post-lock check stops a
join racing the last leave and surfacing a raw `23503`.

**Join by code (D26):** reject if unauthenticated or unconsented; look up
`id` and `is_private` `where join_code = btrim(p_code)`; no row → `hint =
groups.invalid_code`. Then the same lock / post-lock existence check / `insert
... on conflict do nothing` as join-by-id. Works for a private group; also
accepts a public group's code if one were ever set, but only private groups have
one. **Not rate-limited (D27)** — the in-function guards do not include an
attempt counter, and this is deliberate.

**Leave:** reject if unauthenticated; `perform lock_group`; delete the caller's
membership. The reap trigger runs inside the same lock. Deleting a non-existent
membership is a silent no-op.

### 6.4 `list_groups()` / `search_groups()` / `list_my_groups()`

**`list_groups()`** — return shape unchanged (`group_id, group_name,
group_description, group_logo_key, member_count, is_member`). `order by
member_count desc, canonical_group_name asc`, `limit 200`, **`where
g.is_private = false`** (D26; parenthesise the existing block-filter OR chain so
`AND` binds correctly). Excludes groups whose creator is blocked in **either**
direction (D17). `member_count` counts all members including blocked ones (EC-12).

**`search_groups(p_query text)`** — same shape, **`where g.is_private = false`**
too, literal substring match on `canonical_group_name`, capped at 200. A private
group cannot be found by guessing its name. Search reaches every **public**
group (D13).

**`list_my_groups()`** (added in Part 3) — the caller's own memberships, no block
filter, no cap. Return shape gains **`is_private boolean, join_code text`** — a
`RETURNS TABLE` change, so `drop function` then recreate. It returns the real
`join_code` for a private group the caller is in, so the board shows the invite
code to any member (D28); `join_code` is null for public groups.

`list_groups` / `search_groups` do **not** carry `is_private` / `join_code` —
the directory has no reason to hand out a code, and every row it returns is
public. The client's shared row mapper defaults both fields (`is_private ??
false`, `join_code ?? null`) when they are absent.

### 6.5 `fetch_group_leaderboard(p_group_id uuid, p_period text, p_timezone text)`

```sql
returns table (membership_id uuid, member_name text, is_self boolean,
               slalom_count bigint, tricks_count bigint, jump_count bigint,
               other_count bigint, total_count bigint,
               window_start date, window_end date)
```

`window_start` / `window_end` (Part 4) repeat the resolved window on every row so
the board header shows the range without the client recomputing dates — the
client's window could drift from the server's (D8, D15). Marked `STABLE`.

1. Reject if unauthenticated (`28000`).
2. `p_period` must be `'7d'` or `'30d'` (`22023`) → `v_days := 6` or `29`.
3. `p_timezone` must exist in `pg_catalog.pg_timezone_names` (`22023`).
4. `v_end := (pg_catalog.now() at time zone p_timezone)::date; v_start := v_end - v_days;`
5. **Membership check** — no `group_members` row for the caller → `42501`. This is
   the single most important line in the feature: without it, `security definer`
   exposes every group's data to everyone.

```sql
select
  m.id,
  coalesce(nullif(btrim(p.full_name), ''), 'Skier'),
  (m.user_id = auth.uid()),
  count(s.id) filter (where s.event_type = 'slalom'),
  count(s.id) filter (where s.event_type = 'tricks'),
  count(s.id) filter (where s.event_type = 'jump'),
  count(s.id) filter (where s.event_type = 'other'),
  count(s.id)
from public.group_members m
left join public.profiles p on p.user_id = m.user_id
left join public.sets s on s.user_id = m.user_id
                       and s.date between v_start and v_end
where m.group_id = p_group_id
  and (m.user_id = auth.uid()
       or not exists (select 1 from public.user_blocks b
                       where (b.blocker_id = auth.uid() and b.blocked_id = m.user_id)
                          or (b.blocker_id = m.user_id and b.blocked_id = auth.uid())))
group by m.id, m.user_id, p.full_name
order by count(s.id) desc,
         coalesce(nullif(btrim(p.full_name), ''), 'Skier') asc;
```

- **No auth UUID leaves the database.** `membership_id` is opaque and scoped to one
  group, so a person can't be correlated across groups or name changes. `is_self`
  is computed server-side so the client can mark its own row.
- The block filter is **symmetric** (D17) and never removes the caller's own row.
- `count(s.id) filter` not `count(*) filter`: with the left join, a member with no
  sets yields one row of nulls that `count(*)` would tally as 1.
- `event_type` is check-constrained to four values, so the columns always sum to
  `total_count`. No extra index needed — it's filtered within rows already located
  by `idx_sets_user_id_date`.

### 6.6 Moderation and consent RPCs

- **`report_group(p_group_id, p_reason)`** — snapshots the group's current name and
  description, truncates the reason to 500 chars, `on conflict do nothing`.
- **`report_profile(p_membership_id, p_reason)`** — resolves the membership to a
  user internally; requires a shared group; snapshots the reported name.
- **`block_group_member(p_membership_id)`** — resolves the membership to a user
  internally, requires a shared group.
- **`list_blocks()`** — returns `(block_id uuid, display_name text, blocked_at
  timestamptz)`. No user id. This is the only way to see who you have blocked,
  and it is required, not optional: mutual blocking removes the blocked person
  from every board, so without this screen there is no row left to unblock from.
- **`unblock(p_block_id uuid)`** — takes the opaque id from `list_blocks`, not a
  user id.
- **`accept_groups_policy()`** — takes no version. It reads the current version
  from `app_settings` and records that, so the client never holds a version
  constant that can drift from the server's.
- **`groups_status()`** — returns `(enabled boolean, consent_needed boolean)`.
  The client asks this instead of duplicating the flag or version logic.

**All six moderation/consent RPCs are already deployed** (dormant behind the
flag). Part 5 wires `report_group`, `report_profile`, `block_group_member`,
`list_blocks` and `unblock` to a UI — no new RPC. The client wrappers already
exist in `src/data/groupsApi.ts` (Part 2). The one behavioural note for the UI:
`block_group_member` and `report_profile` raise `groups.invalid_handle` on a
stale membership id — the client refetches the board and retries (§10).

### 6.7 Part 5 hardening migration

A second Part 5 migration, separate from the moderation seed, settling security
items queued from earlier reviews. None are Groups-specific; all are cheap and a
Supabase advisor flags them at the release gate anyway.

- **Pin a `search_path` on the SECURITY DEFINER set functions**
  (`create_set_with_subtype`, `update_set_with_subtype` — the only two
  `security definer` functions outside Groups). Via `ALTER FUNCTION … SET
  search_path = pg_catalog, public` — the attribute in place, no body restated;
  `pg_catalog, public` (not `''`) keeps the existing unqualified `::event_type`
  cast resolving. The security goal is that a caller cannot prepend a schema.
- **`revoke execute … from anon`** on `create_set_with_subtype` /
  `update_set_with_subtype` — a signed-out caller has no legitimate use for
  either, and they are `definer`.
- **Swap the `join_code` generator to `extensions.gen_random_bytes`** rather than
  `random()` (`create_group`, §6.2 step 7). It is a discovery boundary, not
  access control (D27), but a CSPRNG source costs nothing and closes the
  automated-review finding.
- **Mark `list_groups`, `search_groups`, `list_my_groups` `STABLE`** — each runs
  one data query after an unchanging `auth.uid()` check, so `VOLATILE` is
  merely the wrong label (`knowledge/decisions/a-gated-read-rpc-must-be-stable`).

Every change is `create or replace`; the migration must survive a clean
`npx supabase db reset` and leave `npm run test:db` / `npm run test:run` green.

---

## 7. Client architecture

Not hydrated in `AuthProvider`, not written to localStorage, no in-memory memo
(D15). Each page loads on mount; each period switch refetches. Timezone is read per
fetch from `Intl.DateTimeFormat().resolvedOptions().timeZone`, falling back to `'UTC'`.

```
/groups        -> groupsApi.listGroups() + listMyGroups()        on mount
join           -> groupsApi.joinGroup(id)                         -> /groups/:id
join by code   -> groupsApi.joinGroupByCode(code)                 -> /groups/:id
/groups/:id    -> groupLeaderboardApi.fetchGroupLeaderboard(id, period, tz)
                                                  on mount + on period change
leave          -> groupsApi.leaveGroup(id) + refresh access       -> /groups

src/types/groups.ts                    Group (+ isPrivate, joinCode), GroupBoard, ...
src/features/groups/groupPeriod.ts     period -> display label only
src/features/groups/groupName.ts       client mirror of the name rules
src/features/groups/groupAvatar.ts     initials + deterministic colour
src/features/groups/leaderboardWindow.ts   window dates -> header label (Part 4)
src/features/groups/leaderboardRows.ts     rank + discipline breakdown (Part 4)
src/data/groupsApi.ts                  list / create / join / join-by-code / leave
src/data/groupLeaderboardApi.ts        leaderboard fetch
src/components/groups/GroupCard.tsx         (+ Private badge)
src/components/groups/GroupAvatar.tsx
src/components/groups/GroupJoinModal.tsx
src/components/groups/CreateGroupModal.tsx  (+ Make private toggle)
src/components/groups/JoinByCodeModal.tsx   6-digit input (new)
src/components/groups/InviteCodeCard.tsx    shows the code on the board (new)
src/components/groups/LeaderboardRow.tsx
src/components/groups/BoardPeriodToggle.tsx (Part 4)
src/components/groups/LeaveGroupDialog.tsx  (Part 4)
src/components/groups/GroupsConsentGate.tsx
src/components/groups/MemberActionSheet.tsx report / block a member (Part 5, new)
src/components/groups/ReportDialog.tsx      confirm + optional reason (Part 5, new)
src/components/groups/BlockedMembersList.tsx list + unblock (Part 5, new)
src/pages/Groups.tsx                   directory
src/pages/GroupLeaderboard.tsx         board
src/pages/PrivacySecurity.tsx          hosts BlockedMembersList (Part 5)
```

**Part 5 client surface (moderation).** All RPC wrappers already exist in
`groupsApi.ts`. New work is UI only:

- **`GroupJoinModal`** gains a "Report this group" link → `ReportDialog` →
  `reportGroup(id, reason)`.
- **`LeaderboardRow`** becomes tappable (it is static today) → `MemberActionSheet`
  with "Report member" (`reportProfile`) and "Block member" (`blockGroupMember`,
  then refetch the board). The sheet is a bottom action sheet, not inline
  controls — the row layout is fixed by the 360px / two-line constraint (§8).
- **`BlockedMembersList`** — a section inside `PrivacySecurity.tsx`, not a new
  route: `listBlocks()` on mount, each row an Unblock button (`unblock`).
  Mandatory because blocking is mutual — the blocked person leaves every board,
  so this is the only surviving unblock path (D17).

`groupsApi` calls `groups_status()` on directory mount and stores nothing about
the flag or policy version locally — the server owns both, so there is no
constant to drift.

`groupPeriod.ts` computes no dates — the server owns the window (D8); it maps the
period to a label and renders the range the RPC reports back. `groupName.ts`
mirrors the server rules for immediate feedback only and is not authoritative: JS
counts UTF-16 code units, Postgres counts code points, so an emoji-heavy name may
pass one and fail the other. The server wins; the client surfaces its `22023`.

---

## 8. UI

**Routes** `/groups` and `/groups/:id`, both inside `TabLayout` — matching how
`/insights/tricks-library` keeps the bar visible.

**Tab bar, 3 → 4.** `TabButton` is a fixed `w-24` (96px); four is 384px but a 375px
device has ~343px of inner bar width, so it must become `flex-1 min-w-0` with
`justify-between`. Add Groups third (D12), `isGroups = path.startsWith("/groups")`.
`TabLayout`'s `showTabs` must gain the same prefix or the bar disappears on the new
pages. The `data-tutorial="insights-tab"` anchor is unaffected.

**Directory** — in-memory search over the fetched list; **+ New group**; a
secondary **Join with a code** action opening `JoinByCodeModal`; cards with
initials avatar, name, truncated description, `N members`, "Joined" pill, and a
**Private** badge on the caller's own private groups (private groups only ever
reach the directory screen via `list_my_groups`). Loading skeleton,
error-with-retry, empty state.

**Join modal** — avatar, name, description, member count, **Join** (or **Open** if
already a member). First create-or-join routes through `GroupsConsentGate` (D20).
A quiet **Report this group** link at the foot opens `ReportDialog` (Part 5):
a confirmation with an optional one-line reason, calling `reportGroup`. Success
shows a brief "Thanks — we'll take a look" and closes; the report is
`on conflict do nothing`, so reporting twice is silently fine.

**Join-by-code modal** — a single 6-digit input; on submit calls
`joinGroupByCode`. `groups.invalid_code` → inline "That code didn't match a
group." Success → navigate to the board. Routes through `GroupsConsentGate` on a
first join like any other.

**Create modal** — name and description with live counters (40 / 200), client
validation mirroring the server, and a **Make this group private** toggle with a
line: "Private groups aren't listed. People join with a code you share." On
`groups.name_taken` the client reconciles **only if the caller is currently a
member** of a group by that name (works for private groups too, via
`listMyGroups`), and opens the join modal otherwise. Being the original creator
is not sufficient: there are no owners (D4). Creating a private group navigates
straight to its board, where the code is shown.

**Invite-code card** — on the board of a private group, visible to **any**
member (D28): the 6-digit code, a copy button, and one line — "Share this code
so people can join." Absent for public groups.

**Leaderboard**, two-line rows (D22):

```
<-  Ski Club A
    [ Last 7 days ][ Last 30 days ]      25-31 Aug · 12 members
+------------------------------------+
| 1  Damir Filaretov  *          14  |
|    SL 8 · TR 4 · JP 2              |
| 2  Anna Karlsson               11  |
|    SL 6 · TR 5                     |
| 4  Maria Costa                  0  |
|    no sets this period             |
+------------------------------------+   [ Leave group ]
```

- Line one is rank, name and total — the total is the ranked value, so it gets the
  weight and the right-hand anchor. Line two is `SL n · TR n · JP n · OT n` with
  zeros omitted; a member with nothing reads "no sets this period".
- Every number stays visible without a tap, which was the point of D7.
- The row is the touch target, opening `MemberActionSheet` — a bottom sheet with
  **Report member** and **Block member** (Part 5). A sheet, not inline controls,
  so it takes none of the row's width. Own row: no sheet (can't report/block
  yourself; the server refuses it anyway). Block → `blockGroupMember` then
  refetch, so the blocked member drops off immediately. Report → `ReportDialog`
  as above, via `reportProfile(membershipId, reason)`.

One line for all five numbers does not fit: rank 20px + five columns at 28px + a
name column leaves 3px of the 328px available on a 360px device for every gap and
padding, before counting the row control. Browser zoom is disabled in `index.html`,
so large-accessibility-text users would have no recourse.

**Avatar** — initials on a colour hashed from the group name, stable for every
viewer. `logo_key` is read and currently always null.

---

## 9. Consent, privacy and moderation

### 9.1 Versioned consent (D20)

Both existing paths collect agreement, and neither is usable here. Email sign-up
requires the policy checkbox at `Auth.tsx:108`; OAuth users get the gate in
`App.tsx` instead, because they never see the sign-up form. The problem is not
that anyone escaped consent — it is that **what they consented to was not
recorded**. `hasAcceptedPolicy` reads an unversioned boolean, so every existing
user passes forever, having agreed to a policy that said there were no social
features.

Consent is therefore taken at the point of the actual sharing: the first
`create_group`, `join_group` **or `join_group_by_code`**. `GroupsConsentGate`
presents the terms and calls `accept_groups_policy()`, which records **the
server's current version** — the client never holds a version constant of its
own, so the two cannot drift. All three RPCs reject an unconsented caller with
`hint = groups.consent_required`, and that rejection is enforced in the database,
not the UI, so a crafted call cannot skip it. This is tested directly, not only
through the screen.

### 9.2 Policy copy — ships in the same release

Update `public/policy.html`, `src/pages/PrivacySecurity.tsx`, and the gate copy.
Substance: joining a group shares your **profile name** and your **set counts,
broken down by event type** (slalom, tricks, jump, other) with other members of
that group. It never shares set contents, individual set dates, notes, scores or
technique details. Leaving stops it immediately. Counts include sets logged before
you joined (D9). The breakdown discloses more than a bare total — it reveals *which
disciplines* someone trains — which is why the wording must name it explicitly.

Private groups (D26, revised v4): the copy says a private group still shows in
the directory with a lock, but joining needs a 6-digit code its members share,
and that the **code keeps people from wandering in, not from getting in if a
member gives it to them** — it is not a password. The data shared among members
is identical to a public group.

Moderation, in the policy copy: names and descriptions are filtered before they
appear; members can report a group or another member's name, and block a member;
reports go to the team and are actioned within one business day; a violating
group is removed. Contact address for reports is stated (`iskilog@gmail.com`,
also in About).

`groups_policy_version` stays at `1` — the feature has never been live, so no
acceptance exists to invalidate. The copy is written once, complete, for launch.

### 9.3 Moderation

Public user-created names and descriptions are UGC. Apple guideline 1.2 and Google
Play's UGC policy both require filtering, reporting, blocking and a timely response.

| Requirement | Implementation |
|---|---|
| Filter before publication | `moderation_terms` denylist via `contains_denylisted_term` on **both** surfaces: `create_group` (name + description) and the `profiles.full_name` trigger (D21). Part 5 fixes the trigger to use the same literal, case-insensitive matcher the group path already uses, then seeds the terms |
| Report content | `report_group`, wired from the join modal (Part 5) |
| Report users | `report_profile`, wired from the member action sheet (Part 5) — profile names are UGC too |
| Block abusive users | `block_group_member` from the member action sheet, mutual, undoable via the blocked-members list in `PrivacySecurity` (`list_blocks` / `unblock`) (Part 5, D17) |
| Terms before posting | `accept_groups_policy` gate, enforced in the database (9.1) |
| Evidence retention | Non-cascading `abuse_reports` with text snapshots |
| Takedown | Delete the group in the dashboard, or flip `groups_enabled` off for a live incident (D24, EC-33) |
| Timely response | Runbook: daily dashboard check, one-business-day target, contact address in About and the policy |

Report volume is expected to be near zero, so there is no in-app queue. Removing a
group is a manual delete; the report survives it.

---

## 10. Error handling

Every RPC call gets a user-facing failure state and `captureHandledException`.
`withTimeoutRetry` is not used (D18).

**SQLSTATE alone is not a contract.** An earlier draft mapped `42501` to both
"not a member" and "policy not accepted", which produces a real bug: a member
with stale consent is shown "Join this group" instead of the consent screen. And
`22023` covered validation, quota, rate limit and denylist alike, so the UI could
not tell "name too long" from "you have made too many groups". Every RPC
therefore raises with a stable machine token in `HINT`, which `supabase-js`
surfaces as `error.hint`. **The client branches on the token, never the
SQLSTATE.**

| `hint` token | Client behaviour |
|---|---|
| `groups.disabled` | "Groups isn't available right now." Hide entry points |
| `groups.consent_required` | Open the consent screen |
| `groups.not_a_member` | "Join this group to see its leaderboard." |
| `groups.name_taken` | Reconcile first (§8); else "That name is already taken." |
| `groups.invalid_name` / `groups.invalid_description` | Field-level message |
| `groups.name_rejected` | "That name isn't allowed." |
| `groups.quota_exceeded` | "You've reached the limit of 10 groups." |
| `groups.rate_limited` | "You've created several groups recently. Try later." |
| `groups.not_found` | "This group no longer exists." Refresh the directory |
| `groups.invalid_handle` | Stale screen — refetch and retry |
| `groups.invalid_code` | "That code didn't match a group." Field-level, in the join-by-code modal |
| `groups.code_required` | A private group reached by id — should not occur from the client; treat as `invalid_code` |
| *(no hint)* | Network or unexpected — "Couldn't reach the server." + Retry |

`28000` is deliberately absent. With `EXECUTE` revoked from `anon`, an anonymous
call is refused at the privilege layer and never reaches the function body, so
the client cannot observe it; that path surfaces as a PostgREST permission error
and falls through to the auth gate. The in-function guards remain as defence in
depth only.

---

## 11. Edge cases

| ID | Case | Behaviour |
|---|---|---|
| EC-1 | `"Ski Club"` / `"ski club"` / `" Ski  Club "` | Later ones rejected. The index is built on `canonical_group_name()`, so this holds for dashboard and import writes too |
| EC-2 | Simultaneous creation of the same name | Unique index arbitrates; loser gets `23505` |
| EC-3 | Joining a group you're already in | Idempotent no-op; modal shows **Open** |
| EC-4 | Group reaped between directory load and tap | `P0002` after taking the lock |
| EC-5 | **Two members leave simultaneously** | Serialised by `lock_group`; the second sees the first's commit and reaps. Without the lock this left a permanent orphan |
| EC-6 | Last member leaves | Group deleted; directory no longer lists it |
| EC-7 | Non-member opens `/groups/:id`, or a nonexistent id | Both `42501` — indistinguishable to a non-member, which is the desired posture |
| EC-8 | Member logged no sets in the window | Bottom of the board, "no sets this period" (D11, D22) |
| EC-9 | Blank `profiles.full_name` | Displays as "Skier" |
| EC-10 | Tie on total | Name ascending; the breakdown never affects ordering |
| EC-11 | 10MB profile name | Rejected by `profiles_full_name_length` (D21) |
| EC-12 | You blocked a member | Symmetric: neither sees the other. `member_count` still counts them — **accepted inconsistency**, since a per-viewer count would leak the block's existence |
| EC-13 | Member deletes their account | Memberships cascade; trigger reaps under the lock; reports survive with snapshots and a null target |
| EC-14 | User edits their name | Visible to every group on the next fetch, capped at 60 chars |
| EC-15 | User deletes sets | Counts drop on the next fetch |
| EC-16 | Offline | Error-with-retry. No cached fallback (D15) |
| EC-17 | Crafted period, or a single-day window | `'all'` → `22023`. A single day is **impossible** — the client cannot express dates |
| EC-18 | Crafted or absent timezone | Validated against `pg_timezone_names`; worst case shifts the window one day |
| EC-19 | Rejoining after leaving | Immediate; backfill restores the real count (D9, D14) |
| EC-20 | Members in different timezones | Each viewer's board is computed in their own zone; `sets.date` is already a local calendar date |
| EC-21 | One account creates 50,000 groups | Blocked at 10 live / 5 per hour (D19); browse capped at 200, but search still reaches every group (D13) |
| EC-22 | Self-block attempted | Rejected by the RPC guard and `user_blocks_no_self` |
| EC-28 | Creator makes a group, leaves, repeats | The hourly limit counts `group_creation_log`, which is never deleted, so the fifth attempt is refused even though no group survives |
| EC-29 | Two creates at once at nine live groups | `lock_creator` serialises check-and-insert; the second sees ten and is refused |
| EC-30 | Blocking someone removes their row | The blocked-users screen (`list_blocks`) is the unblock path; without it the block would be irreversible |
| EC-31 | Abusive `profiles.full_name` | Rejected on write by the profiles trigger — the group-name denylist alone does not cover it (D21) |
| EC-32 | Direct PostgREST write to `profiles` | Still passes through the trigger; filtering cannot be bypassed by skipping the UI |
| EC-33 | Abuse incident after launch | `app_settings.groups_enabled` is flipped false. `create_group`, `join_group` and `join_group_by_code` refuse with `groups.disabled`; `leave_group`, the board, `list_my_groups` and the moderation RPCs keep working, deliberately, so members already inside are not trapped (D24, `knowledge/decisions/the-kill-switch-stops-spread-not-escape`) |
| EC-23 | Abuser reported, then leaves as last member | Group reaped; report survives with its snapshot and a null `target_group_id` |
| EC-24 | Existing user who accepted the old policy | Must pass `GroupsConsentGate` before their first create or join (D20) |
| EC-25 | Emoji name passing client but failing server | Server's `22023` surfaced verbatim; the client is not authoritative |
| EC-26 | `create_group` commits but the response is lost | Retry hits `23505`; client detects existing membership and navigates there (D18). Holds for a private create — `listMyGroups` finds it |
| EC-27 | Anonymous caller invokes any RPC | `EXECUTE` revoked from `anon`; denied before the body runs |
| EC-34 | Private group in browse or search | **Appears** (v4), flagged `is_private`, never with `join_code`. The client shows a lock; a tap opens the code prompt. `join_group` still refuses the id (`groups.code_required`); `join_group_by_code` is the only way in |
| EC-35 | Wrong or made-up join code | `groups.invalid_code`; field-level message. A right code for a reaped group hits the post-lock `P0002` → `groups.not_found` |
| EC-36 | Code collision at generation | `create_group` retries in a loop; `groups_join_code_unique` is the backstop |
| EC-37 | Create a name that collides with a hidden private group | `groups.name_taken` — reveals a private group by that name exists (existence-by-name oracle). Accepted (D27) |
| EC-38 | `join_group(private_id)` with a guessed/leaked UUID | `groups.code_required`. The id itself is 122-bit unguessable and no RPC hands it to a non-member |
| EC-39 | Private group's creator leaves; others remain | The code is still shown to every remaining member (D28) — no owner, no orphaned code |
| EC-40 | Script enumerates 6-digit codes against `join_group_by_code` | **Not mitigated** (D27). "Private" is a discovery boundary; ~1M codes is enumerable. Documented, deliberate |

---

## 12. Testing

**Database boundary tests — new, and gating.** These need **two layers**, because
they answer different questions and neither substitutes for the other:

*Layer 1 — direct Postgres* (`pg`, admin connection). Locks, triggers, the
concurrency cases, and catalogue assertions. Two real connections are required
for the race tests; a single-threaded version passes whether or not the bug
exists.

*Layer 2 — through PostgREST* (`supabase-js` with real user sessions). Grants,
JWT handling, schema-cache exposure, and — critically — **the exact error shape
the client will branch on.** A SQL-level test can confirm a function raises with
a given hint while the real API returns a permission error the client never
handles.

Coverage:

- Direct `select` and every direct write on all eight Groups tables fails for
  `authenticated` — `user_blocks` included, since it is no longer an exception.
- Direct cross-user reads of `profiles` and `sets` fail.
- Every RPC is unreachable for `anon`, asserted through the API, not by expecting
  an in-function error code.
- A non-member calling `fetch_group_leaderboard` gets `groups.not_a_member`.
- **Consent cannot be bypassed:** a crafted `create_group` / `join_group` from an
  unconsented user is refused at the database, without the screen involved.
- Only `'7d'` and `'30d'` are accepted; an invalid timezone is rejected.
- No response from any RPC contains an `auth.users` UUID.
- ACL catalogue: no `EXECUTE` for `public`/`anon` on any Groups function; no table
  privileges for either role on any Groups table; every helper is `invoker` and
  only the listed functions are `definer`.
- Profile-name filtering holds on a direct PostgREST update and on an
  OAuth-shaped write, not only through `ProfileSettings`.
- **Concurrency:** two sessions leaving a two-member group simultaneously leave no
  orphan; two concurrent creates at the quota edge produce ten, not eleven;
  create-leave-repeat still trips the hourly limit; a join racing the last leave
  returns `groups.not_found`; account-deletion cascade reaps correctly.
- Flipping `groups_enabled` false makes `create_group` / `join_group` /
  `join_group_by_code` refuse — and leaves `leave_group` and the board working
  (the DB suite must be independent of the flag's resting state — it captures and
  restores `groups_enabled` per test).
- **Private groups:** `create_group(..., p_private => true)` returns a 6-digit
  `join_code`; the group is absent from `list_groups` and `search_groups` and
  cannot be found by name; `join_group_by_code` with the right code joins, with a
  wrong code raises `groups.invalid_code`; `join_group` on a private id raises
  `groups.code_required`; `list_my_groups` returns the code to a member; a
  consent-less caller is still refused; the generator produces distinct codes
  across many creates.

**Unit (vitest).** `groupPeriod` labels; `groupName` trim / whitespace / bounds plus
a shared Unicode corpus checked against the server rules; `groupAvatar` initials and
stable colour; `leaderboardWindow` range formatting; `leaderboardRows` shaping —
server order kept, rank, discipline breakdown with zeros omitted and summing to
the total, own-row marking, "no sets this period"; a `joinCode` format guard if
one lands in a pure module.

**E2E (`tests/e2e/specs/groups.spec.ts`).** Requires **two users in one test** —
every existing spec is single-user, so `tests/e2e/utils/auth.ts` needs a
second-context helper.

1. A creates a group; it appears in B's directory.
2. A name differing only by case or whitespace is rejected.
3. B is stopped by the consent gate, accepts, then joins.
4. A logs a slalom set; B's 7-day board shows A's `SL` and total each up by one,
   other disciplines unchanged. Repeat for one more event type.
5. Toggling to 30 days refetches and widens the counts and the header range.
6. A member with no sets reads "no sets this period".
7. B leaves; the group persists for A. A leaves as last member; it vanishes.
8. A non-member navigating to `/groups/:id` sees the join prompt.
9. A creates a **private** group; it **is** in B's directory with a lock, but a
   one-tap join is refused — B needs the code. A reads the code off the board; B
   joins with it; a wrong code is rejected.
10. B reports A's group from the join modal; the report lands in `abuse_reports`
    with the name/description snapshot. B blocks A from the member sheet; A drops
    off B's board and B off A's; B unblocks A from `PrivacySecurity` and A
    returns. (Part 5 / Part 6.)

**Schema.** `schema.sql` — re-applied on every E2E run, so every statement is
`if not exists` / `create or replace` / `drop ... if exists` first. Private
groups add two `alter table ... add column if not exists`, one partial unique
index, and `join_group_by_code`; `create_group` and `list_my_groups` are
`drop function` then recreate. Verify a second consecutive `npm run
e2e:db:prepare` succeeds.

---

## 13. Rollout

**Staged, and reversible at every step (D24).** Shipping the schema with working
grants would expose create/join/report to any crafted client before the terms and
moderation path exist — and on native that window is days, not minutes.

1. **Schema, disabled.** Tables, helpers, triggers, RPCs, the
   `profiles.full_name` clean-then-constrain, and `groups_enabled = false`.
   Every mutating RPC refuses. Nothing is reachable. **Partly done** —
   `20260903160619` + `20260903164850` pushed 2026-09-03. Still to push:
   `20260903175342` (private groups) and the two Part 5 migrations, together,
   after review.
2. **Policy and moderation live** — copy published, contact address up, runbook
   written, denylist seeded + hardening applied (`20260903194544` +
   `20260903195701`). Migrations written and green locally; push pending.
3. **Client shipped**, web and both native builds, still seeing `disabled`
   and hiding its entry points.
4. **Flip the flag.** One row in `app_settings`, reversible in seconds.

Schema is Supabase CLI migrations
(`knowledge/decisions/the-database-is-managed-by-supabase-migrations`); each
migration must survive a clean `npx supabase db reset` and is committed with the
code that needs it. **No `db push` to production without the maintainer's
explicit go-ahead.** `npx cap sync android` and `npx cap sync ios` before native
builds. Run the Supabase security advisors and re-check effective grants before
step 4.

The build order is the six-part implementation plan
(`docs/superpowers/plans/2026-08-31-groups-implementation-plan.md`), plus the
detailed Part 5 plan (`docs/superpowers/plans/2026-09-03-groups-part5-*.md`).
As built:

| Part | Contents | Status |
|---|---|---|
| 1 | Schema + security boundary, RPC bodies as real SQL, DB boundary suite | done |
| 2 | Types, pure helpers, `groupsApi` / `groupLeaderboardApi` | done |
| 3 | Directory, cards, create + join modals, consent gate, tab bar 3→4, routes | done |
| 4 | Leaderboard, period toggle, resolved window, Leave | done |
| 4.5 | Private groups — `is_private` / `join_code`, `join_group_by_code`, create toggle, join-by-code modal, invite-code card | done |
| **5** | **Moderation + policy + hardening** — denylist fixes & seed, `report_*` + block/unblock wiring, member sheet, blocked-members list, policy copy in three places, About contact, runbook, hardening migration | **next** |
| 6 | Two-user E2E harness + `groups.spec.ts`, 360px project, staged release | pending |

Part 1's SQL was written and reviewed as real SQL before anything else — prose
descriptions of a security boundary cannot be audited. Part 4.5 and the Part 5
migrations follow the same rule.

---

## 14. Open risks

- **The membership check in §6.5 step 5 is the whole privacy posture.** It gets a
  dedicated database-level test, not just UI coverage.
- **No component-test harness exists.** There is no `@testing-library`, no jsdom,
  and no vitest `environment` — so UI-state coverage has nowhere to live today.
  Rather than introduce a DOM stack to a repo with none, keep pure view-model
  logic in vitest and put UI behaviour in Playwright.
- **Playwright runs one desktop project at 1280×900.** The two-line row exists
  because of a 360px constraint that currently has no automated coverage at all.
  A 360×800 project is required, not optional.
- **Public UGC carries ongoing cost.** Filtering, reporting, blocking and retention
  are implemented, but response is a manual runbook. Both stores expect timely
  action — a commitment of your time.
- **Store review is the real gate on launch (v5).** Groups ships in the native
  builds, so Apple 1.2 / Google Play UGC review will check for a working report
  control, a working block control, a published contact, and stated terms. All
  four exist after Part 5; the risk is a reviewer wanting them more prominent, or
  wanting the blocked-users screen easier to find than inside Privacy & Security.
  Cheap to move if asked.
- **The two-user E2E harness and the boundary suite are new ground** and may take
  longer than the feature code they verify.
- **The advisory-lock pattern is new to this codebase** and must be exercised by
  real concurrent tests; a single-threaded test passes either way.
- **A private group's join code is enumerable (D27).** ~1M codes, no rate limit —
  a script can walk into every private group given time. This is a deliberate
  product call: "private" means unlisted, not sealed. If that stops being
  acceptable, the mitigation is a longer alphanumeric code or an attempt log with
  a per-user lock, both additive. The policy copy is written so it never claims
  more than "unlisted".
