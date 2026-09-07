-- Group photos. `groups.logo_key` and its column in every Groups RPC row have
-- existed since the foundation migration but were always null (D10, deferred).
-- This turns it on: a public Storage bucket for the images, RLS so a user can
-- only write under their own folder, and `create_group` gains an optional
-- `p_logo_key` so a creator can attach a photo at creation time.

insert into storage.buckets (id, name, public)
values ('group-logos', 'group-logos', true)
on conflict (id) do nothing;

-- Group photos are shown in the directory to non-members too, so reads are
-- public — no signed-URL plumbing needed on the client. drop-then-create
-- keeps this migration re-runnable (there is no `create policy if not exists`).
drop policy if exists "group_logos_read_public" on storage.objects;
create policy "group_logos_read_public"
  on storage.objects for select
  using (bucket_id = 'group-logos');

-- A caller may only write into their own folder. `create_group` below double
-- checks the same prefix on `p_logo_key`, so a group's photo can never be
-- planted from a path the caller does not own.
drop policy if exists "group_logos_insert_own" on storage.objects;
create policy "group_logos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'group-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- create_group: body verbatim from 20260903195701, plus p_logo_key (4th arg,
-- default null) validated and threaded into the insert. The parameter list
-- changed, so the old 3-arg overload is dropped rather than left dormant.
drop function if exists public.create_group(text, text, boolean);

create function public.create_group(
  p_name        text,
  p_description text default '',
  p_private     boolean default false,
  p_logo_key    text default null
)
returns public.group_public
language plpgsql security definer set search_path = '' as $fn$
declare
  v_display     text;
  v_description text;
  v_logo_key    text;
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

  -- A logo is always the caller's own upload: the Storage insert policy above
  -- already confines writes to `{auth.uid()}/...`, and this repeats the same
  -- prefix check so a caller cannot point a group at someone else's object by
  -- guessing or reusing a path.
  v_logo_key := nullif(btrim(coalesce(p_logo_key, '')), '');
  if v_logo_key is not null then
    if char_length(v_logo_key) > 200
       or left(v_logo_key, char_length(auth.uid()::text) + 1) <> auth.uid()::text || '/' then
      raise exception 'invalid group photo'
        using errcode = '22023', hint = 'groups.invalid_logo';
    end if;
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
      insert into public.groups (name, description, created_by, is_private, join_code, logo_key)
      values (v_display, v_description, auth.uid(), p_private, v_code, v_logo_key)
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

revoke execute on function public.create_group(text, text, boolean, text) from public, anon;
grant  execute on function public.create_group(text, text, boolean, text) to authenticated;
