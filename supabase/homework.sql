-- ============================================================
-- Homework system migration
-- Run in Supabase SQL Editor after wordlist2_migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.homework (
  id           bigserial PRIMARY KEY,
  created_by   uuid REFERENCES auth.users NOT NULL,
  repeat_count integer NOT NULL DEFAULT 5,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homework_words (
  homework_id  bigint REFERENCES public.homework(id) ON DELETE CASCADE NOT NULL,
  word_id      bigint REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (homework_id, word_id)
);

CREATE TABLE IF NOT EXISTS public.homework_assignments (
  id               bigserial PRIMARY KEY,
  homework_id      bigint REFERENCES public.homework(id) ON DELETE CASCADE NOT NULL,
  patient_user_id  uuid REFERENCES auth.users NOT NULL,
  assigned_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.homework             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_words       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;

-- Specialists can do everything; patients can read their own assignments
CREATE POLICY "specialist manage homework"
  ON public.homework FOR ALL USING (is_specialist(auth.uid()));

CREATE POLICY "specialist manage homework_words"
  ON public.homework_words FOR ALL USING (is_specialist(auth.uid()));

CREATE POLICY "specialist manage assignments"
  ON public.homework_assignments FOR ALL USING (is_specialist(auth.uid()));

CREATE POLICY "patient read own assignments"
  ON public.homework_assignments FOR SELECT
  USING (auth.uid() = patient_user_id);
