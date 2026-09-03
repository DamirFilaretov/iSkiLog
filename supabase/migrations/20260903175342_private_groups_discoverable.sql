-- Private groups become discoverable.
--
-- Original design (D26) hid private groups from list_groups / search_groups
-- entirely — findable only if a member handed you the 6-digit code. This makes
-- them visible in the directory and search instead, flagged is_private so the
-- client can show a lock and route the tap to the code prompt.
--
-- The code stays members-only: list_groups / search_groups do NOT return
-- join_code (only list_my_groups does). A non-member can see a private group
-- exists but still needs a member to share the code. join_group continues to
-- reject a private group's id with groups.code_required.
--
-- Both functions are drop-and-recreated because the RETURNS TABLE shape changes;
-- grants are re-issued because DROP takes them with it.

drop function if exists public.list_groups();
create function public.list_groups()
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  group_logo_key    text,
  member_count      bigint,
  is_member         boolean,
  is_private        boolean
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
                  where me.group_id = g.id and me.user_id = auth.uid()),
         g.is_private
    from public.groups g
   where g.created_by is null
      or g.created_by = auth.uid()
      or not exists (
        select 1 from public.user_blocks b
         where (b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
            or (b.blocker_id = g.created_by and b.blocked_id = auth.uid()))
   order by (select count(*) from public.group_members m where m.group_id = g.id) desc,
            public.canonical_group_name(g.name) asc
   limit 200;
end;
$fn$;

revoke execute on function public.list_groups() from public, anon;
grant  execute on function public.list_groups() to authenticated;

drop function if exists public.search_groups(text);
create function public.search_groups(p_query text)
returns table (
  group_id          uuid,
  group_name        text,
  group_description text,
  group_logo_key    text,
  member_count      bigint,
  is_member         boolean,
  is_private        boolean
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
                  where me.group_id = g.id and me.user_id = auth.uid()),
         g.is_private
    from public.groups g
   where pg_catalog.strpos(public.canonical_group_name(g.name), v_query) > 0
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
