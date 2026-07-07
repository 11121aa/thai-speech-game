-- ============================================================
-- Game leaderboard migration
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- One row per player per game; always keeps the personal best.
create table if not exists public.game_scores (
  user_id      uuid    references auth.users not null,
  game_key     text    not null,
  best_score   integer not null default 0,
  display_name text,
  updated_at   timestamptz default now(),
  primary key  (user_id, game_key)
);

alter table public.game_scores enable row level security;

-- Anyone (even anonymous) can read the leaderboard
create policy "public read game_scores"
  on public.game_scores for select using (true);

-- Users can insert/update only their own row
create policy "own insert game_scores"
  on public.game_scores for insert with check (auth.uid() = user_id);

create policy "own update game_scores"
  on public.game_scores for update using (auth.uid() = user_id);

-- -------------------------------------------------------
-- Practice leaderboard helper
-- Returns top-N players ranked by total words practiced.
-- Runs as superuser so it can aggregate across all users
-- without exposing individual rows to RLS.
-- -------------------------------------------------------
create or replace function public.get_practice_leaderboard(lim integer default 10)
returns table(display_name text, total_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(
      (select gs.display_name from game_scores gs
       where gs.user_id = p.user_id limit 1),
      split_part(u.email, '@', 1)
    ) as display_name,
    count(*)::bigint as total_count
  from practice p
  join auth.users u on p.user_id = u.id
  group by p.user_id, u.email
  order by total_count desc
  limit lim;
$$;
