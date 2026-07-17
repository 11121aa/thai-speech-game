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

-- Each delete is guarded with to_regclass() so this script works no
-- matter which of the optional migrations (homework, game_scores,
-- patient_linking, ...) have or haven't been run yet — a table that
-- doesn't exist is just skipped instead of erroring the whole script out.
do $$
begin
  if to_regclass('public.homework_word_feedback') is not null then delete from public.homework_word_feedback; end if;
  if to_regclass('public.homework_assignments')   is not null then delete from public.homework_assignments;   end if;
  if to_regclass('public.homework_words')         is not null then delete from public.homework_words;         end if;
  if to_regclass('public.homework')               is not null then delete from public.homework;               end if;
  if to_regclass('public.practice')               is not null then delete from public.practice;               end if;
  if to_regclass('public.activity')               is not null then delete from public.activity;               end if;
  if to_regclass('public.game_scores')            is not null then delete from public.game_scores;            end if;
  if to_regclass('public.therapist_links')        is not null then delete from public.therapist_links;        end if;
  if to_regclass('public.role')                   is not null then delete from public.role;                   end if;
  if to_regclass('public.profiles')               is not null then delete from public.profiles;               end if;
end $$;

-- Cascades (via Supabase's own auth schema) to auth.sessions,
-- auth.refresh_tokens, auth.identities, etc. automatically.
delete from auth.users;
