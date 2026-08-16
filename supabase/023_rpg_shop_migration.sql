-- ============================================================
-- RPG shop migration
-- Run in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================
-- Adds a second shop catalog -- weapons/armor/skills for the new
-- procedural-dungeon RPG game (js/game-rpg.js) -- alongside the
-- existing dress-up cosmetics shop (coin_shop_migration.sql), spending
-- from the SAME coin balance (profiles.coins). This does not remove or
-- touch the cosmetics system in any way; shop.html gets a second
-- section for this catalog rather than replacing the first.
--
-- Mirrors coin_shop_migration.sql's security model exactly:
--   - rpg_items is a public read-only catalog (price/stats looked up
--     server-side, never trusted from the client)
--   - owned_rpg_items has no client insert/update/delete policy --
--     the only way a row appears is through buy_rpg_item()
--   - profiles.equipped_weapon/equipped_armor/equipped_skill have their
--     UPDATE privilege revoked from clients -- only
--     equip_rpg_item()/unequip_rpg_item() (SECURITY DEFINER) can change
--     them, so a client can't equip something it doesn't own or fake a
--     stronger loadout with a raw PATCH
-- ============================================================

-- ------------------------------------------------------------
-- 1. Item catalog. `power` means different things per category:
--      weapon -> bonus melee damage
--      armor  -> flat damage reduction on every hit taken
--      skill  -> damage (or heal amount, see `effect`) when used
--    `cooldown_ms` / `effect` only matter for skills.
-- ------------------------------------------------------------

create table if not exists public.rpg_items (
  id text primary key,
  category text not null check (category in ('weapon', 'armor', 'skill')),
  name text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  price integer not null,
  power integer not null default 0,
  cooldown_ms integer,
  effect text check (effect in ('damage', 'heal', 'slow'))
);

insert into public.rpg_items (id, category, name, rarity, price, power, cooldown_ms, effect) values
('wpn-wood-sword',   'weapon', 'ดาบไม้',        'common',    20,  5,  null, null),
('wpn-iron-sword',   'weapon', 'ดาบเหล็ก',      'common',    45,  9,  null, null),
('wpn-silver-blade', 'weapon', 'ดาบเงิน',       'rare',      90,  15, null, null),
('wpn-flame-sword',  'weapon', 'ดาบเพลิง',      'epic',      180, 24, null, null),
('arm-cloth-robe',   'armor',  'เสื้อคลุมผ้า',   'common',    20,  2,  null, null),
('arm-leather',      'armor',  'เกราะหนัง',      'common',    45,  4,  null, null),
('arm-chainmail',    'armor',  'เกราะลูกโซ่',    'rare',      90,  7,  null, null),
('arm-plate',        'armor',  'เกราะเหล็กแผ่น', 'epic',      180, 12, null, null),
('skl-fireball',     'skill',  'ลูกไฟ',         'common',    30,  18, 4000, 'damage'),
('skl-ice-shard',    'skill',  'เศษน้ำแข็ง',     'rare',      90,  22, 5000, 'slow'),
('skl-heal',         'skill',  'รักษา',         'epic',      160, 35, 9000, 'heal')
on conflict (id) do update set
  category = excluded.category, name = excluded.name, rarity = excluded.rarity,
  price = excluded.price, power = excluded.power, cooldown_ms = excluded.cooldown_ms, effect = excluded.effect;

alter table public.rpg_items enable row level security;

drop policy if exists "rpg_items_select_all" on public.rpg_items;
create policy "rpg_items_select_all" on public.rpg_items for select using (true);

-- ------------------------------------------------------------
-- 2. Ownership -- same "no client write policy, only the RPC below can
--    insert" shape as owned_cosmetics.
-- ------------------------------------------------------------

create table if not exists public.owned_rpg_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.rpg_items (id),
  obtained_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.owned_rpg_items enable row level security;

drop policy if exists "owned_rpg_items_select_own" on public.owned_rpg_items;
create policy "owned_rpg_items_select_own" on public.owned_rpg_items
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. Buy a specific item outright -- same pattern as buy_cosmetic().
-- ------------------------------------------------------------

create or replace function public.buy_rpg_item(target_id text)
returns table (
  item_id text, name text, category text, rarity text,
  power integer, cooldown_ms integer, effect text, coins_left integer
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
  select ri.* into item from public.rpg_items ri where ri.id = target_id;
  if item.id is null then
    raise exception 'ไม่พบไอเทมนี้';
  end if;

  select exists(
    select 1 from public.owned_rpg_items o
     where o.user_id = auth.uid() and o.item_id = target_id
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

  begin
    insert into public.owned_rpg_items (user_id, item_id) values (auth.uid(), target_id);
  exception when unique_violation then
    raise exception 'คุณมีไอเทมนี้อยู่แล้ว';
  end;

  return query select
    item.id, item.name, item.category, item.rarity, item.power, item.cooldown_ms, item.effect, new_balance;
end;
$$;

grant execute on function public.buy_rpg_item(text) to authenticated;

-- ------------------------------------------------------------
-- 4. Equipped loadout -- one column per category on profiles (a player
--    can only wear one weapon/one armor/one skill at a time), same
--    "client UPDATE revoked, only the RPCs below can change it" shape
--    as the cosmetics equipped_* columns.
-- ------------------------------------------------------------

alter table public.profiles add column if not exists equipped_weapon text references public.rpg_items (id);
alter table public.profiles add column if not exists equipped_armor  text references public.rpg_items (id);
alter table public.profiles add column if not exists equipped_skill  text references public.rpg_items (id);

revoke update (equipped_weapon, equipped_armor, equipped_skill)
  on public.profiles from authenticated, anon;

create or replace function public.equip_rpg_item(target_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  owns boolean;
  col text;
begin
  select ri.* into item from public.rpg_items ri where ri.id = target_id;
  if item.id is null then
    raise exception 'ไม่พบไอเทมนี้';
  end if;

  select exists(
    select 1 from public.owned_rpg_items o
     where o.user_id = auth.uid() and o.item_id = target_id
  ) into owns;
  if not owns then
    raise exception 'คุณยังไม่ได้ซื้อไอเทมนี้';
  end if;

  col := case item.category
    when 'weapon' then 'equipped_weapon'
    when 'armor'  then 'equipped_armor'
    when 'skill'  then 'equipped_skill'
  end;

  -- item.category is constrained to a fixed set by rpg_items' own check
  -- constraint, and the case above only ever produces one of 3 known
  -- literal column names -- format(%I) additionally quotes it as an
  -- identifier regardless, not string-built SQL from arbitrary input.
  execute format('update public.profiles set %I = $1 where user_id = $2', col)
    using target_id, auth.uid();
end;
$$;

create or replace function public.unequip_rpg_item(target_category text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  col text;
begin
  if target_category not in ('weapon', 'armor', 'skill') then
    raise exception 'ประเภทไม่ถูกต้อง';
  end if;
  col := case target_category
    when 'weapon' then 'equipped_weapon'
    when 'armor'  then 'equipped_armor'
    when 'skill'  then 'equipped_skill'
  end;
  execute format('update public.profiles set %I = null where user_id = $1', col)
    using auth.uid();
end;
$$;

grant execute on function public.equip_rpg_item(text) to authenticated;
grant execute on function public.unequip_rpg_item(text) to authenticated;

-- ------------------------------------------------------------
-- Done. Existing accounts start with nothing owned/equipped in this
-- catalog -- js/game-rpg.js falls back to baseline unarmed/unarmored
-- stats and no skill when equipped_weapon/armor/skill are all null, so
-- the game is still fully playable before any purchase. Re-running this
-- file is safe (every create is idempotent, and the item insert upserts
-- on conflict).
-- ------------------------------------------------------------
