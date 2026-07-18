-- ============================================================
-- Patch: allow patients to read homework details for their assignments
-- Run in Supabase SQL Editor
-- ============================================================

-- Patients need to read the homework header (name, repeat_count)
-- when it's assigned to them.
--
-- NOTE: the outer table's column MUST be qualified (homework.id, not bare
-- id) — homework_assignments (aliased ha below) also happens to have its
-- own `id` column, and inside a correlated subquery an unqualified name
-- resolves to the innermost matching scope first. A bare `id` here
-- silently binds to ha.id instead of homework.id, turning the check into
-- "ha.homework_id = ha.id" (comparing an assignment's own foreign key to
-- its own unrelated primary key) — always false in practice, which blocks
-- every patient from ever seeing their assigned homework with no error
-- anywhere. Same reasoning applies to homework_id below (homework_words'
-- own column vs homework_assignments.homework_id).
DROP POLICY IF EXISTS "patient read assigned homework" ON public.homework;
CREATE POLICY "patient read assigned homework"
  ON public.homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.homework_id = homework.id AND ha.patient_user_id = auth.uid()
    )
  );

-- Patients need to read which words are in their assigned homework
DROP POLICY IF EXISTS "patient read assigned homework_words" ON public.homework_words;
CREATE POLICY "patient read assigned homework_words"
  ON public.homework_words FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.homework_id = homework_words.homework_id AND ha.patient_user_id = auth.uid()
    )
  );
