-- ============================================================
-- Preset avatar picker migration
-- Run in Supabase SQL Editor
-- ============================================================
-- Adds two columns so a profile can use a colorful preset emoji avatar
-- instead of (or before) uploading a real photo. Mutually exclusive with
-- avatar_url — the client clears whichever one it isn't setting.
-- ============================================================

alter table public.profiles add column if not exists avatar_emoji text;
alter table public.profiles add column if not exists avatar_color text;
alter table public.profiles add column if not exists avatar_color2 text;
