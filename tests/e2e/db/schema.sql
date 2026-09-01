create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default ''
);

create table if not exists public.seasons (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false
);

create table if not exists public.sets (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid null references public.seasons(id) on delete set null,
  is_favorite boolean not null default false,
  event_type text not null check (event_type in ('slalom', 'tricks', 'jump', 'other')),
  date date not null,
  time_of_day time null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Ensure columns added after initial schema creation exist on pre-existing tables
alter table if exists public.sets add column if not exists time_of_day time null;

create table if not exists public.set_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  summary text not null default '',
  worked_on text not null default '',
  mistakes text not null default '',
  what_helped text not null default '',
  next_set text not null default '',
  other text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (set_id)
);

create table if not exists public.slalom_sets (
  set_id uuid primary key references public.sets(id) on delete cascade,
  buoys numeric null,
  rope_length text null,
  speed numeric null,
  passes_count integer null
);

create table if not exists public.tricks_sets (
  set_id uuid primary key references public.sets(id) on delete cascade,
  duration_minutes integer null,
  trick_type text null
);

create table if not exists public.user_learned_tricks (
  user_id uuid not null references auth.users(id) on delete cascade,
  trick_id text not null,
  learned_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, trick_id)
);

create table if not exists public.user_in_progress_tricks (
  user_id uuid not null references auth.users(id) on delete cascade,
  trick_id text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, trick_id)
);

create table if not exists public.user_tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 140),
  due_date date null,
  is_done boolean not null default false,
  completed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.jump_sets (
  set_id uuid primary key references public.sets(id) on delete cascade,
  subevent text null,
  attempts integer null,
  passed integer null,
  made integer null,
  distance numeric null,
  cuts_type text null,
  cuts_count integer null
);

create table if not exists public.other_sets (
  set_id uuid primary key references public.sets(id) on delete cascade,
  name text null,
  duration_minutes integer null
);

alter table public.other_sets
add column if not exists duration_minutes integer null;

create index if not exists idx_seasons_user_id on public.seasons (user_id);
create index if not exists idx_sets_user_id on public.sets (user_id);
create index if not exists idx_sets_date on public.sets (date desc);
create index if not exists idx_sets_updated_at on public.sets (updated_at desc);
create index if not exists idx_user_tasks_user_id on public.user_tasks (user_id);
create index if not exists idx_user_tasks_due_date on public.user_tasks (due_date);
create index if not exists idx_user_tasks_done_due on public.user_tasks (is_done, due_date);
create index if not exists idx_user_tasks_updated_at on public.user_tasks (updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_sets_updated_at on public.sets;
create trigger trg_sets_updated_at
before update on public.sets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_tasks_updated_at on public.user_tasks;
create trigger trg_user_tasks_updated_at
before update on public.user_tasks
for each row
execute function public.set_updated_at();

drop function if exists public.fetch_sets_hydrated();
create or replace function public.fetch_sets_hydrated()
returns table (
  set_id uuid,
  event_type text,
  date date,
  time_of_day time,
  season_id uuid,
  is_favorite boolean,
  notes_summary text,
  notes_worked_on text,
  notes_mistakes text,
  notes_what_helped text,
  notes_next_set text,
  notes_other text,
  buoys numeric,
  rope_length text,
  speed numeric,
  passes_count integer,
  duration_minutes integer,
  trick_type text,
  jump_subevent text,
  jump_attempts integer,
  jump_passed integer,
  jump_made integer,
  jump_distance numeric,
  jump_cuts_type text,
  jump_cuts_count integer,
  other_name text,
  other_duration_minutes integer
)
language sql
stable
as $$
  select
    s.id as set_id,
    s.event_type::text as event_type,
    s.date,
    s.time_of_day,
    s.season_id,
    s.is_favorite,
    coalesce(sn.summary, '') as notes_summary,
    coalesce(sn.worked_on, '') as notes_worked_on,
    coalesce(sn.mistakes, '') as notes_mistakes,
    coalesce(sn.what_helped, '') as notes_what_helped,
    coalesce(sn.next_set, '') as notes_next_set,
    coalesce(sn.other, '') as notes_other,
    sl.buoys,
    sl.rope_length,
    sl.speed,
    sl.passes_count,
    tr.duration_minutes,
    tr.trick_type,
    jp.subevent as jump_subevent,
    jp.attempts as jump_attempts,
    jp.passed as jump_passed,
    jp.made as jump_made,
    jp.distance as jump_distance,
    jp.cuts_type as jump_cuts_type,
    jp.cuts_count as jump_cuts_count,
    ot.name as other_name,
    ot.duration_minutes as other_duration_minutes
  from public.sets s
  left join public.set_notes sn on sn.set_id = s.id
  left join public.slalom_sets sl on sl.set_id = s.id
  left join public.tricks_sets tr on tr.set_id = s.id
  left join public.jump_sets jp on jp.set_id = s.id
  left join public.other_sets ot on ot.set_id = s.id
  where s.user_id = auth.uid()
  order by s.updated_at desc nulls last, s.date desc, s.created_at desc;
$$;

drop function if exists public.set_active_season_atomic(uuid);
create or replace function public.set_active_season_atomic(p_season_id uuid)
returns void
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.seasons
    where id = p_season_id
      and user_id = v_user_id
  ) then
    raise exception 'Season not found or not owned by user';
  end if;

  update public.seasons
  set is_active = (id = p_season_id)
  where user_id = v_user_id;
end;
$$;

drop function if exists public.create_set_with_subtype(
  uuid, boolean, text, date, time, jsonb, numeric, text, numeric, integer, integer, text, text, integer,
  integer, integer, numeric, text, integer, text, integer
);
drop function if exists public.create_set_with_subtype(
  uuid, boolean, text, date, jsonb, numeric, text, numeric, integer, integer, text, text, integer,
  integer, integer, numeric, text, integer, text, integer
);
create or replace function public.create_set_with_subtype(
  p_season_id uuid,
  p_is_favorite boolean,
  p_event_type text,
  p_date date,
  p_time_of_day time default null,
  p_notes jsonb default '{}',
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
  p_other_duration_minutes integer default null
)
returns uuid
language plpgsql
as $$
declare
  v_user_id uuid;
  v_set_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_season_id is not null and not exists (
    select 1
    from public.seasons s
    where s.id = p_season_id
      and s.user_id = v_user_id
  ) then
    raise exception 'Season not found or not owned by user';
  end if;

  if p_event_type not in ('slalom', 'tricks', 'jump', 'other') then
    raise exception 'Unsupported event type: %', p_event_type;
  end if;

  insert into public.sets (
    user_id,
    season_id,
    is_favorite,
    event_type,
    date,
    time_of_day
  )
  values (
    v_user_id,
    p_season_id,
    coalesce(p_is_favorite, false),
    p_event_type,
    p_date,
    p_time_of_day
  )
  returning id into v_set_id;

  insert into public.set_notes (set_id, summary, worked_on, mistakes, what_helped, next_set, other)
  values (
    v_set_id,
    coalesce(p_notes->>'summary', ''),
    coalesce(p_notes->>'workedOn', ''),
    coalesce(p_notes->>'mistakes', ''),
    coalesce(p_notes->>'whatHelped', ''),
    coalesce(p_notes->>'nextSet', ''),
    coalesce(p_notes->>'other', '')
  );

  if p_event_type = 'slalom' then
    insert into public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
    values (
      v_set_id,
      coalesce(p_buoys, 0),
      coalesce(p_rope_length, ''),
      p_speed,
      coalesce(p_passes_count, 0)
    );
  elsif p_event_type = 'tricks' then
    insert into public.tricks_sets (set_id, duration_minutes, trick_type)
    values (v_set_id, p_duration_minutes, p_trick_type);
  elsif p_event_type = 'jump' then
    insert into public.jump_sets (
      set_id,
      subevent,
      attempts,
      passed,
      made,
      distance,
      cuts_type,
      cuts_count
    )
    values (
      v_set_id,
      coalesce(p_subevent, 'jump'),
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_attempts, 0) end,
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_passed, 0) end,
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_made, 0) end,
      p_distance,
      p_cuts_type,
      p_cuts_count
    );
  else
    insert into public.other_sets (set_id, name, duration_minutes)
    values (v_set_id, coalesce(p_other_name, ''), p_other_duration_minutes);
  end if;

  return v_set_id;
end;
$$;

drop function if exists public.update_set_with_subtype(
  uuid, uuid, boolean, text, date, time, jsonb, numeric, text, numeric, integer, integer, text, text,
  integer, integer, integer, numeric, text, integer, text, integer, boolean
);
drop function if exists public.update_set_with_subtype(
  uuid, uuid, boolean, text, date, jsonb, numeric, text, numeric, integer, integer, text, text,
  integer, integer, integer, numeric, text, integer, text, integer, boolean
);
create or replace function public.update_set_with_subtype(
  p_set_id uuid,
  p_season_id uuid,
  p_is_favorite boolean,
  p_event_type text,
  p_date date,
  p_time_of_day time default null,
  p_notes jsonb default '{}',
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
)
returns void
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_season_id is not null and not exists (
    select 1
    from public.seasons s
    where s.id = p_season_id
      and s.user_id = v_user_id
  ) then
    raise exception 'Season not found or not owned by user';
  end if;

  if p_event_type not in ('slalom', 'tricks', 'jump', 'other') then
    raise exception 'Unsupported event type: %', p_event_type;
  end if;

  update public.sets
  set
    season_id = p_season_id,
    is_favorite = coalesce(p_is_favorite, false),
    event_type = p_event_type,
    date = p_date,
    time_of_day = p_time_of_day
  where id = p_set_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Set not found or not owned by user';
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

  if p_event_type = 'slalom' then
    insert into public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
    values (
      p_set_id,
      coalesce(p_buoys, 0),
      coalesce(p_rope_length, ''),
      p_speed,
      coalesce(p_passes_count, 0)
    )
    on conflict (set_id) do update
      set
        buoys = excluded.buoys,
        rope_length = excluded.rope_length,
        speed = excluded.speed,
        passes_count = excluded.passes_count;
  elsif p_event_type = 'tricks' then
    insert into public.tricks_sets (set_id, duration_minutes, trick_type)
    values (p_set_id, p_duration_minutes, p_trick_type)
    on conflict (set_id) do update
      set
        duration_minutes = excluded.duration_minutes,
        trick_type = excluded.trick_type;
  elsif p_event_type = 'jump' then
    insert into public.jump_sets (
      set_id,
      subevent,
      attempts,
      passed,
      made,
      distance,
      cuts_type,
      cuts_count
    )
    values (
      p_set_id,
      coalesce(p_subevent, 'jump'),
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_attempts, 0) end,
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_passed, 0) end,
      case when coalesce(p_subevent, 'jump') = 'cuts' then 0 else coalesce(p_made, 0) end,
      p_distance,
      p_cuts_type,
      p_cuts_count
    )
    on conflict (set_id) do update
      set
        subevent = excluded.subevent,
        attempts = excluded.attempts,
        passed = excluded.passed,
        made = excluded.made,
        distance = excluded.distance,
        cuts_type = excluded.cuts_type,
        cuts_count = excluded.cuts_count;
  else
    insert into public.other_sets (set_id, name, duration_minutes)
    values (p_set_id, coalesce(p_other_name, ''), p_other_duration_minutes)
    on conflict (set_id) do update
      set
        name = excluded.name,
        duration_minutes = excluded.duration_minutes;
  end if;

  if p_event_changed then
    if p_event_type <> 'slalom' then
      delete from public.slalom_sets where set_id = p_set_id;
    end if;
    if p_event_type <> 'tricks' then
      delete from public.tricks_sets where set_id = p_set_id;
    end if;
    if p_event_type <> 'jump' then
      delete from public.jump_sets where set_id = p_set_id;
    end if;
    if p_event_type <> 'other' then
      delete from public.other_sets where set_id = p_set_id;
    end if;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.sets enable row level security;
alter table public.slalom_sets enable row level security;
alter table public.tricks_sets enable row level security;
alter table public.user_learned_tricks enable row level security;
alter table public.user_in_progress_tricks enable row level security;
alter table public.user_tasks enable row level security;
alter table public.jump_sets enable row level security;
alter table public.other_sets enable row level security;
alter table public.set_notes enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy profiles_insert on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy profiles_update on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists seasons_select on public.seasons;
drop policy if exists seasons_insert on public.seasons;
drop policy if exists seasons_update on public.seasons;
drop policy if exists seasons_delete on public.seasons;
create policy seasons_select on public.seasons for select to authenticated using (auth.uid() = user_id);
create policy seasons_insert on public.seasons for insert to authenticated with check (auth.uid() = user_id);
create policy seasons_update on public.seasons for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy seasons_delete on public.seasons for delete to authenticated using (auth.uid() = user_id);

drop policy if exists sets_select on public.sets;
drop policy if exists sets_insert on public.sets;
drop policy if exists sets_update on public.sets;
drop policy if exists sets_delete on public.sets;
create policy sets_select on public.sets for select to authenticated using (auth.uid() = user_id);
create policy sets_insert on public.sets for insert to authenticated with check (auth.uid() = user_id);
create policy sets_update on public.sets for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sets_delete on public.sets for delete to authenticated using (auth.uid() = user_id);

drop policy if exists slalom_select on public.slalom_sets;
drop policy if exists slalom_insert on public.slalom_sets;
drop policy if exists slalom_update on public.slalom_sets;
drop policy if exists slalom_delete on public.slalom_sets;
create policy slalom_select on public.slalom_sets for select to authenticated using (exists (select 1 from public.sets s where s.id = slalom_sets.set_id and s.user_id = auth.uid()));
create policy slalom_insert on public.slalom_sets for insert to authenticated with check (exists (select 1 from public.sets s where s.id = slalom_sets.set_id and s.user_id = auth.uid()));
create policy slalom_update on public.slalom_sets for update to authenticated using (exists (select 1 from public.sets s where s.id = slalom_sets.set_id and s.user_id = auth.uid())) with check (exists (select 1 from public.sets s where s.id = slalom_sets.set_id and s.user_id = auth.uid()));
create policy slalom_delete on public.slalom_sets for delete to authenticated using (exists (select 1 from public.sets s where s.id = slalom_sets.set_id and s.user_id = auth.uid()));

drop policy if exists tricks_select on public.tricks_sets;
drop policy if exists tricks_insert on public.tricks_sets;
drop policy if exists tricks_update on public.tricks_sets;
drop policy if exists tricks_delete on public.tricks_sets;
create policy tricks_select on public.tricks_sets for select to authenticated using (exists (select 1 from public.sets s where s.id = tricks_sets.set_id and s.user_id = auth.uid()));
create policy tricks_insert on public.tricks_sets for insert to authenticated with check (exists (select 1 from public.sets s where s.id = tricks_sets.set_id and s.user_id = auth.uid()));
create policy tricks_update on public.tricks_sets for update to authenticated using (exists (select 1 from public.sets s where s.id = tricks_sets.set_id and s.user_id = auth.uid())) with check (exists (select 1 from public.sets s where s.id = tricks_sets.set_id and s.user_id = auth.uid()));
create policy tricks_delete on public.tricks_sets for delete to authenticated using (exists (select 1 from public.sets s where s.id = tricks_sets.set_id and s.user_id = auth.uid()));

drop policy if exists learned_tricks_select on public.user_learned_tricks;
drop policy if exists learned_tricks_insert on public.user_learned_tricks;
drop policy if exists learned_tricks_update on public.user_learned_tricks;
drop policy if exists learned_tricks_delete on public.user_learned_tricks;
create policy learned_tricks_select on public.user_learned_tricks for select to authenticated using (auth.uid() = user_id);
create policy learned_tricks_insert on public.user_learned_tricks for insert to authenticated with check (auth.uid() = user_id);
create policy learned_tricks_update on public.user_learned_tricks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy learned_tricks_delete on public.user_learned_tricks for delete to authenticated using (auth.uid() = user_id);

drop policy if exists in_progress_tricks_select on public.user_in_progress_tricks;
drop policy if exists in_progress_tricks_insert on public.user_in_progress_tricks;
drop policy if exists in_progress_tricks_update on public.user_in_progress_tricks;
drop policy if exists in_progress_tricks_delete on public.user_in_progress_tricks;
create policy in_progress_tricks_select on public.user_in_progress_tricks for select to authenticated using (auth.uid() = user_id);
create policy in_progress_tricks_insert on public.user_in_progress_tricks for insert to authenticated with check (auth.uid() = user_id);
create policy in_progress_tricks_update on public.user_in_progress_tricks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy in_progress_tricks_delete on public.user_in_progress_tricks for delete to authenticated using (auth.uid() = user_id);

drop policy if exists user_tasks_select on public.user_tasks;
drop policy if exists user_tasks_insert on public.user_tasks;
drop policy if exists user_tasks_update on public.user_tasks;
drop policy if exists user_tasks_delete on public.user_tasks;
create policy user_tasks_select on public.user_tasks for select to authenticated using (auth.uid() = user_id);
create policy user_tasks_insert on public.user_tasks for insert to authenticated with check (auth.uid() = user_id);
create policy user_tasks_update on public.user_tasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_tasks_delete on public.user_tasks for delete to authenticated using (auth.uid() = user_id);

drop policy if exists jump_select on public.jump_sets;
drop policy if exists jump_insert on public.jump_sets;
drop policy if exists jump_update on public.jump_sets;
drop policy if exists jump_delete on public.jump_sets;
create policy jump_select on public.jump_sets for select to authenticated using (exists (select 1 from public.sets s where s.id = jump_sets.set_id and s.user_id = auth.uid()));
create policy jump_insert on public.jump_sets for insert to authenticated with check (exists (select 1 from public.sets s where s.id = jump_sets.set_id and s.user_id = auth.uid()));
create policy jump_update on public.jump_sets for update to authenticated using (exists (select 1 from public.sets s where s.id = jump_sets.set_id and s.user_id = auth.uid())) with check (exists (select 1 from public.sets s where s.id = jump_sets.set_id and s.user_id = auth.uid()));
create policy jump_delete on public.jump_sets for delete to authenticated using (exists (select 1 from public.sets s where s.id = jump_sets.set_id and s.user_id = auth.uid()));

drop policy if exists other_select on public.other_sets;
drop policy if exists other_insert on public.other_sets;
drop policy if exists other_update on public.other_sets;
drop policy if exists other_delete on public.other_sets;
create policy other_select on public.other_sets for select to authenticated using (exists (select 1 from public.sets s where s.id = other_sets.set_id and s.user_id = auth.uid()));
create policy other_insert on public.other_sets for insert to authenticated with check (exists (select 1 from public.sets s where s.id = other_sets.set_id and s.user_id = auth.uid()));
create policy other_update on public.other_sets for update to authenticated using (exists (select 1 from public.sets s where s.id = other_sets.set_id and s.user_id = auth.uid())) with check (exists (select 1 from public.sets s where s.id = other_sets.set_id and s.user_id = auth.uid()));
create policy other_delete on public.other_sets for delete to authenticated using (exists (select 1 from public.sets s where s.id = other_sets.set_id and s.user_id = auth.uid()));

drop policy if exists set_notes_select on public.set_notes;
drop policy if exists set_notes_insert on public.set_notes;
drop policy if exists set_notes_update on public.set_notes;
drop policy if exists set_notes_delete on public.set_notes;
create policy set_notes_select on public.set_notes for select to authenticated using (exists (select 1 from public.sets s where s.id = set_notes.set_id and s.user_id = auth.uid()));
create policy set_notes_insert on public.set_notes for insert to authenticated with check (exists (select 1 from public.sets s where s.id = set_notes.set_id and s.user_id = auth.uid()));
create policy set_notes_update on public.set_notes for update to authenticated using (exists (select 1 from public.sets s where s.id = set_notes.set_id and s.user_id = auth.uid())) with check (exists (select 1 from public.sets s where s.id = set_notes.set_id and s.user_id = auth.uid()));
create policy set_notes_delete on public.set_notes for delete to authenticated using (exists (select 1 from public.sets s where s.id = set_notes.set_id and s.user_id = auth.uid()));

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

-- Built on the helper, so dashboard and import writes collide too (EC-1).
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

revoke execute on function public.join_group(uuid)  from public, anon;
grant  execute on function public.join_group(uuid)  to authenticated;
revoke execute on function public.leave_group(uuid) from public, anon;
grant  execute on function public.leave_group(uuid) to authenticated;

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

create index if not exists idx_sets_user_id_date on public.sets (user_id, date);

-- The client sends a period and a timezone, never dates. Accepting start and
-- end dates would let any member ask about a single day and learn who trained
-- which discipline on it; 365 cheap calls reconstruct a year of everyone's
-- schedule (D8).
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
  total_count   bigint
)
language plpgsql security definer set search_path = '' as $fn$
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
         count(s.id)
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
-- come back as an array) while still excluding created_by.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'group_public') then
    create type public.group_public as (
      id          uuid,
      name        text,
      description text,
      logo_key    text,
      created_at  timestamptz
    );
  end if;
end
$$;

drop function if exists public.create_group(text, text);
create function public.create_group(
  p_name        text,
  p_description text default ''
)
returns public.group_public
language plpgsql security definer set search_path = '' as $fn$
declare
  v_display     text;
  v_description text;
  v_live        integer;
  v_recent      integer;
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

  begin
    insert into public.groups (name, description, created_by)
    values (v_display, v_description, auth.uid())
    returning * into v_group;
  exception when unique_violation then
    raise exception 'group name already taken'
      using errcode = '23505', hint = 'groups.name_taken';
  end;

  insert into public.group_members (group_id, user_id) values (v_group.id, auth.uid());
  insert into public.group_creation_log (creator_id) values (auth.uid());

  v_result := (v_group.id, v_group.name, v_group.description,
               v_group.logo_key, v_group.created_at)::public.group_public;
  return v_result;
end;
$fn$;

revoke execute on function public.create_group(text, text) from public, anon;
grant  execute on function public.create_group(text, text) to authenticated;

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
