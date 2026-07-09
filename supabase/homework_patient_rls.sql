-- ============================================================
-- Patch: allow patients to read homework details for their assignments
-- Run in Supabase SQL Editor
-- ============================================================

-- Patients need to read the homework header (name, repeat_count)
-- when it's assigned to them
CREATE POLICY "patient read assigned homework"
  ON public.homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.homework_id = id AND ha.patient_user_id = auth.uid()
    )
  );

-- Patients need to read which words are in their assigned homework
CREATE POLICY "patient read assigned homework_words"
  ON public.homework_words FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.homework_id = homework_id AND ha.patient_user_id = auth.uid()
    )
  );
