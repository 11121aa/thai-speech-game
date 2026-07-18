-- ============================================================
-- Fix: emoji column accidentally set equal to the word itself
-- Run in Supabase SQL Editor
-- ============================================================
-- wordlist2_migration.sql's INSERT used the word text for BOTH the
-- `word` and `emoji` columns (a copy-paste artifact — its VALUES list
-- only had 3 columns per row, but the SELECT read the same source
-- column twice: "SELECT v.lc, v.w, v.lv, v.w, s.id"). Every row it
-- inserted ended up with emoji = word, which is why the word appeared
-- doubled everywhere emoji + word were shown together (recent
-- recordings, homework tables, word pickers) and why the platformer/
-- airplane/shooting/crossy word bubbles showed the word stacked twice.
-- ============================================================

update public.words
set emoji = null
where emoji = word;
