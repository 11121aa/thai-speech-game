-- ============================================================
-- Coin shop migration
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================
-- Adds a persistent coin balance, a catalog of dress-up cosmetics (both
-- art styles already in img/dressup/), and a shop where coins buy a
-- specific cosmetic outright (priced by rarity):
--   - Every time a practice recording gets marked correct (parent OR
--     multi-rep flow), a database trigger awards a fixed number of
--     coins -- no client code calls this directly, so it can't be
--     forged by editing the page's JS.
--   - Coins can only be spent through buy_cosmetic(target_id), a
--     SECURITY DEFINER function that atomically checks the balance,
--     deducts that item's price, and records ownership. The client
--     picks which item it wants but never writes to profiles.coins /
--     owned_cosmetics directly, and can't influence the price (it's
--     looked up server-side from the cosmetics table).
--   - profiles.coins has its UPDATE privilege revoked from the
--     authenticated/anon roles at the column level, so even a direct
--     PostgREST call (bypassing the app's own JS entirely) can't set
--     an arbitrary balance -- only the trigger/function above can,
--     since they run as the (privileged) function owner.
--   - What's actually WORN on the persistent profile avatar (shown on
--     the "ของฉัน" page) is separate from ownership: equip_cosmetic()/
--     unequip_cosmetic() set profiles.equipped_<slot>, only for items
--     you own. The dress-up mini-game itself is unrelated to any of
--     this -- it's free play across the whole catalog for fun/practice,
--     not gated by ownership.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Coin balance on profiles
-- ------------------------------------------------------------

alter table public.profiles add column if not exists coins integer not null default 0;

alter table public.profiles drop constraint if exists profiles_coins_nonneg;
alter table public.profiles add constraint profiles_coins_nonneg check (coins >= 0);

-- Block direct client writes to this one column. profiles_update_own
-- (from username_auth_migration.sql) still lets a user update their own
-- row for everything else (username, avatar, etc) -- Postgres column-
-- level privilege checks only apply to columns actually named in an
-- UPDATE's SET list, so this has no effect on updates that don't touch
-- coins. Only SECURITY DEFINER functions below (which run as the
-- function owner, not the caller) can still change it.
revoke update (coins) on public.profiles from authenticated, anon;

-- ------------------------------------------------------------
-- 2. Cosmetics catalog -- one row per dress-up SVG already in the repo
--    (img/dressup/*.svg = 'sticker' style, img/dressup/doll/*.svg =
--    'doll' style). Rarity is derived from which of the 5 designs per
--    slot/style it is: the first two are common, then rare/epic/
--    legendary -- rarity drives that item's price (see buy_cosmetic()
--    below), not a random draw -- the player picks exactly what they buy.
-- ------------------------------------------------------------

create table if not exists public.cosmetics (
  id text primary key,
  slot text not null check (slot in ('hat', 'shirt', 'pants', 'shoes', 'bag')),
  style text not null check (style in ('sticker', 'doll')),
  variant smallint not null check (variant between 1 and 5),
  name text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  asset_path text not null
);

insert into public.cosmetics (id, slot, style, variant, name, rarity, asset_path) values
('sticker-hat-1', 'hat', 'sticker', 1, 'Pompom beanie', 'common', 'img/dressup/hat.svg'),
('sticker-hat-2', 'hat', 'sticker', 2, 'Baseball cap', 'common', 'img/dressup/hat-2.svg'),
('sticker-hat-3', 'hat', 'sticker', 3, 'Sun hat', 'rare', 'img/dressup/hat-3.svg'),
('sticker-hat-4', 'hat', 'sticker', 4, 'Party hat', 'epic', 'img/dressup/hat-4.svg'),
('sticker-hat-5', 'hat', 'sticker', 5, 'Winter hat', 'legendary', 'img/dressup/hat-5.svg'),
('sticker-shirt-1', 'shirt', 'sticker', 1, 'Star tee', 'common', 'img/dressup/shirt.svg'),
('sticker-shirt-2', 'shirt', 'sticker', 2, 'Polo', 'common', 'img/dressup/shirt-2.svg'),
('sticker-shirt-3', 'shirt', 'sticker', 3, 'Heart tee', 'rare', 'img/dressup/shirt-3.svg'),
('sticker-shirt-4', 'shirt', 'sticker', 4, 'Sailor stripe', 'epic', 'img/dressup/shirt-4.svg'),
('sticker-shirt-5', 'shirt', 'sticker', 5, 'Dot tee', 'legendary', 'img/dressup/shirt-5.svg'),
('sticker-pants-1', 'pants', 'sticker', 1, 'Trousers', 'common', 'img/dressup/pants.svg'),
('sticker-pants-2', 'pants', 'sticker', 2, 'Cargo shorts', 'common', 'img/dressup/pants-2.svg'),
('sticker-pants-3', 'pants', 'sticker', 3, 'Polka dot', 'rare', 'img/dressup/pants-3.svg'),
('sticker-pants-4', 'pants', 'sticker', 4, 'Denim jeans', 'epic', 'img/dressup/pants-4.svg'),
('sticker-pants-5', 'pants', 'sticker', 5, 'Star pants', 'legendary', 'img/dressup/pants-5.svg'),
('sticker-shoes-1', 'shoes', 'sticker', 1, 'Sneakers', 'common', 'img/dressup/shoes.svg'),
('sticker-shoes-2', 'shoes', 'sticker', 2, 'Velcro sneakers', 'common', 'img/dressup/shoes-2.svg'),
('sticker-shoes-3', 'shoes', 'sticker', 3, 'Sandals', 'rare', 'img/dressup/shoes-3.svg'),
('sticker-shoes-4', 'shoes', 'sticker', 4, 'Boots', 'epic', 'img/dressup/shoes-4.svg'),
('sticker-shoes-5', 'shoes', 'sticker', 5, 'High-tops', 'legendary', 'img/dressup/shoes-5.svg'),
('sticker-bag-1', 'bag', 'sticker', 1, 'Satchel', 'common', 'img/dressup/bag.svg'),
('sticker-bag-2', 'bag', 'sticker', 2, 'Backpack', 'common', 'img/dressup/bag-2.svg'),
('sticker-bag-3', 'bag', 'sticker', 3, 'Tote bag', 'rare', 'img/dressup/bag-3.svg'),
('sticker-bag-4', 'bag', 'sticker', 4, 'Fanny pack', 'epic', 'img/dressup/bag-4.svg'),
('sticker-bag-5', 'bag', 'sticker', 5, 'Messenger bag', 'legendary', 'img/dressup/bag-5.svg'),
('doll-hat-1', 'hat', 'doll', 1, 'Pompom beanie', 'common', 'img/dressup/doll/hat.svg'),
('doll-hat-2', 'hat', 'doll', 2, 'Baseball cap', 'common', 'img/dressup/doll/hat-2.svg'),
('doll-hat-3', 'hat', 'doll', 3, 'Sun hat', 'rare', 'img/dressup/doll/hat-3.svg'),
('doll-hat-4', 'hat', 'doll', 4, 'Party hat', 'epic', 'img/dressup/doll/hat-4.svg'),
('doll-hat-5', 'hat', 'doll', 5, 'Winter hat', 'legendary', 'img/dressup/doll/hat-5.svg'),
('doll-shirt-1', 'shirt', 'doll', 1, 'Star tee', 'common', 'img/dressup/doll/shirt.svg'),
('doll-shirt-2', 'shirt', 'doll', 2, 'Polo', 'common', 'img/dressup/doll/shirt-2.svg'),
('doll-shirt-3', 'shirt', 'doll', 3, 'Heart tee', 'rare', 'img/dressup/doll/shirt-3.svg'),
('doll-shirt-4', 'shirt', 'doll', 4, 'Sailor stripe', 'epic', 'img/dressup/doll/shirt-4.svg'),
('doll-shirt-5', 'shirt', 'doll', 5, 'Dot tee', 'legendary', 'img/dressup/doll/shirt-5.svg'),
('doll-pants-1', 'pants', 'doll', 1, 'Trousers', 'common', 'img/dressup/doll/pants.svg'),
('doll-pants-2', 'pants', 'doll', 2, 'Cargo shorts', 'common', 'img/dressup/doll/pants-2.svg'),
('doll-pants-3', 'pants', 'doll', 3, 'Polka dot', 'rare', 'img/dressup/doll/pants-3.svg'),
('doll-pants-4', 'pants', 'doll', 4, 'Denim jeans', 'epic', 'img/dressup/doll/pants-4.svg'),
('doll-pants-5', 'pants', 'doll', 5, 'Star pants', 'legendary', 'img/dressup/doll/pants-5.svg'),
('doll-shoes-1', 'shoes', 'doll', 1, 'Sneakers', 'common', 'img/dressup/doll/shoes.svg'),
('doll-shoes-2', 'shoes', 'doll', 2, 'Velcro sneakers', 'common', 'img/dressup/doll/shoes-2.svg'),
('doll-shoes-3', 'shoes', 'doll', 3, 'Sandals', 'rare', 'img/dressup/doll/shoes-3.svg'),
('doll-shoes-4', 'shoes', 'doll', 4, 'Boots', 'epic', 'img/dressup/doll/shoes-4.svg'),
('doll-shoes-5', 'shoes', 'doll', 5, 'High-tops', 'legendary', 'img/dressup/doll/shoes-5.svg'),
('doll-bag-1', 'bag', 'doll', 1, 'Satchel', 'common', 'img/dressup/doll/bag.svg'),
('doll-bag-2', 'bag', 'doll', 2, 'Backpack', 'common', 'img/dressup/doll/bag-2.svg'),
('doll-bag-3', 'bag', 'doll', 3, 'Tote bag', 'rare', 'img/dressup/doll/bag-3.svg'),
('doll-bag-4', 'bag', 'doll', 4, 'Fanny pack', 'epic', 'img/dressup/doll/bag-4.svg'),
('doll-bag-5', 'bag', 'doll', 5, 'Messenger bag', 'legendary', 'img/dressup/doll/bag-5.svg')
on conflict (id) do update set
  slot = excluded.slot, style = excluded.style, variant = excluded.variant,
  name = excluded.name, rarity = excluded.rarity, asset_path = excluded.asset_path;

alter table public.cosmetics enable row level security;

drop policy if exists "cosmetics_select_all" on public.cosmetics;
create policy "cosmetics_select_all" on public.cosmetics for select using (true);

-- ------------------------------------------------------------
-- 3. What each user has actually unlocked. No insert/update/delete
--    policy is defined for authenticated/anon on purpose -- RLS
--    default-denies anything without an explicit permissive policy, so
--    the only way a row can ever appear here is through buy_cosmetic()
--    below (a SECURITY DEFINER function, which bypasses RLS the same
--    way is_specialist()/username_to_email() already do elsewhere in
--    this schema).
-- ------------------------------------------------------------

create table if not exists public.owned_cosmetics (
  user_id uuid not null references auth.users (id) on delete cascade,
  cosmetic_id text not null references public.cosmetics (id),
  obtained_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

alter table public.owned_cosmetics enable row level security;

drop policy if exists "owned_cosmetics_select_own" on public.owned_cosmetics;
create policy "owned_cosmetics_select_own" on public.owned_cosmetics
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. Award coins when a practice recording is marked correct.
--
--    Two exploits a naive version of this trigger would open, since a
--    signed-in browser can call the Supabase REST/RPC API directly
--    (devtools, not just this app's own JS) -- practice_insert_own only
--    checks auth.uid() = user_id, nothing about word_id/file_path/
--    parent_marked_correct being real:
--      a) fabricate unlimited new `practice` rows with
--         parent_marked_correct already true at INSERT time -- each is
--         a "fresh" row, so a naive "never twice for the same row"
--         guard does nothing to stop it.
--      b) on one real row, flip parent_marked_correct false -> true
--         over and over (practice_update_own already lets the owning
--         user change that column) to re-fire the award repeatedly.
--    This migration can't cryptographically prove a recording is real
--    without much heavier storage-existence checks, so it closes both
--    with proportionate, pragmatic guards instead:
--      - a coins_awarded_at timestamp, settable only by this trigger
--        (its INSERT/UPDATE privilege is revoked from clients below), so
--        a row can never be un-awarded and re-triggered by the client --
--        closes (b) completely.
--      - a rolling 24h cap on how many rows can award coins per user,
--        bounding (a) to a fixed ceiling instead of unlimited. This has
--        to use coins_awarded_at (server-set) rather than practiced_at
--        for the window -- practiced_at defaults to now() but is still
--        a plain client-writable column at INSERT time (practice_
--        insert_own doesn't constrain it), so a client could otherwise
--        backdate every fabricated row and make the cap never see them.
--      - practice_insert_own (schema.sql) is tightened below to require
--        file_path to actually start with the inserting user's own id,
--        matching uploadAndSavePractice()'s real upload path convention
--        -- closes the trivial "just type file_path: 'x'" version of (a).
-- ------------------------------------------------------------

alter table public.practice add column if not exists coins_awarded_at timestamptz;
revoke insert (coins_awarded_at), update (coins_awarded_at) on public.practice from authenticated, anon;

drop policy if exists "practice_insert_own" on public.practice;
create policy "practice_insert_own" on public.practice
  for insert with check (
    auth.uid() = user_id
    and file_path like (user_id::text || '/%')
  );

create or replace function public.award_coins_on_correct_practice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  coins_per_correct constant integer := 8;
  daily_award_cap constant integer := 20; -- max 20 awarded rows (160 coins) per user per rolling 24h
  awarded_today integer;
begin
  if new.parent_marked_correct = true and new.coins_awarded_at is null then
    -- Lock the user's profile row first so concurrent inserts/updates
    -- from the same user (parallel tabs, a scripted burst) serialize
    -- here one at a time instead of each reading the same pre-burst
    -- count and all passing the cap check together -- same reasoning as
    -- buy_cosmetic()'s own "for update" lock below.
    perform 1 from public.profiles where user_id = new.user_id for update;

    select count(*) into awarded_today
      from public.practice
     where user_id = new.user_id
       and coins_awarded_at is not null
       and coins_awarded_at > now() - interval '24 hours';

    if awarded_today < daily_award_cap then
      update public.profiles set coins = coins + coins_per_correct where user_id = new.user_id;
      new.coins_awarded_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_coins_on_correct_practice on public.practice;
create trigger trg_award_coins_on_correct_practice
  before insert or update on public.practice
  for each row execute function public.award_coins_on_correct_practice();

-- ------------------------------------------------------------
-- 5. Per-item price, by rarity. Centralized here (not hardcoded in the
--    shop page's JS) so buy_cosmetic() and the UI can never disagree on
--    what something costs. Re-running this file re-applies current
--    prices to every row, so tuning them later is just editing here.
-- ------------------------------------------------------------

alter table public.cosmetics add column if not exists price integer;
update public.cosmetics set price = case rarity
  when 'common'    then 15
  when 'rare'      then 35
  when 'epic'      then 70
  when 'legendary' then 150
end;
alter table public.cosmetics alter column price set not null;

-- ------------------------------------------------------------
-- 6. Buy a specific cosmetic outright -- the only way coins can be
--    spent or owned_cosmetics can gain a row. Originally this was a
--    Blooket-style random box; changed to direct pick-and-buy so the
--    player chooses exactly what they get, priced by rarity instead of
--    a flat random-pull cost.
-- ------------------------------------------------------------

create or replace function public.buy_cosmetic(target_id text)
returns table (
  cosmetic_id text, name text, slot text, style text, rarity text,
  asset_path text, coins_left integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  cur_coins integer;
  already_owned boolean;
  new_balance integer;
begin
  select c.* into item from public.cosmetics c where c.id = target_id;
  if item.id is null then
    raise exception 'ไม่พบไอเทมนี้';
  end if;

  select exists(
    select 1 from public.owned_cosmetics oc
     where oc.user_id = auth.uid() and oc.cosmetic_id = target_id
  ) into already_owned;
  if already_owned then
    raise exception 'คุณมีไอเทมนี้อยู่แล้ว';
  end if;

  select coins into cur_coins from public.profiles where user_id = auth.uid() for update;
  if cur_coins is null then
    raise exception 'ไม่พบโปรไฟล์ผู้ใช้';
  end if;
  if cur_coins < item.price then
    raise exception 'เหรียญไม่พอ';
  end if;

  update public.profiles set coins = coins - item.price
   where user_id = auth.uid()
   returning profiles.coins into new_balance;

  -- The already_owned check above runs before the coins row is locked,
  -- so two concurrent calls for the same item can both pass it -- the
  -- owned_cosmetics primary key (user_id, cosmetic_id) still catches the
  -- loser here and rolls its whole transaction back (no coins lost, no
  -- item granted), but without this catch it'd surface as a raw
  -- Postgres constraint-violation message instead of a friendly one.
  begin
    insert into public.owned_cosmetics (user_id, cosmetic_id) values (auth.uid(), target_id);
  exception when unique_violation then
    raise exception 'คุณมีไอเทมนี้อยู่แล้ว';
  end;

  return query select
    item.id, item.name, item.slot, item.style, item.rarity, item.asset_path, new_balance;
end;
$$;

grant execute on function public.buy_cosmetic(text) to authenticated;

-- ------------------------------------------------------------
-- 7. What's currently worn on the profile's own persistent avatar (shown
--    on the "ของฉัน" profile page), as opposed to what's merely owned.
--    One column per slot on profiles, each referencing a cosmetic --
--    simplest possible model since a user can only wear one thing per
--    slot at a time. Client write access is revoked the same way as
--    coins: only equip_cosmetic()/unequip_cosmetic() below (SECURITY
--    DEFINER) can change these, so a client can't equip something it
--    doesn't own, or put a 'hat' cosmetic in the 'shirt' slot, by
--    issuing a raw PATCH against profiles directly.
--
--    The dress-up MINI-GAME (js/game-dressup.js) is unrelated to this --
--    it's free play across the whole catalog regardless of ownership,
--    just for fun/practice. This equipped_* state is specifically what
--    coins bought in the shop actually dress: your persistent avatar.
-- ------------------------------------------------------------

alter table public.profiles add column if not exists equipped_hat   text references public.cosmetics (id);
alter table public.profiles add column if not exists equipped_shirt text references public.cosmetics (id);
alter table public.profiles add column if not exists equipped_pants text references public.cosmetics (id);
alter table public.profiles add column if not exists equipped_shoes text references public.cosmetics (id);
alter table public.profiles add column if not exists equipped_bag   text references public.cosmetics (id);

revoke update (equipped_hat, equipped_shirt, equipped_pants, equipped_shoes, equipped_bag)
  on public.profiles from authenticated, anon;

create or replace function public.equip_cosmetic(target_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  owns boolean;
begin
  select c.* into item from public.cosmetics c where c.id = target_id;
  if item.id is null then
    raise exception 'ไม่พบไอเทมนี้';
  end if;

  select exists(
    select 1 from public.owned_cosmetics oc
     where oc.user_id = auth.uid() and oc.cosmetic_id = target_id
  ) into owns;
  if not owns then
    raise exception 'คุณยังไม่ได้ซื้อไอเทมนี้';
  end if;

  -- item.slot is constrained to a fixed set by cosmetics' own check
  -- constraint, and format(%I) quotes it as an identifier regardless --
  -- not string-built SQL from arbitrary client input.
  execute format('update public.profiles set equipped_%I = $1 where user_id = $2', item.slot)
    using target_id, auth.uid();
end;
$$;

create or replace function public.unequip_cosmetic(target_slot text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_slot not in ('hat', 'shirt', 'pants', 'shoes', 'bag') then
    raise exception 'ตำแหน่งไม่ถูกต้อง';
  end if;
  execute format('update public.profiles set equipped_%I = null where user_id = $1', target_slot)
    using auth.uid();
end;
$$;

grant execute on function public.equip_cosmetic(text) to authenticated;
grant execute on function public.unequip_cosmetic(text) to authenticated;

-- ------------------------------------------------------------
-- Done. Existing accounts start at 0 coins and an empty closet --
-- nothing to backfill. Re-running this file is safe (every create is
-- idempotent, and the cosmetics insert upserts on conflict).
-- ------------------------------------------------------------
