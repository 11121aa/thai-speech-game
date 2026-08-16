-- ============================================================
-- ONE-OFF ADMIN SCRIPT — not a schema migration, just a data grant.
-- Run in Supabase SQL Editor (Project > SQL Editor > New query).
-- ============================================================
-- Sets every account's coin balance to 10,000,000 -- a temporary testing
-- boost so the new shop systems can be tried out freely. This is a flat
-- SET, not an addition: running it twice just re-sets everyone back to
-- the same number, it doesn't stack.
--
-- Safe to run as-is (coins has a NOT NULL DEFAULT 0 and a `coins >= 0`
-- check constraint, both already satisfied by 10000000). Not something
-- to leave lying around as a habit -- just run it once now.
-- ============================================================

update public.profiles set coins = 10000000;
