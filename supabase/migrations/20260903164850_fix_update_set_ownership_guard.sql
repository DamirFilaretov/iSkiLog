-- Restore the ownership guard in update_set_with_subtype.
--
-- The function is SECURITY DEFINER (runs as the table owner, bypassing RLS) and
-- writes set_notes and the subtype tables keyed only by p_set_id. The base
-- `update public.sets ... where id = p_set_id and user_id = auth.uid()` is
-- correctly scoped, but on a mismatch it just updates zero rows and execution
-- falls through to the child-table writes — letting any authenticated caller
-- overwrite another user's set_notes / subtype rows (and, with p_event_changed,
-- delete them) for any set id they know.
--
-- tests/e2e/db/schema.sql always carried `if not found then raise`; production
-- lost it when 20260414134719_fix_event_type_cast_in_set_rpcs recreated the
-- function from a pre-guard body. This re-adds it. Body is otherwise identical
-- to the baseline.

create or replace function public.update_set_with_subtype(
  p_set_id uuid,
  p_season_id uuid,
  p_is_favorite boolean,
  p_event_type text,
  p_date date,
  p_time_of_day time without time zone default null,
  p_notes jsonb default '{}'::jsonb,
  p_buoys numeric default null,
  p_rope_length text default null,
  p_speed numeric default null,
  p_passes_count integer default null,
  p_duration_minutes integer default null,
  p_trick_type text default null,
  p_subevent text default null,
  p_attempts integer default null,
  p_passed integer default null,
  p_made integer default null,
  p_distance numeric default null,
  p_cuts_type text default null,
  p_cuts_count integer default null,
  p_other_name text default null,
  p_other_duration_minutes integer default null,
  p_event_changed boolean default false
) returns void
  language plpgsql security definer
  as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.sets
  set
    season_id   = p_season_id,
    is_favorite = coalesce(p_is_favorite, false),
    event_type  = p_event_type::event_type,
    date        = p_date,
    time_of_day = p_time_of_day,
    updated_at  = now()
  where id = p_set_id and user_id = v_user_id;

  if not found then
    raise exception 'Set not found or not owned by user' using errcode = '42501';
  end if;

  insert into public.set_notes (set_id, summary, worked_on, mistakes, what_helped, next_set, other)
  values (
    p_set_id,
    coalesce(p_notes->>'summary', ''),
    coalesce(p_notes->>'workedOn', ''),
    coalesce(p_notes->>'mistakes', ''),
    coalesce(p_notes->>'whatHelped', ''),
    coalesce(p_notes->>'nextSet', ''),
    coalesce(p_notes->>'other', '')
  )
  on conflict (set_id) do update set
    summary     = excluded.summary,
    worked_on   = excluded.worked_on,
    mistakes    = excluded.mistakes,
    what_helped = excluded.what_helped,
    next_set    = excluded.next_set,
    other       = excluded.other;

  if p_event_changed then
    delete from public.slalom_sets where set_id = p_set_id;
    delete from public.tricks_sets where set_id = p_set_id;
    delete from public.jump_sets    where set_id = p_set_id;
    delete from public.other_sets   where set_id = p_set_id;
  end if;

  if p_event_type = 'slalom' then
    insert into public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
    values (p_set_id, coalesce(p_buoys, 0), coalesce(p_rope_length, ''), p_speed, coalesce(p_passes_count, 0))
    on conflict (set_id) do update set
      buoys        = excluded.buoys,
      rope_length  = excluded.rope_length,
      speed        = excluded.speed,
      passes_count = excluded.passes_count;
  elsif p_event_type = 'tricks' then
    insert into public.tricks_sets (set_id, duration_minutes, trick_type)
    values (p_set_id, p_duration_minutes, p_trick_type)
    on conflict (set_id) do update set
      duration_minutes = excluded.duration_minutes,
      trick_type       = excluded.trick_type;
  elsif p_event_type = 'jump' then
    insert into public.jump_sets (set_id, subevent, attempts, passed, made, distance, cuts_type, cuts_count)
    values (
      p_set_id,
      coalesce(p_subevent, 'jump'),
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_attempts, 0) end,
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_passed, 0) end,
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_made, 0) end,
      p_distance, p_cuts_type, p_cuts_count
    )
    on conflict (set_id) do update set
      subevent   = excluded.subevent,
      attempts   = excluded.attempts,
      passed     = excluded.passed,
      made       = excluded.made,
      distance   = excluded.distance,
      cuts_type  = excluded.cuts_type,
      cuts_count = excluded.cuts_count;
  else
    insert into public.other_sets (set_id, name, duration_minutes)
    values (p_set_id, coalesce(p_other_name, ''), p_other_duration_minutes)
    on conflict (set_id) do update set
      name             = excluded.name,
      duration_minutes = excluded.duration_minutes;
  end if;
end;
$$;
