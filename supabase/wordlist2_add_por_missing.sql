-- ============================================================
-- Word List 2.0 — reclassify + add missing "ป" words
-- Run in Supabase SQL Editor AFTER level_translate_to_thai.sql
--
-- "1 พยางค์ไม่มีตัวสะกด" (open syllable, no final consonant) is now its
-- own real level in the app (LEVELS_ALL in game.html), distinct from
-- plain "1 พยางค์". Two things needed:
--   1. Reclassify 3 words the original migration filed under plain
--      "1 พยางค์" that actually belong in the open-syllable group.
--   2. Insert the 5 words that were missing from the migration
--      entirely, under the correct new level.
-- ============================================================

-- 1. Reclassify
UPDATE public.words
SET level = '1 พยางค์ไม่มีตัวสะกด'
WHERE letter_category = 'ป' AND word IN ('ปลา', 'เป่า', 'ป่า');

-- 2. Insert the 5 missing words
INSERT INTO public.words (letter_category, word, level, emoji, sound_id)
SELECT v.lc, v.w, v.lv, v.w, s.id
FROM (VALUES
  ('ป','เป้า','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ป้า','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ปู่','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ไป','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ปี่','1 พยางค์ไม่มีตัวสะกด')
) AS v(lc, w, lv)
JOIN public.sounds s ON s.letter = v.lc;
