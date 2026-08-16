-- ============================================================
-- Dress-up starter outfit migration
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================
-- Companion to coin_shop_migration.sql. The dress-up MINI-GAME used to be
-- deliberate free-play across the whole cosmetics catalog regardless of
-- ownership (see that file's own comment) -- game.html's dress-up game
-- now gates it by ownership too, same as everywhere else in the shop
-- system, so a brand-new account needs at least one owned outfit or the
-- game would start with nothing wearable at all.
--
-- Grants everyone the cheapest common shirt + pants ('sticker-shirt-1',
-- 'sticker-pants-1') for free and automatically:
--   - a trigger on public.profiles grants it to every NEW profile going
--     forward, right after the row is inserted (profiles are inserted
--     directly by the client on signup -- see profiles_insert_own in
--     username_auth_migration.sql -- so this hooks that insert rather
--     than an auth.users trigger)
--   - a one-time backfill grants it to every EXISTING profile that
--     doesn't already own it
-- This doesn't touch coins (price is simply never charged for these two
-- rows) or equip anything -- it only makes them appear as owned so the
-- dress-up game and the "ของฉัน" wear screen both have something to show
-- by default; the player still has to explicitly equip/wear them.
--
-- Ordering dependency: owned_cosmetics.cosmetic_id has a foreign key to
-- cosmetics.id, so this file assumes coin_shop_migration.sql (which
-- seeds 'sticker-shirt-1'/'sticker-pants-1') has already been run. On
-- this project that's already true. If a from-scratch setup script ever
-- gets written, it must run coin_shop_migration.sql BEFORE this file --
-- otherwise the trigger's insert would violate that FK on every new
-- signup and roll back profile creation entirely.
-- ============================================================

create or replace function public.grant_starter_outfit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.owned_cosmetics (user_id, cosmetic_id)
  values (new.user_id, 'sticker-shirt-1'), (new.user_id, 'sticker-pants-1')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists grant_starter_outfit_on_profile_insert on public.profiles;
create trigger grant_starter_outfit_on_profile_insert
  after insert on public.profiles
  for each row execute function public.grant_starter_outfit();

-- Backfill for accounts that already exist.
insert into public.owned_cosmetics (user_id, cosmetic_id)
select p.user_id, c.id
from public.profiles p
cross join (values ('sticker-shirt-1'), ('sticker-pants-1')) as c(id)
on conflict do nothing;

-- ------------------------------------------------------------
-- Done. Safe to re-run: the trigger is CREATE OR REPLACE'd, and both the
-- trigger's insert and the backfill insert above use ON CONFLICT DO
-- NOTHING against owned_cosmetics' (user_id, cosmetic_id) primary key.
-- ------------------------------------------------------------
