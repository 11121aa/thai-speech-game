-- ============================================================
-- Username-based accounts migration
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================
-- Accounts still use Supabase Auth's built-in email/password under the
-- hood (that part isn't changing), but the app no longer asks for a real
-- email. At signup:
--   - if the user leaves the optional "recovery email" blank, a random
--     synthetic address ("<uuid>@users.noreply.local") is used as the
--     Auth email — it's never shown and never emailed
--   - if they do provide a recovery email, THAT becomes the Auth email,
--     so Supabase's built-in "forgot password" flow keeps working for them
-- Either way, login/display always goes through the `username` chosen at
-- signup, resolved to the underlying Auth email via username_to_email()
-- below before calling signInWithPassword.
-- ============================================================

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  recovery_email text,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness, so "Alice" and "alice" can't both register.
create unique index if not exists idx_profiles_username_lower on public.profiles (lower(username));

-- Gender/age — collected at sign-up for patient (ผู้ฝึกออกเสียง) accounts
-- only; left null for specialists. Only male/female — the app is aimed at
-- young children, so this stays a simple two-option field.
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists age smallint;

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender in ('male', 'female'));

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age > 0 and age < 120);

-- Profile picture — stored in the public "avatars" bucket at
-- "{user_id}/avatar.<ext>"; this column just caches its public URL.
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_all" on storage.objects;
create policy "avatars_select_all" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_specialist" on public.profiles;
create policy "profiles_select_own_or_specialist" on public.profiles
  for select using (auth.uid() = user_id or public.is_specialist(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Resolve a username to its account's Auth email, so the client can look
-- it up before calling signInWithPassword/resetPasswordForEmail (which
-- both require the actual Auth email, not the username). Callable by
-- anon (not-yet-logged-in) so login/registration availability checks work.
-- Returns null if the username doesn't exist — reveals only "exists or
-- not", same information a normal "email already registered" error would.
--
-- Falls back to matching the input against an account's actual email if
-- no profile.username matches, so accounts created before this migration
-- (which have no username yet) can keep logging in with their old email
-- typed into the username field, with no manual data backfill needed.
-- ------------------------------------------------------------

create or replace function public.username_to_email(uname text)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select au.email from public.profiles p
     join auth.users au on au.id = p.user_id
     where lower(p.username) = lower(uname) limit 1),
    (select au.email from auth.users au
     where lower(au.email) = lower(uname) limit 1)
  );
$$;

grant execute on function public.username_to_email(text) to anon, authenticated;

-- ------------------------------------------------------------
-- list_users_for_specialist() USED to be (re)created here, but it
-- returned EVERY user to ANY specialist — exactly the access hole
-- supabase/patient_linking_migration.sql closes by dropping it for good
-- and replacing it with list_linked_patients_for_specialist(). It's
-- deliberately NOT recreated here anymore, so re-running this (older)
-- file after that (newer) one can never silently resurrect it.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- get_practice_leaderboard() (below) reads from game_scores — create it
-- here too (idempotent) in case supabase/game_scores.sql was never run.
-- ------------------------------------------------------------

create table if not exists public.game_scores (
  user_id      uuid    references auth.users not null,
  game_key     text    not null,
  best_score   integer not null default 0,
  display_name text,
  updated_at   timestamptz default now(),
  primary key  (user_id, game_key)
);

alter table public.game_scores enable row level security;

drop policy if exists "public read game_scores" on public.game_scores;
create policy "public read game_scores"
  on public.game_scores for select using (true);

drop policy if exists "own insert game_scores" on public.game_scores;
create policy "own insert game_scores"
  on public.game_scores for insert with check (auth.uid() = user_id);

drop policy if exists "own update game_scores" on public.game_scores;
create policy "own update game_scores"
  on public.game_scores for update using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Update the practice leaderboard's display-name fallback to use
-- profiles.username instead of splitting the (now often synthetic) email.
-- ------------------------------------------------------------

create or replace function public.get_practice_leaderboard(lim integer default 10)
returns table(display_name text, total_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(
      (select gs.display_name from game_scores gs where gs.user_id = p.user_id limit 1),
      (select pr.username from public.profiles pr where pr.user_id = p.user_id limit 1),
      'ผู้เล่น'
    ) as display_name,
    count(*)::bigint as total_count
  from practice p
  group by p.user_id
  order by total_count desc
  limit lim;
$$;

-- ------------------------------------------------------------
-- Done. Existing accounts (created before this migration) have no
-- profiles row yet, so management.html falls back to showing their email
-- until they log in again — nothing to backfill manually.
-- ------------------------------------------------------------
