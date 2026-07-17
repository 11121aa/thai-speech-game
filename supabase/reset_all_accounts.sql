-- ============================================================
-- ⚠️  DESTRUCTIVE — full account reset
-- ============================================================
-- Deletes EVERY account (auth.users) and everything tied to them:
-- profiles, roles, practice recordings, homework + assignments +
-- feedback, activity logs, game scores, and therapist-patient links.
--
-- NOT touched: public.words / public.sounds (the word bank) — those
-- have no connection to accounts and are left completely alone.
--
-- Also NOT deleted: files already uploaded to the "practice-audio" and
-- "avatars" storage buckets. Deleting a user doesn't remove their old
-- files (no foreign key links storage objects to auth.users) — they
-- just become orphaned/harmless. To clear them too: Supabase dashboard
-- > Storage > practice-audio (and avatars) > select all > delete.
--
-- This cannot be undone. Run in Supabase SQL Editor only when you
-- actually want to wipe every account and start over.
-- ============================================================

delete from public.homework_word_feedback;
delete from public.homework_assignments;
delete from public.homework_words;
delete from public.homework;
delete from public.practice;
delete from public.activity;
delete from public.game_scores;
delete from public.therapist_links;
delete from public.role;
delete from public.profiles;

-- Cascades (via Supabase's own auth schema) to auth.sessions,
-- auth.refresh_tokens, auth.identities, etc. automatically.
delete from auth.users;
