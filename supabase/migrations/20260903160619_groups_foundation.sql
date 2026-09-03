-- Groups feature: tables, RPCs, triggers, moderation and consent.
-- Extracted verbatim from tests/e2e/db/schema.sql (Groups section, Parts 1-4)
-- when the project moved to migration-based schema management.
-- Ships with app_settings.groups_enabled = 'false'.
--
-- Built from create-or-replace / if-not-exists / drop+recreate statements, so a
-- fresh apply and a re-apply over an already-migrated database both converge.
-- Two known defects are carried forward unchanged and MUST be fixed before
-- moderation_terms is seeded (see docs/obsidianVault/00-home/current_priorities.md,
-- "Blockers before Groups Part 5"):
--   1. normalise_profile_name() matches the denylist with an un-lowercased
--      LIKE pattern; the group path uses contains_denylisted_term(). They disagree.
--   2. The profiles full_name backfill runs after the trigger is created, so a
--      re-apply against a populated moderation_terms can abort mid-migration.

-- ============================================================
-- Groups feature
-- ============================================================

-- Canonical name: the single definition of "the same name" (D3).
-- Immutable so it can back the unique index; invoker because it reads nothing.
create or replace function public.canonical_group_name(p_name text)
returns text language sql immutable security invoker set search_path = '' as $fn$
  select lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')))
$fn$;

-- Two advisory-lock namespaces so group and creator locks never collide.
create or replace function public.lock_group(p_group_id uuid)
returns void language sql security invoker set search_path = '' as $fn$
  select pg_catalog.pg_advisory_xact_lock(1, pg_catalog.hashtext(p_group_id::text))
$fn$;

create or replace function public.lock_creator(p_user_id uuid)
returns void language sql security invoker set search_path = '' as $fn$
  select pg_catalog.pg_advisory_xact_lock(2, pg_catalog.hashtext(p_user_id::text))
$fn$;

create table if not exists public.groups (
  id          uuid primary key default extensions.gen_random_uuid(),
  name        text not null,
  description text not null default '',
  logo_key    text null,
  created_by  uuid null references auth.users(id) on delete set null,
  created_at  timestamptz not null default timezone('utc', now())
);

-- Private groups (D26). is_private drops the group from list_groups /
-- search_groups; join_code is a 6-digit string, null for public groups. Added
-- by `add column if not exists` so re-applying over the Part 1 table is a no-op.
alter table public.groups add column if not exists is_private boolean not null default false;
alter table public.groups add column if not exists join_code  text;

-- The code is looked up by join_group_by_code, so it must be unique. Partial:
-- every public group has a null code and null is not "equal" under a unique index.
create unique index if not exists groups_join_code_unique
  on public.groups (join_code) where join_code is not null;

-- Built on the helper, so dashboard and import writes collide too (EC-1). The
-- name index is privacy-blind: names are globally unique across public and private.
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

-- Privileges first, RLS second. In Supabase a grant is a public API, so the
-- only safe posture is granting nothing: the RPCs are the sole way in or out.
revoke all on public.groups        from anon, authenticated;
revoke all on public.group_members from anon, authenticated;

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
-- No policies: no table carries a grant, so none needs one.

-- Server-owned feature flag and policy version (D20, D24). Seeded with
-- on-conflict-do-nothing so re-running this file never resets a flipped flag.
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

insert into public.app_settings (key, value) values
  ('groups_enabled', 'false'),
  ('groups_policy_version', '1')
on conflict (key) do nothing;

create table if not exists public.policy_acceptances (
  user_id     uuid not null references auth.users(id) on delete cascade,
  policy_key  text not null,
  version     integer not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, policy_key, version)
);

create table if not exists public.moderation_terms (term text primary key);

revoke all on public.app_settings       from anon, authenticated;
revoke all on public.policy_acceptances from anon, authenticated;
revoke all on public.moderation_terms   from anon, authenticated;

alter table public.app_settings       enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.moderation_terms   enable row level security;

create or replace function public.groups_policy_version()
returns integer language sql stable security definer set search_path = '' as $fn$
  select coalesce(
    (select value::integer from public.app_settings where key = 'groups_policy_version'),
    1)
$fn$;

create or replace function public.groups_enabled()
returns boolean language sql stable security definer set search_path = '' as $fn$
  select coalesce(
    (select value = 'true' from public.app_settings where key = 'groups_enabled'),
    false)
$fn$;

-- The client asks for status rather than holding its own copy of the flag or
-- the policy version, so the two can never drift apart.
create or replace function public.groups_status()
returns json language sql stable security definer set search_path = '' as $fn$
  select json_build_object(
    'enabled', public.groups_enabled(),
    'consent_needed', not exists (
      select 1 from public.policy_acceptances a
       where a.user_id = auth.uid()
         and a.policy_key = 'groups'
         and a.version >= public.groups_policy_version()))
$fn$;

-- Records the server's version. accepted_at is defaulted server-side, so the
-- timestamp is never client-supplied.
create or replace function public.accept_groups_policy()
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.policy_acceptances (user_id, policy_key, version)
  values (auth.uid(), 'groups', public.groups_policy_version())
  on conflict do nothing;
end;
$fn$;

revoke execute on function public.groups_policy_version() from public, anon;
revoke execute on function public.groups_enabled()        from public, anon;
revoke execute on function public.groups_status()         from public, anon;
revoke execute on function public.accept_groups_policy()  from public, anon;
grant  execute on function public.groups_status()         to authenticated;
grant  execute on function public.accept_groups_policy()  to authenticated;

-- A trigger rather than logic inside leave_group, because it must also fire
-- when a user deletes their account and memberships cascade away - a path no
-- RPC ever sees.
--
-- The lock is not optional. Under Read Committed, two members leaving
-- concurrently each still see the other's uncommitted row, so neither deletes
-- the group: it survives with zero members, in the public directory, and can
-- never be reaped because no future delete will fire for it.
create or replace function public.reap_empty_group()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.lock_group(OLD.group_id);

  if not exists (
    select 1 from public.group_members m where m.group_id = OLD.group_id
  ) then
    delete from public.groups where id = OLD.group_id;
  end if;

  return null;
end;
$fn$;

drop trigger if exists group_members_reap_empty on public.group_members;
create trigger group_members_reap_empty
  after delete on public.group_members
  for each row execute function public.reap_empty_group();

-- Append-only. Never deleted, so creating a group and immediately leaving
-- cannot erase the evidence and reset the hourly limit (D19).
create table if not exists public.group_creation_log (
  id         uuid primary key default extensions.gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_group_creation_log_creator_created
  on public.group_creation_log (creator_id, created_at desc);

revoke all on public.group_creation_log from anon, authenticated;
alter table public.group_creation_log enable row level security;


create or replace function public.join_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  if not public.groups_enabled() then
    raise exception 'groups is not available' using errcode = '22023', hint = 'groups.disabled';
  end if;

  if not exists (
    select 1 from public.policy_acceptances a
     where a.user_id = auth.uid() and a.policy_key = 'groups'
       and a.version >= public.groups_policy_version()
  ) then
    raise exception 'policy not accepted' using errcode = '42501', hint = 'groups.consent_required';
  end if;

  -- A private group is joined by code (join_group_by_code), not by id. No RPC
  -- hands a non-member a private group's id, but the guard is explicit. A
  -- non-existent id falls through to the post-lock not_found check.
  if exists (select 1 from public.groups g where g.id = p_group_id and g.is_private) then
    raise exception 'this group is joined with a code'
      using errcode = '42501', hint = 'groups.code_required';
  end if;

  -- Lock first, then check existence: this is what turns a race against the
  -- last member's leave into a clean not_found rather than a raw 23503.
  perform public.lock_group(p_group_id);

  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception 'group not found' using errcode = 'P0002', hint = 'groups.not_found';
  end if;

  insert into public.group_members (group_id, user_id)
  values (p_group_id, auth.uid())
  on conflict do nothing;
end;
$fn$;

-- Join a private group by its 6-digit code (D26). Same flag / consent / lock /
-- post-lock-existence protocol as join_group. Deliberately NOT rate-limited
-- (D27): "private" is a discovery boundary, not access control, and the policy
-- copy says so. The code space (~1M) is enumerable by a determined script.
create or replace function public.join_group_by_code(p_code text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  if not public.groups_enabled() then
    raise exception 'groups is not available' using errcode = '22023', hint = 'groups.disabled';
  end if;

  if not exists (
    select 1 from public.policy_acceptances a
     where a.user_id = auth.uid() and a.policy_key = 'groups'
       and a.version >= public.groups_policy_version()
  ) then
    raise exception 'policy not accepted' using errcode = '42501', hint = 'groups.consent_required';
  end if;

  select g.id into v_group_id
    from public.groups g
   where g.join_code = btrim(coalesce(p_code, ''));

  if v_group_id is null then
    raise exception 'no group with that code'
      using errcode = 'P0002', hint = 'groups.invalid_code';
  end if;

  perform public.lock_group(v_group_id);

  if not exists (select 1 from public.groups g where g.id = v_group_id) then
    raise exception 'group not found' using errcode = 'P0002', hint = 'groups.not_found';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, auth.uid())
  on conflict do nothing;
end;
$fn$;

-- Deliberately not gated by the feature flag: flipping the kill switch must
-- never trap somebody inside a group they want to leave.
create or replace function public.leave_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  perform public.lock_group(p_group_id);

  delete from public.group_members
   where group_id = p_group_id and user_id = auth.uid();
end;
$fn$;

revoke execute on function public.join_group(uuid)          from public, anon;
grant  execute on function public.join_group(uuid)          to authenticated;
revoke execute on function public.join_group_by_code(text)  from public, anon;
grant  execute on function public.join_group_by_code(text)  to authenticated;
revoke execute on function public.leave_group(uuid)         from public, anon;
grant  execute on function public.leave_group(uuid)         to authenticated;

-- Private like every other Groups table. blocked_id is an auth.users uuid, so
-- a readable user_blocks would hand clients a stable cross-group identifier
-- and give a uuid-existence oracle through the foreign key (D25).
create table if not exists public.user_blocks (
  id         uuid not null unique default extensions.gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

revoke all on public.user_blocks from anon, authenticated;
alter table public.user_blocks enable row level security;

-- Browse: the popular 200. Search reaches everything, which is what stops a
-- cap from making group 201 both invisible and unfindable (D13).
drop function if exists public.list_groups();
create function public.list_groups()
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  group_logo_key    text,
  member_count      bigint,
  is_member         boolean
)
language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  return query
  select g.id, g.name, g.description, g.logo_key,
         (select count(*) from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members me
                  where me.group_id = g.id and me.user_id = auth.uid())
    from public.groups g
   where g.is_private = false
     and (g.created_by is null
          or g.created_by = auth.uid()
          or not exists (
            select 1 from public.user_blocks b
             where (b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
                or (b.blocker_id = g.created_by and b.blocked_id = auth.uid())))
   order by (select count(*) from public.group_members m where m.group_id = g.id) desc,
            public.canonical_group_name(g.name) asc
   limit 200;
end;
$fn$;

drop function if exists public.search_groups(text);
create function public.search_groups(p_query text)
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  group_logo_key    text,
  member_count      bigint,
  is_member         boolean
)
language plpgsql security definer set search_path = '' as $fn$
declare
  v_query text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  v_query := public.canonical_group_name(p_query);
  if v_query = '' then
    return;
  end if;

  return query
  select g.id, g.name, g.description, g.logo_key,
         (select count(*) from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members me
                  where me.group_id = g.id and me.user_id = auth.uid())
    from public.groups g
   where public.canonical_group_name(g.name) like '%' || v_query || '%'
     and (g.created_by is null
          or g.created_by = auth.uid()
          or not exists (
            select 1 from public.user_blocks b
             where (b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
                or (b.blocker_id = g.created_by and b.blocked_id = auth.uid())))
   order by (select count(*) from public.group_members m where m.group_id = g.id) desc,
            public.canonical_group_name(g.name) asc
   limit 200;
end;
$fn$;

revoke execute on function public.list_groups()      from public, anon;
grant  execute on function public.list_groups()      to authenticated;
revoke execute on function public.search_groups(text) from public, anon;
grant  execute on function public.search_groups(text) to authenticated;

-- Blocking works on opaque membership handles so no auth.users uuid ever
-- reaches a client. list_blocks is not optional: blocking is mutual, so the
-- blocked person vanishes from every board and this is the only way back.
create or replace function public.block_group_member(p_membership_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
declare
  v_target uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  select m.user_id into v_target
    from public.group_members m
   where m.id = p_membership_id
     and exists (select 1 from public.group_members me
                  where me.group_id = m.group_id and me.user_id = auth.uid());

  if v_target is null then
    raise exception 'unknown member' using errcode = '42501', hint = 'groups.invalid_handle';
  end if;

  if v_target = auth.uid() then
    raise exception 'cannot block yourself' using errcode = '22023', hint = 'groups.invalid_handle';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (auth.uid(), v_target)
  on conflict do nothing;
end;
$fn$;

drop function if exists public.list_blocks();
create function public.list_blocks()
returns table (block_id uuid, display_name text, blocked_at timestamptz)
language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  return query
  select b.id,
         coalesce(nullif(btrim(p.full_name), ''), 'Skier'),
         b.created_at
    from public.user_blocks b
    left join public.profiles p on p.user_id = b.blocked_id
   where b.blocker_id = auth.uid()
   order by b.created_at desc;
end;
$fn$;

create or replace function public.unblock(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  delete from public.user_blocks
   where id = p_block_id and blocker_id = auth.uid();
end;
$fn$;

revoke execute on function public.block_group_member(uuid) from public, anon;
grant  execute on function public.block_group_member(uuid) to authenticated;
revoke execute on function public.list_blocks()            from public, anon;
grant  execute on function public.list_blocks()            to authenticated;
revoke execute on function public.unblock(uuid)            from public, anon;
grant  execute on function public.unblock(uuid)            to authenticated;

-- Reports outlive what they describe. Both target FKs are set null and the
-- offending text is snapshotted, because with a cascade an abuser could
-- destroy the evidence simply by leaving as the last member.
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

revoke all on public.abuse_reports from anon, authenticated;
alter table public.abuse_reports enable row level security;

create or replace function public.report_group(p_group_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare
  v_name text;
  v_desc text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  select g.name, g.description into v_name, v_desc
    from public.groups g where g.id = p_group_id;

  if v_name is null then
    raise exception 'group not found' using errcode = 'P0002', hint = 'groups.not_found';
  end if;

  insert into public.abuse_reports (
    reporter_id, target_type, target_group_id,
    snapshot_name, snapshot_description, reason)
  values (
    auth.uid(), 'group', p_group_id,
    v_name, v_desc, left(coalesce(p_reason, ''), 500))
  on conflict do nothing;
end;
$fn$;

create or replace function public.report_profile(p_membership_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare
  v_target uuid;
  v_name   text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  select m.user_id into v_target
    from public.group_members m
   where m.id = p_membership_id
     and exists (select 1 from public.group_members me
                  where me.group_id = m.group_id and me.user_id = auth.uid());

  if v_target is null then
    raise exception 'unknown member' using errcode = '42501', hint = 'groups.invalid_handle';
  end if;

  select p.full_name into v_name from public.profiles p where p.user_id = v_target;

  insert into public.abuse_reports (
    reporter_id, target_type, target_user_id, snapshot_name, reason)
  values (
    auth.uid(), 'profile', v_target,
    coalesce(v_name, ''), left(coalesce(p_reason, ''), 500))
  on conflict do nothing;
end;
$fn$;

revoke execute on function public.report_group(uuid, text)   from public, anon;
grant  execute on function public.report_group(uuid, text)   to authenticated;
revoke execute on function public.report_profile(uuid, text) from public, anon;
grant  execute on function public.report_profile(uuid, text) to authenticated;

-- Profile names become public UGC the moment Groups ships: they render on
-- every shared leaderboard. Filtering only group names is trivially bypassed
-- by setting an abusive display name instead (D21).
--
-- A BEFORE trigger rather than moving writes to an RPC, because ProfileSettings
-- and AuthProvider's OAuth hydration both write this column directly and
-- neither can be migrated without breaking existing clients.
--
-- Length truncates rather than raising: this sits on the sign-in path, and
-- rejecting a long name from an OAuth provider would break login.
create or replace function public.normalise_profile_name()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  NEW.full_name := left(
    btrim(regexp_replace(
      regexp_replace(coalesce(NEW.full_name, ''), '[[:cntrl:]]', '', 'g'),
      '\s+', ' ', 'g')),
    60);

  if NEW.full_name <> '' and exists (
    select 1 from public.moderation_terms t
     where lower(NEW.full_name) like '%' || t.term || '%'
  ) then
    raise exception 'display name is not allowed'
      using errcode = '22023', hint = 'groups.name_rejected';
  end if;

  return NEW;
end;
$fn$;

drop trigger if exists profiles_normalise_name on public.profiles;
create trigger profiles_normalise_name
  before insert or update of full_name on public.profiles
  for each row execute function public.normalise_profile_name();

-- The leaderboard aggregate scans sets by (user_id, date). Production already
-- carries `sets_user_date_idx` on exactly those columns, so no index is added
-- here.

-- The client sends a period and a timezone, never dates. Accepting start and
-- end dates would let any member ask about a single day and learn who trained
-- which discipline on it; 365 cheap calls reconstruct a year of everyone's
-- schedule (D8).
--
-- The resolved window is returned as window_start / window_end, repeated on
-- every row, so the board header can show the range without the client
-- recomputing it. Computing it client-side was rejected: the client's window
-- could disagree with the server's, which is the drift D15 cited when it
-- banned a period-keyed memo. A member almost always sees at least their own
-- row, so the client reads the pair from row 0 and copes with an empty result.
--
-- Reading is not gated by the feature flag: a kill switch should stop new
-- activity, not hide existing members' data from each other.
drop function if exists public.fetch_group_leaderboard(uuid, text, text);
create function public.fetch_group_leaderboard(
  p_group_id uuid,
  p_period   text,
  p_timezone text
)
returns table (
  membership_id uuid,
  member_name   text,
  is_self       boolean,
  slalom_count  bigint,
  tricks_count  bigint,
  jump_count    bigint,
  other_count   bigint,
  total_count   bigint,
  window_start  date,
  window_end    date
)
-- STABLE, not the default VOLATILE: the membership gate and the data query must
-- see one snapshot. A VOLATILE plpgsql function takes a fresh snapshot per
-- internal statement, so a leave_group committing between the gate and the
-- RETURN QUERY could let a just-left caller read the remaining rows, or return
-- zero rows for a reaped group. STABLE pins both to the calling query's snapshot.
language plpgsql stable security definer set search_path = '' as $fn$
declare
  v_days  integer;
  v_start date;
  v_end   date;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  v_days := case p_period when '7d' then 6 when '30d' then 29 else null end;
  if v_days is null then
    raise exception 'unsupported period' using errcode = '22023', hint = 'groups.invalid_period';
  end if;

  if p_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names z where z.name = p_timezone
  ) then
    raise exception 'unknown timezone' using errcode = '22023', hint = 'groups.invalid_timezone';
  end if;

  v_end   := (pg_catalog.now() at time zone p_timezone)::date;
  v_start := v_end - v_days;

  -- The single most important line in the feature: without it, security
  -- definer exposes every group's data to everyone. A non-member and a
  -- non-existent group are deliberately indistinguishable.
  if not exists (
    select 1 from public.group_members m
     where m.group_id = p_group_id and m.user_id = auth.uid()
  ) then
    raise exception 'not a member of this group'
      using errcode = '42501', hint = 'groups.not_a_member';
  end if;

  return query
  select m.id,
         coalesce(nullif(btrim(p.full_name), ''), 'Skier'),
         (m.user_id = auth.uid()),
         count(s.id) filter (where s.event_type = 'slalom'),
         count(s.id) filter (where s.event_type = 'tricks'),
         count(s.id) filter (where s.event_type = 'jump'),
         count(s.id) filter (where s.event_type = 'other'),
         count(s.id),
         v_start,
         v_end
    from public.group_members m
    left join public.profiles p on p.user_id = m.user_id
    left join public.sets s on s.user_id = m.user_id
                           and s.date between v_start and v_end
   where m.group_id = p_group_id
     and (m.user_id = auth.uid()
          or not exists (
            select 1 from public.user_blocks b
             where (b.blocker_id = auth.uid() and b.blocked_id = m.user_id)
                or (b.blocker_id = m.user_id and b.blocked_id = auth.uid())))
   group by m.id, m.user_id, p.full_name
   order by count(s.id) desc,
            coalesce(nullif(btrim(p.full_name), ''), 'Skier') asc;
end;
$fn$;

revoke execute on function public.fetch_group_leaderboard(uuid, text, text) from public, anon;
grant  execute on function public.fetch_group_leaderboard(uuid, text, text) to authenticated;

-- Internal helpers: reachable only from inside definer functions and triggers.
-- Postgres grants EXECUTE to PUBLIC by default, so without these revokes any
-- signed-in user could call them directly - lock_group in particular would let
-- anyone take advisory locks.
revoke execute on function public.canonical_group_name(text)  from public, anon, authenticated;
revoke execute on function public.lock_group(uuid)            from public, anon, authenticated;
revoke execute on function public.lock_creator(uuid)          from public, anon, authenticated;
revoke execute on function public.groups_enabled()            from public, anon, authenticated;
revoke execute on function public.groups_policy_version()     from public, anon, authenticated;
revoke execute on function public.reap_empty_group()          from public, anon, authenticated;
revoke execute on function public.normalise_profile_name()    from public, anon, authenticated;

-- ------------------------------------------------------------------
-- Review fixes: description filtering, literal denylist matching, and a
-- response shape that carries no auth identifiers.
-- ------------------------------------------------------------------

-- Literal substring matching, so a stored term containing % or _ cannot
-- silently widen the filter to match everything.
create or replace function public.contains_denylisted_term(p_text text)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select exists (
    select 1 from public.moderation_terms t
     where pg_catalog.strpos(pg_catalog.lower(coalesce(p_text, '')),
                             pg_catalog.lower(t.term)) > 0)
$fn$;

revoke execute on function public.contains_denylisted_term(text) from public, anon, authenticated;

-- A named composite so the response is a single object (a RETURNS TABLE would
-- come back as an array) while still excluding created_by. Dropped and
-- recreated rather than guarded, because v3 added is_private / join_code;
-- `cascade` takes create_group with it, which is recreated just below.
drop type if exists public.group_public cascade;
create type public.group_public as (
  id          uuid,
  name        text,
  description text,
  logo_key    text,
  created_at  timestamptz,
  is_private  boolean,
  join_code   text
);

drop function if exists public.create_group(text, text);
drop function if exists public.create_group(text, text, boolean);
create function public.create_group(
  p_name        text,
  p_description text default '',
  p_private     boolean default false
)
returns public.group_public
language plpgsql security definer set search_path = '' as $fn$
declare
  v_display     text;
  v_description text;
  v_live        integer;
  v_recent      integer;
  v_code        text;
  v_group       public.groups;
  v_result      public.group_public;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  if not public.groups_enabled() then
    raise exception 'groups is not available' using errcode = '22023', hint = 'groups.disabled';
  end if;

  if not exists (
    select 1 from public.policy_acceptances a
     where a.user_id = auth.uid() and a.policy_key = 'groups'
       and a.version >= public.groups_policy_version()
  ) then
    raise exception 'policy not accepted' using errcode = '42501', hint = 'groups.consent_required';
  end if;

  perform public.lock_creator(auth.uid());

  v_display     := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_description := btrim(regexp_replace(coalesce(p_description, ''), '\s+', ' ', 'g'));

  if char_length(v_display) < 2 or char_length(v_display) > 40 then
    raise exception 'group name must be 2-40 characters'
      using errcode = '22023', hint = 'groups.invalid_name';
  end if;

  if char_length(v_description) > 200 then
    raise exception 'description must be 200 characters or fewer'
      using errcode = '22023', hint = 'groups.invalid_description';
  end if;

  if public.contains_denylisted_term(v_display) then
    raise exception 'group name is not allowed'
      using errcode = '22023', hint = 'groups.name_rejected';
  end if;

  -- The description is published by list_groups and search_groups just as the
  -- name is, so filtering only the name leaves the denylist trivially
  -- bypassable.
  if public.contains_denylisted_term(v_description) then
    raise exception 'group description is not allowed'
      using errcode = '22023', hint = 'groups.description_rejected';
  end if;

  select count(*)::integer into v_live
    from public.groups g where g.created_by = auth.uid();
  if v_live >= 10 then
    raise exception 'group limit reached'
      using errcode = '22023', hint = 'groups.quota_exceeded';
  end if;

  select count(*)::integer into v_recent
    from public.group_creation_log l
   where l.creator_id = auth.uid()
     and l.created_at > timezone('utc', now()) - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'too many groups created recently'
      using errcode = '22023', hint = 'groups.rate_limited';
  end if;

  -- Private groups get a unique 6-digit code (D26). The loop regenerates on the
  -- astronomically rare concurrent collision; groups_join_code_unique is the
  -- backstop. A name collision is terminal; a code collision just retries.
  <<insert_group>>
  for v_attempt in 1..20 loop
    if p_private then
      v_code := pg_catalog.lpad(
        (pg_catalog.floor(pg_catalog.random() * 1000000))::int::text, 6, '0');
    end if;

    begin
      insert into public.groups (name, description, created_by, is_private, join_code)
      values (v_display, v_description, auth.uid(), p_private, v_code)
      returning * into v_group;
      exit insert_group;
    exception when unique_violation then
      if not p_private
         or exists (select 1 from public.groups g
                     where public.canonical_group_name(g.name)
                         = public.canonical_group_name(v_display)) then
        raise exception 'group name already taken'
          using errcode = '23505', hint = 'groups.name_taken';
      end if;
      -- else: the join_code collided — loop and regenerate
    end;
  end loop;

  if v_group.id is null then
    -- Unreachable at any real scale (20 tries against a 1M space); mapped so
    -- the client prompts a retry rather than showing a raw error.
    raise exception 'could not allocate a join code'
      using errcode = '40001', hint = 'groups.name_taken';
  end if;

  insert into public.group_members (group_id, user_id) values (v_group.id, auth.uid());
  insert into public.group_creation_log (creator_id) values (auth.uid());

  v_result := (v_group.id, v_group.name, v_group.description,
               v_group.logo_key, v_group.created_at,
               v_group.is_private, v_group.join_code)::public.group_public;
  return v_result;
end;
$fn$;

revoke execute on function public.create_group(text, text, boolean) from public, anon;
grant  execute on function public.create_group(text, text, boolean) to authenticated;

-- Literal substring search. Interpolating the query into a LIKE pattern made
-- '%' match every group and '_' match nearly all of them.
drop function if exists public.search_groups(text);
create function public.search_groups(p_query text)
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  group_logo_key    text,
  member_count      bigint,
  is_member         boolean
)
language plpgsql security definer set search_path = '' as $fn$
declare
  v_query text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  v_query := public.canonical_group_name(p_query);
  if v_query = '' then
    return;
  end if;

  return query
  select g.id, g.name, g.description, g.logo_key,
         (select count(*) from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members me
                  where me.group_id = g.id and me.user_id = auth.uid())
    from public.groups g
   where g.is_private = false
     and pg_catalog.strpos(public.canonical_group_name(g.name), v_query) > 0
     and (g.created_by is null
          or g.created_by = auth.uid()
          or not exists (
            select 1 from public.user_blocks b
             where (b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
                or (b.blocker_id = g.created_by and b.blocked_id = auth.uid())))
   order by (select count(*) from public.group_members m where m.group_id = g.id) desc,
            public.canonical_group_name(g.name) asc
   limit 200;
end;
$fn$;

revoke execute on function public.search_groups(text) from public, anon;
grant  execute on function public.search_groups(text) to authenticated;

-- Normalise and length-cap existing profile rows, then constrain. The trigger
-- only governs future writes, so without this a name already in the database
-- at 120 characters would be published to leaderboards exactly as stored.
update public.profiles
   set full_name = left(
     btrim(regexp_replace(
       regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
       '\s+', ' ', 'g')),
     60)
 where full_name is distinct from left(
     btrim(regexp_replace(
       regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
       '\s+', ' ', 'g')),
     60);

alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 60);

-- Your own memberships, unfiltered and uncapped.
--
-- list_groups is a directory, not a membership list: it hides groups whose
-- creator is blocked in either direction and stops at 200 rows. Either rule
-- can hide a group the caller is standing inside, and leave_group is only
-- reachable from a row that names the group - so a member blocked by their
-- group's creator would have been trapped there permanently.
--
-- Deliberately not block-filtered: blocking hides a person's *other* groups
-- from browse, and must never hide the one you are in. Deliberately uncapped:
-- a cap would recreate the same trap for anyone in more than 200 groups, and
-- the response is the caller's own membership list, so its size is theirs.
-- Not flag-gated either, matching list_groups and leave_group: flipping the
-- kill switch must not strand somebody inside a group.
-- Returns is_private and the real join_code (D28): the board shows the invite
-- code to every member, so any member can invite. Shape change, so drop first.
-- list_groups / search_groups do NOT carry join_code - the directory has no
-- reason to hand out a code, and their rows are all public anyway. The client's
-- shared mapper defaults both fields when they are absent.
drop function if exists public.list_my_groups();
create function public.list_my_groups()
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  group_logo_key    text,
  member_count      bigint,
  is_member         boolean,
  is_private        boolean,
  join_code         text
)
language plpgsql security definer set search_path = '' as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000', hint = 'groups.unauthenticated';
  end if;

  return query
  select g.id, g.name, g.description, g.logo_key,
         (select count(*) from public.group_members m where m.group_id = g.id),
         true,
         g.is_private,
         g.join_code
    from public.groups g
    join public.group_members me
      on me.group_id = g.id and me.user_id = auth.uid()
   order by (select count(*) from public.group_members m where m.group_id = g.id) desc,
            public.canonical_group_name(g.name) asc;
end;
$fn$;

revoke execute on function public.list_my_groups() from public, anon;
grant  execute on function public.list_my_groups() to authenticated;
