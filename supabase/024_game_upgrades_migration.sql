-- ============================================================
-- Game upgrades migration
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================
-- A third shop catalog (alongside coin_shop_migration.sql's cosmetics and
-- rpg_shop_migration.sql's weapon/armor/skill) -- permanent, account-wide
-- gameplay upgrades for 7 of the site's other games (matching, tetris,
-- airplane, shooting, tower defense, platformer, cooking), all spending
-- from the SAME coin balance (profiles.coins). Doesn't touch the other
-- two shop systems in any way.
--
-- Unlike the RPG shop, there's no "equip" step here -- every owned
-- upgrade for a game is simply always active whenever that game is
-- played (no slot exclusivity), so the buy RPC is the only mutation.
--
-- Mirrors the established security pattern exactly:
--   - game_upgrades is a public read-only catalog (price/effect looked
--     up server-side, never trusted from the client)
--   - owned_game_upgrades has no client insert/update/delete policy --
--     the only way a row appears is through buy_game_upgrade()
--   - Some upgrades are tiered (e.g. matching's 4-step +5% multiplier,
--     airplane's bomb-radius tiers) via a self-referencing `requires`
--     column -- buy_game_upgrade() won't sell tier N unless tier N-1 is
--     already owned, so a client can't skip straight to the strongest
--     tier or fake owning a cheaper prerequisite.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Catalog. `effect_value`'s meaning depends on `category`:
--      multiplier -> additional score multiplier for that game (e.g.
--                    0.05 = +5%; a game's total bonus is the SUM of all
--                    owned multiplier rows for it)
--      speed      -> shooting: additional fractional bullet-speed bonus
--      cooldown   -> shooting: ms shaved off the fire cooldown
--      ability    -> shooting time-stop: ms enemies are frozen for
--      item       -> airplane shield/bomb/magnet, platformer pickups:
--                    ms duration or px radius depending on the specific
--                    upgrade (see the description column)
--      troop      -> tower defense barrack: unused (0), owning it just
--                    unlocks the palette card
--      dish       -> cooking: unused (0), owning it just unlocks the
--                    dish-select card
--    `requires` chains tiered upgrades so they must be bought in order.
-- ------------------------------------------------------------

create table if not exists public.game_upgrades (
  id text primary key,
  game text not null check (game in ('matching', 'tetris', 'airplane', 'shooting', 'towerdefense', 'platformer', 'cooking')),
  category text not null check (category in ('multiplier', 'speed', 'cooldown', 'ability', 'item', 'troop', 'dish')),
  name text not null,
  description text not null default '',
  price integer not null,
  effect_value numeric not null default 0,
  requires text references public.game_upgrades (id)
);

insert into public.game_upgrades (id, game, category, name, description, price, effect_value, requires) values
-- Matching: 5% score multiplier per purchase, stacks up to 4 times (max +20%)
('match_mult_1', 'matching', 'multiplier', 'ตัวคูณคะแนน +5%',  'เพิ่มคะแนนที่ได้รับ 5%',            60,  0.05, null),
('match_mult_2', 'matching', 'multiplier', 'ตัวคูณคะแนน +5% (รวม 10%)', 'เพิ่มคะแนนที่ได้รับอีก 5% (รวม 10%)', 90,  0.05, 'match_mult_1'),
('match_mult_3', 'matching', 'multiplier', 'ตัวคูณคะแนน +5% (รวม 15%)', 'เพิ่มคะแนนที่ได้รับอีก 5% (รวม 15%)', 130, 0.05, 'match_mult_2'),
('match_mult_4', 'matching', 'multiplier', 'ตัวคูณคะแนน +5% (รวม 20%)', 'เพิ่มคะแนนที่ได้รับอีก 5% (รวม 20%)', 180, 0.05, 'match_mult_3'),

-- Tetris: 10% score multiplier per purchase, up to 3 times (max +30%)
('tetris_mult_1', 'tetris', 'multiplier', 'ตัวคูณคะแนน +10%', 'เพิ่มคะแนนที่ได้รับ 10%',              70,  0.10, null),
('tetris_mult_2', 'tetris', 'multiplier', 'ตัวคูณคะแนน +10% (รวม 20%)', 'เพิ่มคะแนนที่ได้รับอีก 10% (รวม 20%)', 110, 0.10, 'tetris_mult_1'),
('tetris_mult_3', 'tetris', 'multiplier', 'ตัวคูณคะแนน +10% (รวม 30%)', 'เพิ่มคะแนนที่ได้รับอีก 10% (รวม 30%)', 160, 0.10, 'tetris_mult_2'),

-- Airplane: score multiplier (up to +30%), shield-duration tiers for the
-- tropical-island pickup, and two brand-new pickups (bomb, magnet) that
-- don't spawn at all until their first tier is owned.
('air_mult_1', 'airplane', 'multiplier', 'ตัวคูณคะแนน +10%', 'เพิ่มคะแนนที่ได้รับ 10%',              70,  0.10, null),
('air_mult_2', 'airplane', 'multiplier', 'ตัวคูณคะแนน +10% (รวม 20%)', 'เพิ่มคะแนนที่ได้รับอีก 10% (รวม 20%)', 110, 0.10, 'air_mult_1'),
('air_mult_3', 'airplane', 'multiplier', 'ตัวคูณคะแนน +10% (รวม 30%)', 'เพิ่มคะแนนที่ได้รับอีก 10% (รวม 30%)', 160, 0.10, 'air_mult_2'),
('air_shield_1', 'airplane', 'item', 'โล่จากเกาะอยู่นานขึ้น', 'โล่ป้องกันที่ได้จากเกาะเขตร้อนอยู่นานขึ้น +2 วินาที', 80,  2000, null),
('air_shield_2', 'airplane', 'item', 'โล่อยู่นานขึ้นอีก',    'โล่ป้องกันอยู่นานขึ้นอีก +2 วินาที (รวม +4 วินาที)',  130, 2000, 'air_shield_1'),
('air_bomb_1', 'airplane', 'item', 'ปลดล็อกไอเทมระเบิด', 'เก็บระเบิดเพื่อทำลายสิ่งกีดขวางรอบตัว',        100, 140,  null),
('air_bomb_2', 'airplane', 'item', 'รัศมีระเบิดใหญ่ขึ้น', 'รัศมีทำลายของระเบิดใหญ่ขึ้น',                160, 80,   'air_bomb_1'),
('air_magnet_1', 'airplane', 'item', 'ปลดล็อกไอเทมแม่เหล็ก', 'เก็บแม่เหล็กเพื่อดูดเหรียญเข้าหาตัว',         90,  4000, null),
('air_magnet_2', 'airplane', 'item', 'แม่เหล็กอยู่นานขึ้น',  'ระยะเวลาแม่เหล็กอยู่นานขึ้น +3 วินาที',       140, 3000, 'air_magnet_1'),

-- Shooting: bullet-speed tiers, fire-cooldown tiers, and one expensive
-- time-stop ability.
('shoot_speed_1', 'shooting', 'speed', 'กระสุนเร็วขึ้น', 'ความเร็วกระสุนเพิ่มขึ้น',                80,  0.15, null),
('shoot_speed_2', 'shooting', 'speed', 'กระสุนเร็วขึ้นอีก', 'ความเร็วกระสุนเพิ่มขึ้นอีก',            140, 0.15, 'shoot_speed_1'),
('shoot_cooldown_1', 'shooting', 'cooldown', 'ลดเวลาโหลดกระสุน', 'ยิงถี่ขึ้น ลดเวลาโหลด 200ms',      90,  200,  null),
('shoot_cooldown_2', 'shooting', 'cooldown', 'ลดเวลาโหลดกระสุนอีก', 'ยิงถี่ขึ้นอีก ลดเวลาโหลดอีก 200ms', 150, 200,  'shoot_cooldown_1'),
('shoot_timestop', 'shooting', 'ability', 'สกิลหยุดเวลา', 'สกิลราคาแพง: หยุดเวลาศัตรู 3 วินาที',       300, 3000, null),

-- Tower defense: unlocks a 3rd placeable troop, the barrack -- spawns a
-- friendly unit that walks the road toward incoming enemies and melees
-- whatever it touches, instead of sitting still and shooting.
('td_barrack', 'towerdefense', 'troop', 'ปลดล็อกค่ายทหาร', 'วางค่ายทหารเพื่อส่งทหารเดินไปปะทะศัตรูบนเส้นทาง', 150, 0, null),

-- Platformer: unlocks 3 brand-new mid-run pickups (none exist today
-- beyond the word-practice bubble).
('plat_jumpboost',   'platformer', 'item', 'ปลดล็อกไอเทมพลังกระโดด', 'เก็บไอเทมเพื่อกระโดดได้สูงขึ้นชั่วคราว', 90,  0, null),
('plat_bomb',        'platformer', 'item', 'ปลดล็อกไอเทมระเบิด',     'เก็บไอเทมเพื่อทำลายสิ่งกีดขวางรอบตัว',    110, 0, null),
('plat_doublepoint', 'platformer', 'item', 'ปลดล็อกไอเทมคะแนนคูณสอง', 'เก็บไอเทมเพื่อรับคะแนนคูณสองชั่วคราว',    90,  0, null),

-- Cooking: hot dog is free by default; pizza/breakfast are purchasable
-- dish unlocks.
('cook_dish_pizza',     'cooking', 'dish', 'ปลดล็อกเมนูพิซซ่า',     'ปลดล็อกเมนูพิซซ่าในเกมทำอาหาร',     120, 0, null),
('cook_dish_breakfast', 'cooking', 'dish', 'ปลดล็อกเมนูอาหารเช้า', 'ปลดล็อกเมนูอาหารเช้าในเกมทำอาหาร', 120, 0, null)

on conflict (id) do update set
  game = excluded.game, category = excluded.category, name = excluded.name,
  description = excluded.description, price = excluded.price,
  effect_value = excluded.effect_value, requires = excluded.requires;

alter table public.game_upgrades enable row level security;

drop policy if exists "game_upgrades_select_all" on public.game_upgrades;
create policy "game_upgrades_select_all" on public.game_upgrades for select using (true);

-- ------------------------------------------------------------
-- 2. Ownership -- same "no client write policy, only the RPC below can
--    insert" shape as owned_cosmetics/owned_rpg_items.
-- ------------------------------------------------------------

create table if not exists public.owned_game_upgrades (
  user_id uuid not null references auth.users (id) on delete cascade,
  upgrade_id text not null references public.game_upgrades (id),
  obtained_at timestamptz not null default now(),
  primary key (user_id, upgrade_id)
);

alter table public.owned_game_upgrades enable row level security;

drop policy if exists "owned_game_upgrades_select_own" on public.owned_game_upgrades;
create policy "owned_game_upgrades_select_own" on public.owned_game_upgrades
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. Buy an upgrade outright -- same pattern as buy_cosmetic()/
--    buy_rpg_item(), plus a `requires` prerequisite check for tiered
--    upgrades.
-- ------------------------------------------------------------

create or replace function public.buy_game_upgrade(target_id text)
returns table (
  upgrade_id text, game text, category text, name text,
  effect_value numeric, coins_left integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  cur_coins integer;
  already_owned boolean;
  has_prereq boolean;
  new_balance integer;
begin
  select gu.* into item from public.game_upgrades gu where gu.id = target_id;
  if item.id is null then
    raise exception 'ไม่พบไอเทมนี้';
  end if;

  select exists(
    select 1 from public.owned_game_upgrades o
     where o.user_id = auth.uid() and o.upgrade_id = target_id
  ) into already_owned;
  if already_owned then
    raise exception 'คุณมีไอเทมนี้อยู่แล้ว';
  end if;

  if item.requires is not null then
    select exists(
      select 1 from public.owned_game_upgrades o
       where o.user_id = auth.uid() and o.upgrade_id = item.requires
    ) into has_prereq;
    if not has_prereq then
      raise exception 'ต้องซื้อระดับก่อนหน้าก่อน';
    end if;
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

  begin
    insert into public.owned_game_upgrades (user_id, upgrade_id) values (auth.uid(), target_id);
  exception when unique_violation then
    raise exception 'คุณมีไอเทมนี้อยู่แล้ว';
  end;

  return query select
    item.id, item.game, item.category, item.name, item.effect_value, new_balance;
end;
$$;

grant execute on function public.buy_game_upgrade(text) to authenticated;

-- ------------------------------------------------------------
-- Done. Existing accounts start with nothing owned in this catalog --
-- every game falls back to its baseline (no multiplier, base bullet
-- speed/cooldown, no time-stop, base-duration island shield with no
-- bomb/magnet, no barrack, no platformer pickups, hot-dog-only cooking)
-- when no upgrades are owned, so every game is still fully playable
-- before any purchase. Re-running this file is safe.
-- ------------------------------------------------------------
