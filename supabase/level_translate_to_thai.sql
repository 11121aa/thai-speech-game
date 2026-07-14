-- ============================================================
-- Translate existing word levels from English to Thai
-- Run in Supabase SQL Editor FIRST, before wordlist2_add_por_missing.sql
--
-- LEVELS_ALL (game.html) and the wordLevel dropdown (management.html)
-- now use Thai labels. This updates every existing row in `words` so
-- the data matches: any row still holding an English level value would
-- never match a filter checkbox and would silently vanish from the
-- game's word pool.
-- ============================================================

UPDATE public.words SET level = 'เสียง'    WHERE level = 'Sound';
UPDATE public.words SET level = '1 พยางค์' WHERE level = '1 syllable';
UPDATE public.words SET level = '2 พยางค์' WHERE level = '2 syllable';
UPDATE public.words SET level = '3 พยางค์' WHERE level = '3 syllable';
UPDATE public.words SET level = 'ประโยค'   WHERE level = 'Sentences';
