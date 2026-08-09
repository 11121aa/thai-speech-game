-- ============================================================
-- Combined multi-rep recording toggle
-- Run in Supabase SQL Editor
-- ============================================================
-- Lets a patient (or their parent) opt out of the "say all N reps in one
-- continuous recording" flow and fall back to today's press-record-once-
-- per-rep flow. Defaults to on for everyone, including existing rows.
-- ============================================================

alter table public.profiles add column if not exists record_reps_together boolean not null default true;
