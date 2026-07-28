-- ============================================================
-- Per-teacher content isolation: words, sounds, and worksheets each
-- become private per specialist instead of shared across all of them.
-- Run in Supabase SQL Editor.
--
-- What this does:
--   1. All existing words/sounds/worksheets become the earliest-registered
--      specialist's own private content (today, that's the one real
--      specialist account in use).
--   2. Each specialist can only see and edit their OWN words/sounds/
--      worksheets from now on — no more shared curriculum.
--   3. A patient sees their linked specialist's content; if not linked to
--      anyone yet, they see the earliest specialist's content as a
--      fallback default — the moment they link, that fallback is replaced
--      entirely by their actual therapist's content.
--   4. Brand-new specialist accounts automatically get a copy of the
--      earliest specialist's words/sounds/worksheets as their starting
--      point (via a trigger on the role table), so they never start with
--      an empty database.
--
-- Also fixes a pre-existing bug: `sounds` had no INSERT/UPDATE policy at
-- all (wordlist2_migration.sql recreated the table with only a SELECT
-- policy), so the Sounds-tab management screen has likely been failing
-- silently on every save.
-- ============================================================

-- Earliest-registered specialist = the shared "default/template" account,
-- used both as the fallback content unlinked patients see and as what
-- brand-new specialists get seeded from.
CREATE OR REPLACE FUNCTION public.default_template_specialist()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id FROM public.role r WHERE r.role = 'specialist' ORDER BY r.created_at ASC LIMIT 1;
$$;

-- ------------------------------------------------------------
-- words
-- ------------------------------------------------------------
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users;
UPDATE public.words SET created_by = public.default_template_specialist() WHERE created_by IS NULL;
ALTER TABLE public.words ALTER COLUMN created_by SET NOT NULL;

DROP POLICY IF EXISTS "words_select_all" ON public.words;
DROP POLICY IF EXISTS "words_insert_specialist" ON public.words;
DROP POLICY IF EXISTS "words_update_specialist" ON public.words;
DROP POLICY IF EXISTS "words_delete_specialist" ON public.words;
DROP POLICY IF EXISTS "words_select_own" ON public.words;
DROP POLICY IF EXISTS "words_select_patient_scoped" ON public.words;
DROP POLICY IF EXISTS "words_insert_own" ON public.words;
DROP POLICY IF EXISTS "words_update_own" ON public.words;
DROP POLICY IF EXISTS "words_delete_own" ON public.words;

CREATE POLICY "words_select_own" ON public.words FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "words_select_patient_scoped" ON public.words FOR SELECT USING (
  NOT public.is_specialist(auth.uid()) AND (
    public.is_linked_patient(created_by, auth.uid())
    OR (created_by = public.default_template_specialist()
        AND NOT EXISTS (SELECT 1 FROM public.therapist_links tl WHERE tl.patient_user_id = auth.uid()))
  )
);
CREATE POLICY "words_insert_own" ON public.words FOR INSERT WITH CHECK (created_by = auth.uid() AND public.is_specialist(auth.uid()));
CREATE POLICY "words_update_own" ON public.words FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "words_delete_own" ON public.words FOR DELETE USING (created_by = auth.uid());

-- ------------------------------------------------------------
-- sounds (same shape, plus the missing write policies from before)
-- ------------------------------------------------------------
ALTER TABLE public.sounds ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users;
UPDATE public.sounds SET created_by = public.default_template_specialist() WHERE created_by IS NULL;
ALTER TABLE public.sounds ALTER COLUMN created_by SET NOT NULL;

DROP POLICY IF EXISTS "public read sounds" ON public.sounds;
DROP POLICY IF EXISTS "sounds_select_own" ON public.sounds;
DROP POLICY IF EXISTS "sounds_select_patient_scoped" ON public.sounds;
DROP POLICY IF EXISTS "sounds_insert_own" ON public.sounds;
DROP POLICY IF EXISTS "sounds_update_own" ON public.sounds;
DROP POLICY IF EXISTS "sounds_delete_own" ON public.sounds;

CREATE POLICY "sounds_select_own" ON public.sounds FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "sounds_select_patient_scoped" ON public.sounds FOR SELECT USING (
  NOT public.is_specialist(auth.uid()) AND (
    public.is_linked_patient(created_by, auth.uid())
    OR (created_by = public.default_template_specialist()
        AND NOT EXISTS (SELECT 1 FROM public.therapist_links tl WHERE tl.patient_user_id = auth.uid()))
  )
);
CREATE POLICY "sounds_insert_own" ON public.sounds FOR INSERT WITH CHECK (created_by = auth.uid() AND public.is_specialist(auth.uid()));
CREATE POLICY "sounds_update_own" ON public.sounds FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "sounds_delete_own" ON public.sounds FOR DELETE USING (created_by = auth.uid());

-- ------------------------------------------------------------
-- worksheets (created_by already exists; just rescoping policies)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "worksheets_select_all" ON public.worksheets;
DROP POLICY IF EXISTS "worksheets_write_specialist" ON public.worksheets;
DROP POLICY IF EXISTS "worksheets_select_own" ON public.worksheets;
DROP POLICY IF EXISTS "worksheets_select_patient_scoped" ON public.worksheets;
DROP POLICY IF EXISTS "worksheets_insert_own" ON public.worksheets;
DROP POLICY IF EXISTS "worksheets_update_own" ON public.worksheets;
DROP POLICY IF EXISTS "worksheets_delete_own" ON public.worksheets;

CREATE POLICY "worksheets_select_own" ON public.worksheets FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "worksheets_select_patient_scoped" ON public.worksheets FOR SELECT USING (
  NOT public.is_specialist(auth.uid()) AND (
    public.is_linked_patient(created_by, auth.uid())
    OR (created_by = public.default_template_specialist()
        AND NOT EXISTS (SELECT 1 FROM public.therapist_links tl WHERE tl.patient_user_id = auth.uid()))
  )
);
CREATE POLICY "worksheets_insert_own" ON public.worksheets FOR INSERT WITH CHECK (created_by = auth.uid() AND public.is_specialist(auth.uid()));
CREATE POLICY "worksheets_update_own" ON public.worksheets FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "worksheets_delete_own" ON public.worksheets FOR DELETE USING (created_by = auth.uid());

-- ------------------------------------------------------------
-- worksheet_words (join table, no own created_by — scope via parent
-- worksheets.created_by)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "worksheet_words_select_all" ON public.worksheet_words;
DROP POLICY IF EXISTS "worksheet_words_write_specialist" ON public.worksheet_words;
DROP POLICY IF EXISTS "worksheet_words_select_scoped" ON public.worksheet_words;
DROP POLICY IF EXISTS "worksheet_words_write_own" ON public.worksheet_words;

CREATE POLICY "worksheet_words_select_scoped" ON public.worksheet_words FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.worksheets w WHERE w.id = worksheet_id AND (
      w.created_by = auth.uid()
      OR (
        NOT public.is_specialist(auth.uid()) AND (
          public.is_linked_patient(w.created_by, auth.uid())
          OR (w.created_by = public.default_template_specialist()
              AND NOT EXISTS (SELECT 1 FROM public.therapist_links tl WHERE tl.patient_user_id = auth.uid()))
        )
      )
    )
  )
);
CREATE POLICY "worksheet_words_write_own" ON public.worksheet_words FOR ALL USING (
  EXISTS (SELECT 1 FROM public.worksheets w WHERE w.id = worksheet_id AND w.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.worksheets w WHERE w.id = worksheet_id AND w.created_by = auth.uid())
);

-- ------------------------------------------------------------
-- Auto-copy default content to a brand-new specialist
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_content_for_new_specialist()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  template_id uuid;
  sound_map jsonb := '{}'::jsonb;
  word_map jsonb := '{}'::jsonb;
  ws_map jsonb := '{}'::jsonb;
  s RECORD; w RECORD; ws RECORD; ww RECORD;
  new_id bigint;
BEGIN
  IF NEW.role != 'specialist' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.words WHERE created_by = NEW.user_id)
     OR EXISTS (SELECT 1 FROM public.sounds WHERE created_by = NEW.user_id) THEN
    RETURN NEW; -- already seeded (or already has content) — never double-copy
  END IF;

  SELECT r.user_id INTO template_id FROM public.role r
  WHERE r.role = 'specialist' AND r.user_id != NEW.user_id ORDER BY r.created_at ASC LIMIT 1;
  IF template_id IS NULL THEN RETURN NEW; END IF; -- first-ever specialist, nothing to copy

  FOR s IN SELECT * FROM public.sounds WHERE created_by = template_id LOOP
    INSERT INTO public.sounds (letter, mouth_animation_url, created_by)
    VALUES (s.letter, s.mouth_animation_url, NEW.user_id) RETURNING id INTO new_id;
    sound_map := sound_map || jsonb_build_object(s.id::text, new_id);
  END LOOP;

  FOR w IN SELECT * FROM public.words WHERE created_by = template_id LOOP
    INSERT INTO public.words (letter_category, word, level, emoji, image_url, sound_url, sound_id, created_by)
    VALUES (w.letter_category, w.word, w.level, w.emoji, w.image_url, w.sound_url,
            (sound_map ->> w.sound_id::text)::bigint, NEW.user_id) RETURNING id INTO new_id;
    word_map := word_map || jsonb_build_object(w.id::text, new_id);
  END LOOP;

  FOR ws IN SELECT * FROM public.worksheets WHERE created_by = template_id LOOP
    INSERT INTO public.worksheets (name, repeat_count, created_by)
    VALUES (ws.name, ws.repeat_count, NEW.user_id) RETURNING id INTO new_id;
    ws_map := ws_map || jsonb_build_object(ws.id::text, new_id);
    FOR ww IN SELECT * FROM public.worksheet_words WHERE worksheet_id = ws.id LOOP
      INSERT INTO public.worksheet_words (worksheet_id, word_id)
      VALUES (new_id, (word_map ->> ww.word_id::text)::bigint);
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_content ON public.role;
CREATE TRIGGER trg_seed_default_content
  AFTER INSERT OR UPDATE ON public.role
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_content_for_new_specialist();
