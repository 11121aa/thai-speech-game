-- ============================================================
-- Homework system v2
-- Run in Supabase SQL Editor after homework.sql
-- ============================================================

-- 1. Add display name to homework
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';

-- 2. Link individual practice recordings to a homework assignment
ALTER TABLE public.practice ADD COLUMN IF NOT EXISTS homework_assignment_id bigint
  REFERENCES public.homework_assignments(id) ON DELETE SET NULL;

-- 3. Therapist notes per word per homework assignment
CREATE TABLE IF NOT EXISTS public.homework_word_feedback (
  id                     bigserial PRIMARY KEY,
  homework_assignment_id bigint REFERENCES public.homework_assignments(id) ON DELETE CASCADE NOT NULL,
  word_id                bigint REFERENCES public.words(id) NOT NULL,
  note                   text,
  updated_at             timestamptz DEFAULT now(),
  UNIQUE (homework_assignment_id, word_id)
);

ALTER TABLE public.homework_word_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialist manage hw_feedback"
  ON public.homework_word_feedback FOR ALL USING (is_specialist(auth.uid()));

CREATE POLICY "patient read own hw_feedback"
  ON public.homework_word_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.id = homework_assignment_id AND ha.patient_user_id = auth.uid()
    )
  );
