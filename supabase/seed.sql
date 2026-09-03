-- ============================================================================
-- Local development seed. Loaded by a plain `supabase db reset`.
--
-- NOT deployed and NOT used by the test suites: `resetDb()` in
-- tests/e2e/scripts/_db.mjs passes --no-seed, so `npm run test:db` and
-- `npm run e2e` start from a clean schema. This file is a convenience for
-- poking at the running app.
--
-- Three accounts, password "password" for all three:
--
--   alex@iskilog.dev     Alex Rivera    slalom-focused
--   sam@iskilog.dev      Sam Chen       tricks-focused
--   jordan@iskilog.dev   Jordan Blake   all-rounder
--
-- All three are in the group "Waterski Wednesdays"; Alex and Sam are also in
-- "Jump Squad". Sets are spread across the last ~30 days so the leaderboard's
-- 7-day / 30-day toggle shows different standings. Consent is pre-accepted.
--
-- Groups still ships disabled — run `npm run groups:on` after a reset to see
-- the tab (`npm run groups:off` to hide it again).
--
-- Idempotent: re-running drops the @iskilog.dev accounts first (cascades to
-- their sets, memberships, and — via the reap trigger — their groups).
-- ============================================================================

delete from auth.users where email like '%@iskilog.dev';

-- ── Accounts ────────────────────────────────────────────────────────────────
-- welcome_completed / tutorial_completed are set so the dev accounts land
-- straight on the dashboard.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password', extensions.gen_salt('bf')),
  now(), now() - interval '40 days', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'email_verified', true,
    'profile_name', u.name,
    'welcome_completed', true,
    'welcome_completed_at', '2026-08-01T00:00:00Z',
    'tutorial_completed', true,
    'tutorial_completed_at', '2026-08-01T00:00:00Z'
  ),
  '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'alex@iskilog.dev',   'Alex Rivera'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'sam@iskilog.dev',    'Sam Chen'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'jordan@iskilog.dev', 'Jordan Blake')
) as u(id, email, name);

-- auth.identities.email is a generated column — derived from identity_data.
insert into auth.identities (
  user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
select
  u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  now(), now() - interval '40 days', now()
from auth.users u
where u.email like '%@iskilog.dev';

insert into public.profiles (user_id, full_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Alex Rivera'),
  ('22222222-2222-4222-8222-222222222222', 'Sam Chen'),
  ('33333333-3333-4333-8333-333333333333', 'Jordan Blake');

-- ── Seasons (calendar-year, one active each) ────────────────────────────────

insert into public.seasons (id, user_id, name, start_date, end_date, is_active)
values
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '2026 Season', '2026-01-01', '2026-12-31', true),
  ('a2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', '2026 Season', '2026-01-01', '2026-12-31', true),
  ('a3000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', '2026 Season', '2026-01-01', '2026-12-31', true);

-- ── Groups + membership + consent ──────────────────────────────────────────

insert into public.groups (id, name, description, created_by)
values
  ('c1000000-0000-4000-8000-000000000001', 'Waterski Wednesdays', 'Midweek practice crew — slalom, tricks and jump.', '11111111-1111-4111-8111-111111111111'),
  ('c2000000-0000-4000-8000-000000000002', 'Jump Squad', 'Distance chasing.', '22222222-2222-4222-8222-222222222222');

insert into public.group_members (group_id, user_id)
values
  ('c1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111'),
  ('c1000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222'),
  ('c1000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333'),
  ('c2000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111'),
  ('c2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222');

insert into public.policy_acceptances (user_id, policy_key, version)
select id, 'groups', public.groups_policy_version()
from auth.users where email like '%@iskilog.dev';

-- ── Sets ───────────────────────────────────────────────────────────────────
-- created_at tracks the set date so History and "logged N days ago" read right.

-- Alex — slalom (8) + jump (2). 4 slalom fall inside the last 7 days.
with s(d, buoys, rope, speed, passes, fav) as (values
  (date '2026-09-03', 4.0, '13m', 58, 3, true),
  (date '2026-09-02', 2.5, '13m', 58, 2, false),
  (date '2026-08-31', 5.0, '14m', 58, 4, false),
  (date '2026-08-28', 3.0, '13m', 58, 3, false),
  (date '2026-08-24', 6.0, '14m', 55, 5, true),
  (date '2026-08-19', 1.5, '13m', 58, 2, false),
  (date '2026-08-13', 4.5, '14m', 55, 4, false),
  (date '2026-08-08', 3.0, '15m', 55, 3, false)
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, time_of_day, is_favorite, created_at, updated_at)
  select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001',
         'slalom', d, time '17:30', fav, d + time '17:30', d + time '17:30'
  from s returning id, date
)
insert into public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
select ins.id, s.buoys, s.rope, s.speed, s.passes from ins join s on s.d = ins.date;

with j(d, dist) as (values
  (date '2026-08-20', 42.5),
  (date '2026-08-11', 40.0)
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, created_at, updated_at)
  select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001',
         'jump', d, d + time '18:00', d + time '18:00'
  from j returning id, date
)
insert into public.jump_sets (set_id, subevent, attempts, passed, made, distance)
select ins.id, 'jump', 6, 6, 5, j.dist from ins join j on j.d = ins.date;

-- Sam — tricks (8) + slalom (2). 3 tricks in the last 7 days.
with t(d, dur, kind) as (values
  (date '2026-09-03', 20, 'hands'),
  (date '2026-09-01', 15, 'toes'),
  (date '2026-08-30', 25, 'mixed'),
  (date '2026-08-27', 18, 'hands'),
  (date '2026-08-23', 20, 'mixed'),
  (date '2026-08-16', 22, 'hands'),
  (date '2026-08-09', 15, 'toes'),
  (date '2026-08-05', 30, 'mixed')
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, created_at, updated_at)
  select gen_random_uuid(), '22222222-2222-4222-8222-222222222222', 'a2000000-0000-4000-8000-000000000002',
         'tricks', d, d + time '07:15', d + time '07:15'
  from t returning id, date
)
insert into public.tricks_sets (set_id, duration_minutes, trick_type)
select ins.id, t.dur, t.kind from ins join t on t.d = ins.date;

with s(d, buoys, rope, speed, passes) as (values
  (date '2026-08-25', 2.0, '16m', 55, 2),
  (date '2026-08-12', 1.0, '16m', 52, 1)
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, created_at, updated_at)
  select gen_random_uuid(), '22222222-2222-4222-8222-222222222222', 'a2000000-0000-4000-8000-000000000002',
         'slalom', d, d + time '07:15', d + time '07:15'
  from s returning id, date
)
insert into public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
select ins.id, s.buoys, s.rope, s.speed, s.passes from ins join s on s.d = ins.date;

-- Jordan — one of everything, spread evenly. 4 sets (one per discipline) in the last 7 days.
with s(d, buoys, rope, speed, passes) as (values
  (date '2026-09-02', 3.0, '14m', 55, 3),
  (date '2026-08-21', 2.0, '15m', 55, 2),
  (date '2026-08-07', 4.0, '14m', 55, 4)
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, created_at, updated_at)
  select gen_random_uuid(), '33333333-3333-4333-8333-333333333333', 'a3000000-0000-4000-8000-000000000003',
         'slalom', d, d + time '16:45', d + time '16:45'
  from s returning id, date
)
insert into public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
select ins.id, s.buoys, s.rope, s.speed, s.passes from ins join s on s.d = ins.date;

with t(d, dur, kind) as (values
  (date '2026-08-29', 18, 'mixed'),
  (date '2026-08-15', 20, 'hands')
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, created_at, updated_at)
  select gen_random_uuid(), '33333333-3333-4333-8333-333333333333', 'a3000000-0000-4000-8000-000000000003',
         'tricks', d, d + time '16:45', d + time '16:45'
  from t returning id, date
)
insert into public.tricks_sets (set_id, duration_minutes, trick_type)
select ins.id, t.dur, t.kind from ins join t on t.d = ins.date;

with j(d, sub, att, pas, mad, dist, ctype, ccount) as (values
  (date '2026-08-31', 'jump', 4, 3, 3, 38.0, null, null),
  (date '2026-08-18', 'cuts', 0, 0, 0, null, 'progressive', 8)
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, created_at, updated_at)
  select gen_random_uuid(), '33333333-3333-4333-8333-333333333333', 'a3000000-0000-4000-8000-000000000003',
         'jump', d, d + time '16:45', d + time '16:45'
  from j returning id, date
)
insert into public.jump_sets (set_id, subevent, attempts, passed, made, distance, cuts_type, cuts_count)
select ins.id, j.sub, j.att, j.pas, j.mad, j.dist, j.ctype, j.ccount from ins join j on j.d = ins.date;

with o(d, nm, dur) as (values
  (date '2026-08-28', 'Dryland / core', 45),
  (date '2026-08-10', 'Video review', 30)
), ins as (
  insert into public.sets (id, user_id, season_id, event_type, date, created_at, updated_at)
  select gen_random_uuid(), '33333333-3333-4333-8333-333333333333', 'a3000000-0000-4000-8000-000000000003',
         'other', d, d + time '19:00', d + time '19:00'
  from o returning id, date
)
insert into public.other_sets (set_id, name, duration_minutes)
select ins.id, o.nm, o.dur from ins join o on o.d = ins.date;

-- ── A few structured notes ─────────────────────────────────────────────────

insert into public.set_notes (set_id, summary, worked_on, mistakes, what_helped, next_set)
select s.id,
       'Best set of the week — ran 13m clean into 4 ball.',
       'Staying stacked through the wakes on the offside.',
       'Reaching at 5 ball on the last pass.',
       'Earlier bottom turn, let the ski finish.',
       'Try opening at 12m.'
from public.sets s
where s.user_id = '11111111-1111-4111-8111-111111111111' and s.date = '2026-09-03';

insert into public.set_notes (set_id, summary, worked_on, what_helped)
select s.id,
       'Toe-side wake work, felt smooth.',
       'Hand-to-hand timing on TWB / TWF.',
       'Slower rope, counting the beat out loud.'
from public.sets s
where s.user_id = '22222222-2222-4222-8222-222222222222' and s.date = '2026-08-30';

insert into public.set_notes (set_id, summary, next_set)
select s.id,
       'Cuts session — 8 progressive, tired at the end.',
       'Full jumps next time, aim for 40m.'
from public.sets s
where s.user_id = '33333333-3333-4333-8333-333333333333' and s.date = '2026-08-18';
