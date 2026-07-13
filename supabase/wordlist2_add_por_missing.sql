-- ============================================================
-- Word List 2.0 — add missing "ป" words
-- Run in Supabase SQL Editor (after wordlist2_migration.sql)
--
-- The 5 words below were in the latest "ป" word list but not in the
-- original wordlist2_migration.sql insert. Inserted under level =
-- '1 syllable' (not the finer "without ตัวสะกด" distinction) to match
-- the app's fixed level set: Sound, 1 syllable, 2 syllable, 3
-- syllable, Sentences (see LEVELS_ALL in game.html) — any other
-- string would never match a filter and the word would never appear.
-- ============================================================

INSERT INTO public.words (letter_category, word, level, emoji, sound_id)
SELECT v.lc, v.w, v.lv, v.w, s.id
FROM (VALUES
  ('ป','เป้า','1 syllable'),
  ('ป','ป้า','1 syllable'),
  ('ป','ปู่','1 syllable'),
  ('ป','ไป','1 syllable'),
  ('ป','ปี่','1 syllable')
) AS v(lc, w, lv)
JOIN public.sounds s ON s.letter = v.lc;
