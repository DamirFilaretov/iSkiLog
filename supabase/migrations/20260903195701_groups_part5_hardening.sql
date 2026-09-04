-- Groups Part 5 hardening. No behaviour change — security posture only.
-- Queued from the automated security review of 2026-09-03 and the Part 4 review.
-- Idempotent / re-runnable: ALTER FUNCTION and create-or-replace throughout.

-- 1. Pin a search_path on the two SECURITY DEFINER set writers so a caller
--    cannot prepend a schema to hijack an unqualified name. ALTER FUNCTION sets
--    the attribute in place — the bodies are NOT restated. `pg_catalog, public`
--    (not '') keeps the existing unqualified `::event_type` cast and relation
--    names resolving with no body edit. Signatures are the full argument-type
--    lists from 20260903155020 (create) and 20260903164850 (update).
alter function public.create_set_with_subtype(
  uuid, boolean, text, date, time without time zone, jsonb, numeric, text, numeric,
  integer, integer, text, text, integer, integer, integer, numeric, text, integer,
  text, integer
) set search_path = pg_catalog, public;

alter function public.update_set_with_subtype(
  uuid, uuid, boolean, text, date, time without time zone, jsonb, numeric, text,
  numeric, integer, integer, text, text, integer, integer, integer, numeric, text,
  integer, text, integer, boolean
) set search_path = pg_catalog, public;

-- 2. Neither set writer has a legitimate anonymous caller; both are definer.
--    anon holds EXECUTE two ways — an explicit baseline grant AND the PUBLIC
--    default — so both are revoked. `authenticated` keeps its own explicit
--    grant, so signed-in callers are unaffected.
revoke execute on function public.create_set_with_subtype(
  uuid, boolean, text, date, time without time zone, jsonb, numeric, text, numeric,
  integer, integer, text, text, integer, integer, integer, numeric, text, integer,
  text, integer
) from anon, public;
revoke execute on function public.update_set_with_subtype(
  uuid, uuid, boolean, text, date, time without time zone, jsonb, numeric, text,
  numeric, integer, integer, text, text, integer, integer, integer, numeric, text,
  integer, text, integer, boolean
) from anon, public;

-- 3. join_code from a CSPRNG rather than random(). Discovery boundary, not
--    access control (D27), but the review flagged random(). 3 random bytes ->
--    0..16_777_215, taken mod 1e6. get_byte is non-negative, so no sign
--    surprise; the modulo bias over 1e6 is negligible and irrelevant for a
--    discovery boundary. Internal only — invoker, fully qualified, no grants.
create or replace function public.groups_new_join_code()
returns text language plpgsql volatile security invoker set search_path = '' as $fn$
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

-- create_group: body verbatim from 20260903160619, changing exactly one line —
-- inside the retry loop, the join_code assignment now calls the helper above.
create or replace function public.create_group(
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
      v_code := public.groups_new_join_code();
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

-- 4. Honest volatility label on the pure-read directory RPCs: each runs one
--    data query after an unchanging auth.uid() check.
alter function public.list_groups()        stable;
alter function public.search_groups(text)  stable;
alter function public.list_my_groups()     stable;
