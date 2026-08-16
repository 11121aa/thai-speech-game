-- ============================================================
-- 026 — Cooking game: two new purchasable dishes (burger, fries)
-- Run in Supabase SQL Editor after 025.
-- ============================================================
-- Burger and Fries were placeholder "locked" cards on the cooking
-- game's food-select screen with no mini-game behind them. They're now
-- fully playable, so they get shop entries alongside pizza/breakfast.
--
-- Fries is priced lower than the others: its four steps are the
-- simplest of the five dishes (peel, cut, fry, salt), so it doubles as
-- the cheapest way to get a second dish after the free hot dog.
-- ============================================================

insert into public.game_upgrades
  (id, game, category, name, description, price, effect_value, requires)
values
('cook_dish_burger', 'cooking', 'dish', 'ปลดล็อกเมนูเบอร์เกอร์', 'ปลดล็อกเมนูเบอร์เกอร์ในเกมทำอาหาร', 120, 0, null),
('cook_dish_fries',  'cooking', 'dish', 'ปลดล็อกเมนูเฟรนช์ฟรายส์', 'ปลดล็อกเมนูเฟรนช์ฟรายส์ในเกมทำอาหาร', 90,  0, null)

on conflict (id) do update set
  game = excluded.game, category = excluded.category, name = excluded.name,
  description = excluded.description, price = excluded.price,
  effect_value = excluded.effect_value, requires = excluded.requires;
