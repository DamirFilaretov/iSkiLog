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
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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
  name text null
);

create index if not exists idx_seasons_user_id on public.seasons (user_id);
create index if not exists idx_sets_user_id on public.sets (user_id);
create index if not exists idx_sets_date on public.sets (date desc);
create index if not exists idx_sets_updated_at on public.sets (updated_at desc);

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

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.sets enable row level security;
alter table public.slalom_sets enable row level security;
alter table public.tricks_sets enable row level security;
alter table public.user_learned_tricks enable row level security;
alter table public.user_in_progress_tricks enable row level security;
alter table public.jump_sets enable row level security;
alter table public.other_sets enable row level security;

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
