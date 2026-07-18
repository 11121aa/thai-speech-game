-- ============================================================
-- Worksheet system migration ("แบบฝึกหัด")
-- Run in Supabase SQL Editor (after homework_v2.sql / patient_linking_migration.sql)
-- ============================================================
-- A worksheet is a therapist-authored, predetermined word set — like
-- homework, but NOT assigned to a specific patient. It's shared curriculum
-- content (same model as words/sounds): any specialist can create/edit it,
-- and any patient can pick it from a shared list instead of customizing
-- their own sound/level filters every time they play a game.
--
-- worksheet_progress is an APPEND-ONLY list of "rounds" per (patient,
-- worksheet) — not unique per pair. Once a patient fully completes a
-- round (every word practiced repeat_count times), the next time they
-- pick that worksheet a new round is started automatically instead of
-- silently piling up hidden extra practice past the visible columns.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.worksheets (
  id           bigserial PRIMARY KEY,
  created_by   uuid REFERENCES auth.users NOT NULL,
  name         text NOT NULL DEFAULT '',
  repeat_count integer NOT NULL DEFAULT 5,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.worksheet_words (
  worksheet_id bigint REFERENCES public.worksheets(id) ON DELETE CASCADE NOT NULL,
  word_id      bigint REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (worksheet_id, word_id)
);

CREATE TABLE IF NOT EXISTS public.worksheet_progress (
  id              bigserial PRIMARY KEY,
  worksheet_id    bigint REFERENCES public.worksheets(id) ON DELETE CASCADE NOT NULL,
  patient_user_id uuid REFERENCES auth.users NOT NULL,
  started_at      timestamptz DEFAULT now()
);

ALTER TABLE public.practice ADD COLUMN IF NOT EXISTS worksheet_progress_id bigint
  REFERENCES public.worksheet_progress(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.worksheet_word_feedback (
  id                    bigserial PRIMARY KEY,
  worksheet_progress_id bigint REFERENCES public.worksheet_progress(id) ON DELETE CASCADE NOT NULL,
  word_id               bigint REFERENCES public.words(id) NOT NULL,
  note                  text,
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (worksheet_progress_id, word_id)
);

ALTER TABLE public.worksheets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_words         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_word_feedback ENABLE ROW LEVEL SECURITY;

-- worksheets / worksheet_words: shared curriculum content like words/sounds
-- — public read (any logged-in patient browses/picks any worksheet), any
-- specialist can write (not scoped to created_by).
DROP POLICY IF EXISTS "worksheets_select_all" ON public.worksheets;
CREATE POLICY "worksheets_select_all" ON public.worksheets FOR SELECT USING (true);
DROP POLICY IF EXISTS "worksheets_write_specialist" ON public.worksheets;
CREATE POLICY "worksheets_write_specialist" ON public.worksheets
  FOR ALL USING (public.is_specialist(auth.uid())) WITH CHECK (public.is_specialist(auth.uid()));

DROP POLICY IF EXISTS "worksheet_words_select_all" ON public.worksheet_words;
CREATE POLICY "worksheet_words_select_all" ON public.worksheet_words FOR SELECT USING (true);
DROP POLICY IF EXISTS "worksheet_words_write_specialist" ON public.worksheet_words;
CREATE POLICY "worksheet_words_write_specialist" ON public.worksheet_words
  FOR ALL USING (public.is_specialist(auth.uid())) WITH CHECK (public.is_specialist(auth.uid()));

-- worksheet_progress: patient creates/reads only their own rows (no
-- update/delete — rounds are immutable once started); specialist reads
-- rounds only for linked patients (same is_linked_patient scoping that
-- patient_linking_migration.sql applies to homework_assignments).
DROP POLICY IF EXISTS "worksheet_progress_patient_insert_own" ON public.worksheet_progress;
CREATE POLICY "worksheet_progress_patient_insert_own" ON public.worksheet_progress
  FOR INSERT WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "worksheet_progress_patient_select_own" ON public.worksheet_progress;
CREATE POLICY "worksheet_progress_patient_select_own" ON public.worksheet_progress
  FOR SELECT USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "worksheet_progress_specialist_select_linked" ON public.worksheet_progress;
CREATE POLICY "worksheet_progress_specialist_select_linked" ON public.worksheet_progress
  FOR SELECT USING (public.is_linked_patient(auth.uid(), patient_user_id));

-- worksheet_word_feedback: same linked-patient scoping as homework_word_feedback.
DROP POLICY IF EXISTS "worksheet_word_feedback_specialist_manage" ON public.worksheet_word_feedback;
CREATE POLICY "worksheet_word_feedback_specialist_manage" ON public.worksheet_word_feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.worksheet_progress wp
            WHERE wp.id = worksheet_progress_id AND public.is_linked_patient(auth.uid(), wp.patient_user_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.worksheet_progress wp
            WHERE wp.id = worksheet_progress_id AND public.is_linked_patient(auth.uid(), wp.patient_user_id))
  );
DROP POLICY IF EXISTS "worksheet_word_feedback_patient_read_own" ON public.worksheet_word_feedback;
CREATE POLICY "worksheet_word_feedback_patient_read_own" ON public.worksheet_word_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.worksheet_progress wp
            WHERE wp.id = worksheet_progress_id AND wp.patient_user_id = auth.uid())
  );
