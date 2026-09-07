


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."event_type" AS ENUM (
    'slalom',
    'tricks',
    'jump',
    'other'
);


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_set_with_subtype"("p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone DEFAULT NULL::time without time zone, "p_notes" "jsonb" DEFAULT '{}'::"jsonb", "p_buoys" numeric DEFAULT NULL::numeric, "p_rope_length" "text" DEFAULT NULL::"text", "p_speed" numeric DEFAULT NULL::numeric, "p_passes_count" integer DEFAULT NULL::integer, "p_duration_minutes" integer DEFAULT NULL::integer, "p_trick_type" "text" DEFAULT NULL::"text", "p_subevent" "text" DEFAULT NULL::"text", "p_attempts" integer DEFAULT NULL::integer, "p_passed" integer DEFAULT NULL::integer, "p_made" integer DEFAULT NULL::integer, "p_distance" numeric DEFAULT NULL::numeric, "p_cuts_type" "text" DEFAULT NULL::"text", "p_cuts_count" integer DEFAULT NULL::integer, "p_other_name" "text" DEFAULT NULL::"text", "p_other_duration_minutes" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
  v_set_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_season_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.seasons s
    WHERE s.id = p_season_id AND s.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Season not found or not owned by user';
  END IF;

  IF p_event_type NOT IN ('slalom', 'tricks', 'jump', 'other') THEN
    RAISE EXCEPTION 'Unsupported event type: %', p_event_type;
  END IF;

  INSERT INTO public.sets (user_id, season_id, is_favorite, event_type, date, time_of_day)
  VALUES (v_user_id, p_season_id, COALESCE(p_is_favorite, false), p_event_type::event_type, p_date, p_time_of_day)
  RETURNING id INTO v_set_id;

  INSERT INTO public.set_notes (set_id, summary, worked_on, mistakes, what_helped, next_set, other)
  VALUES (
    v_set_id,
    COALESCE(p_notes->>'summary', ''),
    COALESCE(p_notes->>'workedOn', ''),
    COALESCE(p_notes->>'mistakes', ''),
    COALESCE(p_notes->>'whatHelped', ''),
    COALESCE(p_notes->>'nextSet', ''),
    COALESCE(p_notes->>'other', '')
  );

  IF p_event_type = 'slalom' THEN
    INSERT INTO public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
    VALUES (v_set_id, COALESCE(p_buoys, 0), COALESCE(p_rope_length, ''), p_speed, COALESCE(p_passes_count, 0));
  ELSIF p_event_type = 'tricks' THEN
    INSERT INTO public.tricks_sets (set_id, duration_minutes, trick_type)
    VALUES (v_set_id, p_duration_minutes, p_trick_type);
  ELSIF p_event_type = 'jump' THEN
    INSERT INTO public.jump_sets (set_id, subevent, attempts, passed, made, distance, cuts_type, cuts_count)
    VALUES (
      v_set_id,
      COALESCE(p_subevent, 'jump'),
      CASE WHEN COALESCE(p_subevent, 'jump') = 'cuts' THEN 0 ELSE COALESCE(p_attempts, 0) END,
      CASE WHEN COALESCE(p_subevent, 'jump') = 'cuts' THEN 0 ELSE COALESCE(p_passed, 0) END,
      CASE WHEN COALESCE(p_subevent, 'jump') = 'cuts' THEN 0 ELSE COALESCE(p_made, 0) END,
      p_distance, p_cuts_type, p_cuts_count
    );
  ELSE
    INSERT INTO public.other_sets (set_id, name, duration_minutes)
    VALUES (v_set_id, COALESCE(p_other_name, ''), p_other_duration_minutes);
  END IF;

  RETURN v_set_id;
END;
$$;


ALTER FUNCTION "public"."create_set_with_subtype"("p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_sets_hydrated"() RETURNS TABLE("set_id" "uuid", "event_type" "text", "date" "date", "season_id" "uuid", "is_favorite" boolean, "notes_summary" "text", "notes_worked_on" "text", "notes_mistakes" "text", "notes_what_helped" "text", "notes_next_set" "text", "notes_other" "text", "buoys" numeric, "rope_length" "text", "speed" numeric, "passes_count" integer, "duration_minutes" integer, "trick_type" "text", "jump_subevent" "text", "jump_attempts" integer, "jump_passed" integer, "jump_made" integer, "jump_distance" numeric, "jump_cuts_type" "text", "jump_cuts_count" integer, "other_name" "text", "other_duration_minutes" integer)
    LANGUAGE "sql" STABLE
    AS $$
  select
    s.id as set_id,
    s.event_type::text as event_type,
    s.date,
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


ALTER FUNCTION "public"."fetch_sets_hydrated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_season_atomic"("p_season_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."set_active_season_atomic"("p_season_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_set_with_subtype"("p_set_id" "uuid", "p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone DEFAULT NULL::time without time zone, "p_notes" "jsonb" DEFAULT '{}'::"jsonb", "p_buoys" numeric DEFAULT NULL::numeric, "p_rope_length" "text" DEFAULT NULL::"text", "p_speed" numeric DEFAULT NULL::numeric, "p_passes_count" integer DEFAULT NULL::integer, "p_duration_minutes" integer DEFAULT NULL::integer, "p_trick_type" "text" DEFAULT NULL::"text", "p_subevent" "text" DEFAULT NULL::"text", "p_attempts" integer DEFAULT NULL::integer, "p_passed" integer DEFAULT NULL::integer, "p_made" integer DEFAULT NULL::integer, "p_distance" numeric DEFAULT NULL::numeric, "p_cuts_type" "text" DEFAULT NULL::"text", "p_cuts_count" integer DEFAULT NULL::integer, "p_other_name" "text" DEFAULT NULL::"text", "p_other_duration_minutes" integer DEFAULT NULL::integer, "p_event_changed" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.sets
  SET
    season_id   = p_season_id,
    is_favorite = COALESCE(p_is_favorite, false),
    event_type  = p_event_type::event_type,
    date        = p_date,
    time_of_day = p_time_of_day,
    updated_at  = now()
  WHERE id = p_set_id AND user_id = v_user_id;

  INSERT INTO public.set_notes (set_id, summary, worked_on, mistakes, what_helped, next_set, other)
  VALUES (
    p_set_id,
    COALESCE(p_notes->>'summary', ''),
    COALESCE(p_notes->>'workedOn', ''),
    COALESCE(p_notes->>'mistakes', ''),
    COALESCE(p_notes->>'whatHelped', ''),
    COALESCE(p_notes->>'nextSet', ''),
    COALESCE(p_notes->>'other', '')
  )
  ON CONFLICT (set_id) DO UPDATE SET
    summary     = EXCLUDED.summary,
    worked_on   = EXCLUDED.worked_on,
    mistakes    = EXCLUDED.mistakes,
    what_helped = EXCLUDED.what_helped,
    next_set    = EXCLUDED.next_set,
    other       = EXCLUDED.other;

  IF p_event_changed THEN
    DELETE FROM public.slalom_sets WHERE set_id = p_set_id;
    DELETE FROM public.tricks_sets WHERE set_id = p_set_id;
    DELETE FROM public.jump_sets    WHERE set_id = p_set_id;
    DELETE FROM public.other_sets   WHERE set_id = p_set_id;
  END IF;

  IF p_event_type = 'slalom' THEN
    INSERT INTO public.slalom_sets (set_id, buoys, rope_length, speed, passes_count)
    VALUES (p_set_id, COALESCE(p_buoys, 0), COALESCE(p_rope_length, ''), p_speed, COALESCE(p_passes_count, 0))
    ON CONFLICT (set_id) DO UPDATE SET
      buoys        = EXCLUDED.buoys,
      rope_length  = EXCLUDED.rope_length,
      speed        = EXCLUDED.speed,
      passes_count = EXCLUDED.passes_count;
  ELSIF p_event_type = 'tricks' THEN
    INSERT INTO public.tricks_sets (set_id, duration_minutes, trick_type)
    VALUES (p_set_id, p_duration_minutes, p_trick_type)
    ON CONFLICT (set_id) DO UPDATE SET
      duration_minutes = EXCLUDED.duration_minutes,
      trick_type       = EXCLUDED.trick_type;
  ELSIF p_event_type = 'jump' THEN
    INSERT INTO public.jump_sets (set_id, subevent, attempts, passed, made, distance, cuts_type, cuts_count)
    VALUES (
      p_set_id,
      COALESCE(p_subevent, 'jump'),
      CASE WHEN COALESCE(p_subevent, 'jump') = 'cuts' THEN 0 ELSE COALESCE(p_attempts, 0) END,
      CASE WHEN COALESCE(p_subevent, 'jump') = 'cuts' THEN 0 ELSE COALESCE(p_passed, 0) END,
      CASE WHEN COALESCE(p_subevent, 'jump') = 'cuts' THEN 0 ELSE COALESCE(p_made, 0) END,
      p_distance, p_cuts_type, p_cuts_count
    )
    ON CONFLICT (set_id) DO UPDATE SET
      subevent   = EXCLUDED.subevent,
      attempts   = EXCLUDED.attempts,
      passed     = EXCLUDED.passed,
      made       = EXCLUDED.made,
      distance   = EXCLUDED.distance,
      cuts_type  = EXCLUDED.cuts_type,
      cuts_count = EXCLUDED.cuts_count;
  ELSE
    INSERT INTO public.other_sets (set_id, name, duration_minutes)
    VALUES (p_set_id, COALESCE(p_other_name, ''), p_other_duration_minutes)
    ON CONFLICT (set_id) DO UPDATE SET
      name             = EXCLUDED.name,
      duration_minutes = EXCLUDED.duration_minutes;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_set_with_subtype"("p_set_id" "uuid", "p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer, "p_event_changed" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."jump_sets" (
    "set_id" "uuid" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "passed" integer DEFAULT 0 NOT NULL,
    "made" integer DEFAULT 0 NOT NULL,
    "subevent" "text" DEFAULT 'jump'::"text" NOT NULL,
    "distance" numeric,
    "cuts_type" "text",
    "cuts_count" integer,
    CONSTRAINT "jump_bounds" CHECK ((("passed" <= "attempts") AND ("made" <= "attempts"))),
    CONSTRAINT "jump_non_negative" CHECK ((("attempts" >= 0) AND ("passed" >= 0) AND ("made" >= 0)))
);


ALTER TABLE "public"."jump_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."other_sets" (
    "set_id" "uuid" NOT NULL,
    "name" "text",
    "duration_minutes" integer
);


ALTER TABLE "public"."other_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    CONSTRAINT "seasons_date_order" CHECK (("start_date" < "end_date"))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."set_notes" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "set_id" "uuid" NOT NULL,
    "summary" "text" DEFAULT ''::"text" NOT NULL,
    "worked_on" "text" DEFAULT ''::"text" NOT NULL,
    "mistakes" "text" DEFAULT ''::"text" NOT NULL,
    "what_helped" "text" DEFAULT ''::"text" NOT NULL,
    "next_set" "text" DEFAULT ''::"text" NOT NULL,
    "other" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."set_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "season_id" "uuid",
    "event_type" "public"."event_type" NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_favorite" boolean DEFAULT false NOT NULL,
    "time_of_day" time without time zone
);


ALTER TABLE "public"."sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slalom_sets" (
    "set_id" "uuid" NOT NULL,
    "buoys" numeric(3,1) DEFAULT 0 NOT NULL,
    "speed" integer,
    "rope_length" "text",
    "passes_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "slalom_sets_passes_count_nonnegative" CHECK (("passes_count" >= 0))
);


ALTER TABLE "public"."slalom_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tricks_sets" (
    "set_id" "uuid" NOT NULL,
    "duration_minutes" integer,
    "trick_type" "text"
);


ALTER TABLE "public"."tricks_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_in_progress_tricks" (
    "user_id" "uuid" NOT NULL,
    "trick_id" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_in_progress_tricks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_learned_tricks" (
    "user_id" "uuid" NOT NULL,
    "trick_id" "text" NOT NULL,
    "learned_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_learned_tricks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_tasks" (
    "id" "uuid" DEFAULT "extensions"."gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "due_date" "date",
    "is_done" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "user_tasks_title_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 1) AND ("char_length"(TRIM(BOTH FROM "title")) <= 140)))
);


ALTER TABLE "public"."user_tasks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."jump_sets"
    ADD CONSTRAINT "jump_sets_pkey" PRIMARY KEY ("set_id");



ALTER TABLE ONLY "public"."other_sets"
    ADD CONSTRAINT "other_sets_pkey" PRIMARY KEY ("set_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."set_notes"
    ADD CONSTRAINT "set_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."set_notes"
    ADD CONSTRAINT "set_notes_set_id_key" UNIQUE ("set_id");



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slalom_sets"
    ADD CONSTRAINT "slalom_sets_pkey" PRIMARY KEY ("set_id");



ALTER TABLE ONLY "public"."tricks_sets"
    ADD CONSTRAINT "tricks_sets_pkey" PRIMARY KEY ("set_id");



ALTER TABLE ONLY "public"."user_in_progress_tricks"
    ADD CONSTRAINT "user_in_progress_tricks_pkey" PRIMARY KEY ("user_id", "trick_id");



ALTER TABLE ONLY "public"."user_learned_tricks"
    ADD CONSTRAINT "user_learned_tricks_pkey" PRIMARY KEY ("user_id", "trick_id");



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_sets_user_favorite_date" ON "public"."sets" USING "btree" ("user_id", "is_favorite", "date" DESC);



CREATE INDEX "idx_user_tasks_done_due" ON "public"."user_tasks" USING "btree" ("is_done", "due_date");



CREATE INDEX "idx_user_tasks_due_date" ON "public"."user_tasks" USING "btree" ("due_date");



CREATE INDEX "idx_user_tasks_updated_at" ON "public"."user_tasks" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_user_tasks_user_id" ON "public"."user_tasks" USING "btree" ("user_id");



CREATE UNIQUE INDEX "seasons_one_active_per_user" ON "public"."seasons" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "seasons_user_dates_idx" ON "public"."seasons" USING "btree" ("user_id", "start_date", "end_date");



CREATE INDEX "seasons_user_idx" ON "public"."seasons" USING "btree" ("user_id");



CREATE INDEX "sets_season_date_idx" ON "public"."sets" USING "btree" ("season_id", "date");



CREATE INDEX "sets_user_date_idx" ON "public"."sets" USING "btree" ("user_id", "date");



CREATE INDEX "sets_user_season_date_idx" ON "public"."sets" USING "btree" ("user_id", "season_id", "date");



CREATE OR REPLACE TRIGGER "trg_user_tasks_updated_at" BEFORE UPDATE ON "public"."user_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."jump_sets"
    ADD CONSTRAINT "jump_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."other_sets"
    ADD CONSTRAINT "other_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."set_notes"
    ADD CONSTRAINT "set_notes_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slalom_sets"
    ADD CONSTRAINT "slalom_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tricks_sets"
    ADD CONSTRAINT "tricks_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_in_progress_tricks"
    ADD CONSTRAINT "user_in_progress_tricks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_learned_tricks"
    ADD CONSTRAINT "user_learned_tricks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "in_progress_tricks_delete" ON "public"."user_in_progress_tricks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "in_progress_tricks_insert" ON "public"."user_in_progress_tricks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "in_progress_tricks_select" ON "public"."user_in_progress_tricks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "in_progress_tricks_update" ON "public"."user_in_progress_tricks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "jump_delete_via_parent" ON "public"."jump_sets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "jump_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "jump_insert_via_parent" ON "public"."jump_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "jump_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "jump_select_via_parent" ON "public"."jump_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "jump_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."jump_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jump_update_via_parent" ON "public"."jump_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "jump_sets"."set_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "jump_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "learned_tricks_delete" ON "public"."user_learned_tricks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "learned_tricks_insert" ON "public"."user_learned_tricks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "learned_tricks_select" ON "public"."user_learned_tricks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "learned_tricks_update" ON "public"."user_learned_tricks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "other_delete_via_parent" ON "public"."other_sets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "other_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "other_insert_via_parent" ON "public"."other_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "other_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "other_select_via_parent" ON "public"."other_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "other_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."other_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "other_update_via_parent" ON "public"."other_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "other_sets"."set_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "other_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles_upsert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_insert_own" ON "public"."seasons" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "seasons_select_own" ON "public"."seasons" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "seasons_update_own" ON "public"."seasons" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."set_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sets_delete_own" ON "public"."sets" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sets_insert_own" ON "public"."sets" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "sets_select_own" ON "public"."sets" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sets_update_own" ON "public"."sets" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "slalom_delete_via_parent" ON "public"."slalom_sets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "slalom_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "slalom_insert_via_parent" ON "public"."slalom_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "slalom_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "slalom_select_via_parent" ON "public"."slalom_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "slalom_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."slalom_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "slalom_update_via_parent" ON "public"."slalom_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "slalom_sets"."set_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "slalom_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "tricks_delete_via_parent" ON "public"."tricks_sets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "tricks_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "tricks_insert_via_parent" ON "public"."tricks_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "tricks_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "tricks_select_via_parent" ON "public"."tricks_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "tricks_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."tricks_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tricks_update_via_parent" ON "public"."tricks_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "tricks_sets"."set_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sets" "s"
  WHERE (("s"."id" = "tricks_sets"."set_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."user_in_progress_tricks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_learned_tricks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_tasks_delete" ON "public"."user_tasks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_tasks_insert" ON "public"."user_tasks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_tasks_select" ON "public"."user_tasks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_tasks_update" ON "public"."user_tasks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."create_set_with_subtype"("p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_set_with_subtype"("p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_set_with_subtype"("p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_sets_hydrated"() TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_sets_hydrated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_sets_hydrated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_active_season_atomic"("p_season_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_active_season_atomic"("p_season_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_active_season_atomic"("p_season_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_set_with_subtype"("p_set_id" "uuid", "p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer, "p_event_changed" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_set_with_subtype"("p_set_id" "uuid", "p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer, "p_event_changed" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_set_with_subtype"("p_set_id" "uuid", "p_season_id" "uuid", "p_is_favorite" boolean, "p_event_type" "text", "p_date" "date", "p_time_of_day" time without time zone, "p_notes" "jsonb", "p_buoys" numeric, "p_rope_length" "text", "p_speed" numeric, "p_passes_count" integer, "p_duration_minutes" integer, "p_trick_type" "text", "p_subevent" "text", "p_attempts" integer, "p_passed" integer, "p_made" integer, "p_distance" numeric, "p_cuts_type" "text", "p_cuts_count" integer, "p_other_name" "text", "p_other_duration_minutes" integer, "p_event_changed" boolean) TO "service_role";
























GRANT ALL ON TABLE "public"."jump_sets" TO "anon";
GRANT ALL ON TABLE "public"."jump_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."jump_sets" TO "service_role";



GRANT ALL ON TABLE "public"."other_sets" TO "anon";
GRANT ALL ON TABLE "public"."other_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."other_sets" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."set_notes" TO "anon";
GRANT ALL ON TABLE "public"."set_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."set_notes" TO "service_role";



GRANT ALL ON TABLE "public"."sets" TO "anon";
GRANT ALL ON TABLE "public"."sets" TO "authenticated";
GRANT ALL ON TABLE "public"."sets" TO "service_role";



GRANT ALL ON TABLE "public"."slalom_sets" TO "anon";
GRANT ALL ON TABLE "public"."slalom_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."slalom_sets" TO "service_role";



GRANT ALL ON TABLE "public"."tricks_sets" TO "anon";
GRANT ALL ON TABLE "public"."tricks_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."tricks_sets" TO "service_role";



GRANT ALL ON TABLE "public"."user_in_progress_tricks" TO "anon";
GRANT ALL ON TABLE "public"."user_in_progress_tricks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_in_progress_tricks" TO "service_role";



GRANT ALL ON TABLE "public"."user_learned_tricks" TO "anon";
GRANT ALL ON TABLE "public"."user_learned_tricks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_learned_tricks" TO "service_role";



GRANT ALL ON TABLE "public"."user_tasks" TO "anon";
GRANT ALL ON TABLE "public"."user_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































