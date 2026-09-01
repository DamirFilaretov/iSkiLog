# Groups — Design Spec

**Date:** 2026-08-31 · **Version:** 2 · **Status:** Approved, ready for planning

Revised after an adversarial review (`docs/groups_findings.md`): 14 findings, 12
accepted in full or reduced scope. Rejected: the claim that `create_group(NULL,'')`
yields an unmapped `23502` (§6.2 coalesces, giving the documented `22023`), and
wrapper functions in front of private definers. Server-side directory pagination
was reduced to a hard cap plus a creation quota.

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
| D2 | Directory visibility | Public — every user sees every group |
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

---

## 3. Scope boundaries

**Not planned:** admin roles, moderators, kicking members; invite codes and private
groups; group chat, comments or reactions; notifications.

**Deferred:** group logo upload (needs a Storage bucket and image pipeline); a
tutorial step for Groups; sorting the board by discipline; server-side directory
search and pagination once 200 is limiting; an in-app moderation queue if report
volume ever justifies one. Self-reported counts are gameable — accepted at club scale.

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

-- Canonical form computed by the database, not promised by the caller
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
    regexp_replace(coalesce(NEW.full_name, ''), '[ -]', '', 'g'),
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
`leave_group`, `list_groups`, `search_groups`, `fetch_group_leaderboard`,
`report_group`, `report_profile`, `block_group_member`, `list_blocks`,
`unblock`, `accept_groups_policy`, `groups_status`, `reap_empty_group` and
`normalise_profile_name`. The two pure helpers in 6.0 are `invoker`.

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

### 6.2 `create_group(p_name text, p_description text default '')`

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
   `hint = groups.rate_limited`. **The hourly count comes from the log, not from
   `groups`** — a live-row count is defeated by creating and immediately leaving,
   which reaps the row and erases the evidence.
7. Insert the group, catching `unique_violation` → `23505`.
8. **In the same transaction**, insert the creator's membership *and* a
   `group_creation_log` row. The membership is what guarantees a group can never
   exist with zero members; the log is what makes the rate limit real.

### 6.3 `join_group(p_group_id uuid)` / `leave_group(p_group_id uuid)`

**Join:** reject if unauthenticated (`28000`) or unconsented (`42501`);
`perform lock_group`; **after** the lock, raise `P0002` if the group no longer
exists; `insert ... on conflict do nothing`. The lock plus post-lock check stops a
join racing the last leave and surfacing a raw `23503`.

**Leave:** reject if unauthenticated; `perform lock_group`; delete the caller's
membership. The reap trigger runs inside the same lock. Deleting a non-existent
membership is a silent no-op.

### 6.4 `list_groups()`

```sql
returns table (group_id uuid, group_name text, group_description text,
               group_logo_key text, member_count bigint, is_member boolean)
```

`order by member_count desc, canonical_group_name asc`, `limit 200`. Excludes
groups whose creator is blocked in **either** direction, matching D17.
`member_count` counts all members including blocked ones (EC-12).

**`search_groups(p_query text)`** takes the same return shape, matches on
`canonical_group_name(name) like '%' || canonical_group_name(p_query) || '%'`,
and is also capped at 200. It exists because a browse-only cap is not a
directory: without it, group 201 would be invisible *and* unfindable, and
20 accounts at the 10-group quota could bury every legitimate group beneath
padding. Browse shows what is popular; search reaches everything (D13).

### 6.5 `fetch_group_leaderboard(p_group_id uuid, p_period text, p_timezone text)`

```sql
returns table (membership_id uuid, member_name text, is_self boolean,
               slalom_count bigint, tricks_count bigint, jump_count bigint,
               other_count bigint, total_count bigint)
```

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

---

## 7. Client architecture

Not hydrated in `AuthProvider`, not written to localStorage, no in-memory memo
(D15). Each page loads on mount; each period switch refetches. Timezone is read per
fetch from `Intl.DateTimeFormat().resolvedOptions().timeZone`, falling back to `'UTC'`.

```
/groups      -> groupsApi.listGroups()                        on mount
join         -> groupsApi.joinGroup(id)                       -> /groups/:id
/groups/:id  -> groupLeaderboardApi.fetchBoard(id, period, tz)
                                                on mount + on period change
leave        -> groupsApi.leaveGroup(id)                      -> /groups

src/types/groups.ts                    Group, LeaderboardRow, GroupPeriod
src/features/groups/groupPeriod.ts     period -> display label only
src/features/groups/groupName.ts       client mirror of the name rules
src/features/groups/groupAvatar.ts     initials + deterministic colour
src/data/groupsApi.ts                  list / create / join / leave / report / block
src/data/groupLeaderboardApi.ts        leaderboard fetch
src/components/groups/GroupCard.tsx
src/components/groups/GroupAvatar.tsx
src/components/groups/GroupJoinModal.tsx
src/components/groups/CreateGroupModal.tsx
src/components/groups/LeaderboardRow.tsx
src/components/groups/GroupsConsentGate.tsx
src/pages/Groups.tsx                   directory
src/pages/GroupLeaderboard.tsx         board
src/pages/BlockedUsers.tsx             manage + undo blocks (D17)
```

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

**Directory** — in-memory search over the fetched list; **+ New group**; cards with
initials avatar, name, truncated description, `N members`, "Joined" pill. Loading
skeleton, error-with-retry, empty state.

**Join modal** — avatar, name, description, member count, **Join** (or **Open** if
already a member), and a **Report** link. First create-or-join routes through
`GroupsConsentGate` (D20).

**Create modal** — name and description with live counters (40 / 200), client
validation mirroring the server. On `groups.name_taken` the client reconciles
**only if the caller is currently a member** of a group by that name, and opens
the join modal otherwise. Being the original creator is not sufficient: there are
no owners (D4), so a creator who left while others stayed would be navigated to a
board they cannot read.

**Blocked-users screen**, reached from Settings, backed by `list_blocks` and
`unblock`. Not optional: blocking is mutual, so the blocked person vanishes from
every board, and this is the only remaining place to undo it.

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
- The row is the touch target, opening a member sheet with **Block** and **Report**
  — a 44pt target that doesn't compete for row width.

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
`create_group` or `join_group`. `GroupsConsentGate` presents the terms and calls
`accept_groups_policy()`, which records **the server's current version** — the
client never holds a version constant of its own, so the two cannot drift. Both
RPCs reject an unconsented caller with `hint = groups.consent_required`, and that
rejection is enforced in the database, not the UI, so a crafted call cannot skip
it. This is tested directly, not only through the screen.

### 9.2 Policy copy — ships in the same release

Update `public/policy.html`, `src/pages/PrivacySecurity.tsx`, and the gate copy.
Substance: joining a group shares your **profile name** and your **set counts,
broken down by event type** (slalom, tricks, jump, other) with other members of
that group. It never shares set contents, individual set dates, notes, scores or
technique details. Leaving stops it immediately. Counts include sets logged before
you joined (D9). The breakdown discloses more than a bare total — it reveals *which
disciplines* someone trains — which is why the wording must name it explicitly.

### 9.3 Moderation

Public user-created names and descriptions are UGC. Apple guideline 1.2 and Google
Play's UGC policy both require filtering, reporting, blocking and a timely response.

| Requirement | Implementation |
|---|---|
| Filter before publication | `moderation_terms` denylist on **both** surfaces: `create_group`, and the `profiles` trigger (D21). Group names alone are not the whole attack surface — a display name reaches every shared board |
| Report content | `report_group` |
| Report users | `report_profile` — profile names are UGC too |
| Block abusive users | `block_group_member`, mutual, undoable via `list_blocks` / `unblock` (D17) |
| Terms before posting | `accept_groups_policy` gate, enforced in the database (9.1) |
| Evidence retention | Non-cascading `abuse_reports` with text snapshots |
| Takedown | Delete the group in the dashboard, or flip `groups_enabled` off for a live incident (D24) |
| Timely response | Runbook: daily dashboard check, 24-hour target, contact address in About |

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
| EC-33 | Abuse incident after launch | `app_settings.groups_enabled` is flipped false; every RPC refuses with `groups.disabled` and no app release is needed (D24) |
| EC-23 | Abuser reported, then leaves as last member | Group reaped; report survives with its snapshot and a null `target_group_id` |
| EC-24 | Existing user who accepted the old policy | Must pass `GroupsConsentGate` before their first create or join (D20) |
| EC-25 | Emoji name passing client but failing server | Server's `22023` surfaced verbatim; the client is not authoritative |
| EC-26 | `create_group` commits but the response is lost | Retry hits `23505`; client detects existing membership and navigates there (D18) |
| EC-27 | Anonymous caller invokes any RPC | `EXECUTE` revoked from `anon`; denied before the body runs |

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
- Flipping `groups_enabled` false makes every mutating RPC refuse.

**Unit (vitest).** `groupPeriod` labels; `groupName` trim / whitespace / bounds plus
a shared Unicode corpus checked against the server rules; `groupAvatar` initials and
stable colour; row shaping — descending by total, name tie-break, zeros last,
own-row marking, disciplines summing to the total, zero-suppression on line two.

**E2E (`tests/e2e/specs/groups.spec.ts`).** Requires **two users in one test** —
every existing spec is single-user, so `tests/e2e/utils/auth.ts` needs a
second-context helper.

1. A creates a group; it appears in B's directory.
2. A name differing only by case or whitespace is rejected.
3. B is stopped by the consent gate, accepts, then joins.
4. A logs a slalom set; B's 7-day board shows A's `SL` and total each up by one,
   other disciplines unchanged. Repeat for one more event type.
5. Toggling to 30 days refetches and widens the counts.
6. A member with no sets reads "no sets this period".
7. B blocks A; neither sees the other; `member_count` unchanged.
8. B leaves; the group persists for A. A leaves as last member; it vanishes.
9. A non-member navigating to `/groups/:id` sees the join prompt.

**Schema.** `schema.sql` gains six tables, the privilege block, policies (each
preceded by a drop), two helpers, the trigger and eleven RPCs. Verify a second
consecutive `npm run e2e:db:prepare` succeeds — the missing `drop policy if exists`
would have broken exactly that.

---

## 13. Rollout

**Staged, and reversible at every step (D24).** Shipping the schema with working
grants would expose create/join/report to any crafted client before the terms and
moderation path exist — and on native that window is days, not minutes.

1. **Schema, disabled.** Tables, helpers, triggers, RPCs, the
   `profiles.full_name` clean-then-constrain, and `groups_enabled = false`.
   Every RPC refuses. Nothing is reachable.
2. **Policy and moderation live** — copy published, contact address up, runbook
   written, denylist seeded.
3. **Client shipped**, web and both native builds, still seeing `disabled`
   and hiding its entry points.
4. **Flip the flag.** One row in `app_settings`, reversible in seconds.

This repo has no Supabase CLI migration directory; schema is applied by
re-running `schema.sql`, so each stage must be independently re-runnable.
`npx cap sync android` and `npx cap sync ios` before native builds. Run the
Supabase security advisors and re-check effective grants before step 4.

| Phase | Contents |
|---|---|
| 1 | Complete migration SQL — every RPC body written out, not described |
| 2 | Database boundary suite (§12). **Gates all client work** |
| 3 | Types, `groupPeriod`, `groupName`, `groupAvatar` + unit tests |
| 4 | `groupsApi`, `groupLeaderboardApi` |
| 5 | Directory, cards, create and join modals, consent gate |
| 6 | Leaderboard, period toggle, member sheet, leave, block, report |
| 7 | Tab bar 3→4, `showTabs`, routes |
| 8 | Policy copy and the moderation runbook |
| 9 | Two-user E2E harness and `groups.spec.ts` |

Phase 1 is written and reviewed as real SQL before anything else starts — prose
descriptions of a security boundary cannot be audited. Phase 2 gates phases 3
onward. Phase 7 is independent and can land early behind an unreferenced route.

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
- **The two-user E2E harness and the boundary suite are new ground** and may take
  longer than the feature code they verify.
- **The advisory-lock pattern is new to this codebase** and must be exercised by
  real concurrent tests; a single-threaded test passes either way.
