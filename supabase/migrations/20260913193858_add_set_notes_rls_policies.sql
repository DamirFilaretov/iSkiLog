-- Fix: set_notes has row level security ENABLED but has never had any
-- policies defined for it (confirmed live via the Supabase security
-- advisor's rls_enabled_no_policy lint, count includes public.set_notes).
--
-- RLS-enabled-with-zero-policies means Postgres denies every row to every
-- ordinary caller by default. Writes still succeeded because
-- create_set_with_subtype / update_set_with_subtype are SECURITY DEFINER
-- (run as the table owner, which bypasses RLS entirely) -- so notes really
-- were being saved. But fetch_sets_hydrated is a plain (SECURITY INVOKER)
-- function that runs as the calling user, so its `left join set_notes`
-- silently matched zero rows for every user, every time: notes came back
-- as null -> coalesced to '' on every fetch. The user only ever saw their
-- own notes immediately after saving because that view is populated from
-- the in-memory object just written, not a re-fetch -- closing and
-- reopening the app (or just editing the set again) forces a real fetch,
-- which is why it looked like notes were "not saving" specifically on
-- reload/re-edit.
--
-- Policies mirror the existing *_via_parent pattern used by every sibling
-- subtype table (slalom_sets, tricks_sets, jump_sets, other_sets) exactly:
-- set_notes has no user_id of its own, only set_id, so ownership is
-- checked by joining back to the parent `sets` row.

create policy "set_notes_select_via_parent" on "public"."set_notes"
  for select using (
    exists (
      select 1 from "public"."sets" "s"
      where "s"."id" = "set_notes"."set_id" and "s"."user_id" = auth.uid()
    )
  );

create policy "set_notes_insert_via_parent" on "public"."set_notes"
  for insert with check (
    exists (
      select 1 from "public"."sets" "s"
      where "s"."id" = "set_notes"."set_id" and "s"."user_id" = auth.uid()
    )
  );

create policy "set_notes_update_via_parent" on "public"."set_notes"
  for update using (
    exists (
      select 1 from "public"."sets" "s"
      where "s"."id" = "set_notes"."set_id" and "s"."user_id" = auth.uid()
    )
  ) with check (
    exists (
      select 1 from "public"."sets" "s"
      where "s"."id" = "set_notes"."set_id" and "s"."user_id" = auth.uid()
    )
  );

create policy "set_notes_delete_via_parent" on "public"."set_notes"
  for delete using (
    exists (
      select 1 from "public"."sets" "s"
      where "s"."id" = "set_notes"."set_id" and "s"."user_id" = auth.uid()
    )
  );
