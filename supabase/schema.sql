-- ============================================================
-- AI Pronunciation Learning System - Supabase schema
-- Run this whole file once in the Supabase SQL Editor
-- (Project > SQL Editor > New query > paste > Run)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------

create table if not exists public.words (
  id bigserial primary key,
  exercise_code text not null,
  letter_category text not null,
  word text not null,
  reading text not null,
  emoji text,
  age_level smallint not null check (age_level in (4, 5, 6, 7)),
  created_at timestamptz not null default now()
);

create index if not exists idx_words_age_level on public.words (age_level);
create index if not exists idx_words_exercise_code on public.words (exercise_code);

-- URL of a mouth-diagram image showing how to pronounce this word's
-- target consonant. NULL = no image yet; the app shows a placeholder.
alter table public.words add column if not exists mouth_image_url text;

create table if not exists public.role (
  id bigserial primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'specialist')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.practice (
  id bigserial primary key,
  word_id bigint not null references public.words (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score numeric(5, 2),
  file_path text not null,
  practiced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_practice_user_id on public.practice (user_id);
create index if not exists idx_practice_word_id on public.practice (word_id);

-- parent_marked_correct: the parent/practicing user's own in-the-moment
-- judgment, kept separate from `score` (which only a specialist sets).
alter table public.practice add column if not exists parent_marked_correct boolean;

create table if not exists public.activity (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_type text not null check (activity_type in ('login', 'logout', 'page_view')),
  page_name text,
  activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_user_id on public.activity (user_id);

-- ------------------------------------------------------------
-- 2. Helper function: is the current/given user a specialist?
--    security definer so it bypasses RLS on public.role and
--    avoids infinite recursion when used inside role's own policies.
-- ------------------------------------------------------------

create or replace function public.is_specialist(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.role r
    where r.user_id = uid and r.role = 'specialist'
  );
$$;

-- ------------------------------------------------------------
-- 2b. Helper function: list every auth user's id+email, but only
--     returns rows when the caller is a specialist (used to build
--     the "filter by person" dropdown in management.html). Returns
--     an empty set for non-specialists.
-- ------------------------------------------------------------

create or replace function public.list_users_for_specialist()
returns table (user_id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email
  from auth.users u
  where public.is_specialist(auth.uid())
  order by u.email;
$$;

-- ------------------------------------------------------------
-- 3. Enable RLS
-- ------------------------------------------------------------

alter table public.words enable row level security;
alter table public.role enable row level security;
alter table public.practice enable row level security;
alter table public.activity enable row level security;

-- ------------------------------------------------------------
-- 4. Policies: words
--    Everyone (incl. anonymous) can read, only specialists write.
-- ------------------------------------------------------------

drop policy if exists "words_select_all" on public.words;
create policy "words_select_all" on public.words
  for select using (true);

drop policy if exists "words_insert_specialist" on public.words;
create policy "words_insert_specialist" on public.words
  for insert with check (public.is_specialist(auth.uid()));

drop policy if exists "words_update_specialist" on public.words;
create policy "words_update_specialist" on public.words
  for update using (public.is_specialist(auth.uid()))
  with check (public.is_specialist(auth.uid()));

drop policy if exists "words_delete_specialist" on public.words;
create policy "words_delete_specialist" on public.words
  for delete using (public.is_specialist(auth.uid()));

-- ------------------------------------------------------------
-- 5. Policies: role
--    A user can see/insert only their own row (insert = register).
--    Specialists can see every row; only specialists can edit/delete.
-- ------------------------------------------------------------

drop policy if exists "role_select_own_or_specialist" on public.role;
create policy "role_select_own_or_specialist" on public.role
  for select using (auth.uid() = user_id or public.is_specialist(auth.uid()));

drop policy if exists "role_insert_own" on public.role;
create policy "role_insert_own" on public.role
  for insert with check (auth.uid() = user_id);

drop policy if exists "role_update_specialist" on public.role;
create policy "role_update_specialist" on public.role
  for update using (public.is_specialist(auth.uid()))
  with check (public.is_specialist(auth.uid()));

drop policy if exists "role_delete_specialist" on public.role;
create policy "role_delete_specialist" on public.role
  for delete using (public.is_specialist(auth.uid()));

-- ------------------------------------------------------------
-- 6. Policies: practice
--    A user can see/insert only their own rows.
--    Specialists can see all rows and are the only ones who can
--    update (enter a score) or delete.
-- ------------------------------------------------------------

drop policy if exists "practice_select_own_or_specialist" on public.practice;
create policy "practice_select_own_or_specialist" on public.practice
  for select using (auth.uid() = user_id or public.is_specialist(auth.uid()));

drop policy if exists "practice_insert_own" on public.practice;
create policy "practice_insert_own" on public.practice
  for insert with check (auth.uid() = user_id);

drop policy if exists "practice_update_specialist" on public.practice;
create policy "practice_update_specialist" on public.practice
  for update using (public.is_specialist(auth.uid()))
  with check (public.is_specialist(auth.uid()));

drop policy if exists "practice_delete_specialist" on public.practice;
create policy "practice_delete_specialist" on public.practice
  for delete using (public.is_specialist(auth.uid()));

-- The practicing user/parent may also update their OWN row (to set
-- parent_marked_correct). A trigger (below) clamps every other column
-- back to its old value when the caller isn't a specialist, so this
-- can never be used to touch `score` or other specialist-only fields.
drop policy if exists "practice_update_own" on public.practice;
create policy "practice_update_own" on public.practice
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.enforce_practice_update_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_specialist(auth.uid()) then
    new.score := old.score;
    new.word_id := old.word_id;
    new.user_id := old.user_id;
    new.file_path := old.file_path;
    new.practiced_at := old.practiced_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_practice_update_rules on public.practice;
create trigger trg_practice_update_rules
  before update on public.practice
  for each row execute function public.enforce_practice_update_rules();

-- ------------------------------------------------------------
-- 7. Policies: activity
--    Same own-row / specialist-sees-all pattern as practice.
-- ------------------------------------------------------------

drop policy if exists "activity_select_own_or_specialist" on public.activity;
create policy "activity_select_own_or_specialist" on public.activity
  for select using (auth.uid() = user_id or public.is_specialist(auth.uid()));

drop policy if exists "activity_insert_own" on public.activity;
create policy "activity_insert_own" on public.activity
  for insert with check (auth.uid() = user_id);

drop policy if exists "activity_update_specialist" on public.activity;
create policy "activity_update_specialist" on public.activity
  for update using (public.is_specialist(auth.uid()))
  with check (public.is_specialist(auth.uid()));

drop policy if exists "activity_delete_specialist" on public.activity;
create policy "activity_delete_specialist" on public.activity
  for delete using (public.is_specialist(auth.uid()));

-- ------------------------------------------------------------
-- 8. Storage bucket for recorded pronunciation audio
--    Files are stored at path "{user_id}/{uuid}.webm"
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('practice-audio', 'practice-audio', false)
on conflict (id) do nothing;

drop policy if exists "practice_audio_select_own_or_specialist" on storage.objects;
create policy "practice_audio_select_own_or_specialist" on storage.objects
  for select using (
    bucket_id = 'practice-audio'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_specialist(auth.uid()))
  );

drop policy if exists "practice_audio_insert_own" on storage.objects;
create policy "practice_audio_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'practice-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "practice_audio_update_own" on storage.objects;
create policy "practice_audio_update_own" on storage.objects
  for update using (
    bucket_id = 'practice-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'practice-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "practice_audio_delete_own_or_specialist" on storage.objects;
create policy "practice_audio_delete_own_or_specialist" on storage.objects
  for delete using (
    bucket_id = 'practice-audio'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_specialist(auth.uid()))
  );

-- ------------------------------------------------------------
-- Done. Next steps (see README.md):
--   1. Disable "Confirm email" in Authentication > Providers > Email
--   2. Import data/words.csv into the words table (Table Editor > Insert > Import data from CSV)
--   3. Copy your Project URL + anon public key into js/config.js
-- ------------------------------------------------------------
