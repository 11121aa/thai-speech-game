-- ============================================================
-- Rename word levels to the fuller, clearer Thai wording
-- Run in Supabase SQL Editor
--
-- Same reasoning as level_translate_to_thai.sql: LEVELS_ALL (game.html),
-- LEVEL_ORDER (js/words-api.js), and the wordLevel dropdown
-- (management.html) now use these longer level names. Any existing word
-- row still holding an old short value would never match a filter
-- checkbox and would silently vanish from the game's word pool, so every
-- existing row needs updating to match.
-- ============================================================

UPDATE public.words SET level = 'คำ 1 พยางค์ไม่มีความหมาย'              WHERE level = 'เสียง';
UPDATE public.words SET level = 'คำ 1 พยางค์ ไม่มีตัวสะกด มีความหมาย'  WHERE level = '1 พยางค์ไม่มีตัวสะกด';
UPDATE public.words SET level = 'คำ 1 พยางค์ มีตัวสะกด มีความหมาย'     WHERE level = '1 พยางค์';
UPDATE public.words SET level = 'คำ 2 พยางค์'                          WHERE level = '2 พยางค์';
UPDATE public.words SET level = 'คำ 3 พยางค์'                          WHERE level = '3 พยางค์';
-- 'ประโยค' (sentence level) is unchanged.
