-- ============================================================
-- 027 — Specialist review becomes correct / not correct
-- Run in Supabase SQL Editor after 026.
-- ============================================================
-- Specialists used to grade each recording with a 0-100 number. In
-- practice a speech attempt is either acceptable or it isn't, so the
-- review UI is now a two-way check and this column backs it.
--
-- Kept as a NEW column rather than reusing `score`:
--   * `score` is numeric and nullable, so squeezing a boolean into it
--     (0/100) would make old real scores indistinguishable from new
--     checks, and silently corrupt any historical average.
--   * The old numbers stay readable for anyone who wants the history.
--
-- Three states, matching parent_marked_correct's existing convention:
--   true  = correct, false = not correct, null = not reviewed yet.
-- ============================================================

alter table public.practice
  add column if not exists specialist_marked_correct boolean;

-- Backfill so already-graded recordings don't all revert to "unreviewed".
-- 80 is the same pass mark the review screen already used for its
-- average-score badge (PASS_THRESHOLD_PCT in management.html), so this
-- preserves the pass/fail meaning those numbers already carried rather
-- than inventing a new cutoff. Only fills rows never explicitly checked.
update public.practice
   set specialist_marked_correct = (score >= 80)
 where score is not null
   and specialist_marked_correct is null;

-- ------------------------------------------------------------
-- Keep it specialist-only.
-- practice_update_own lets a patient/parent update their OWN row so they
-- can set parent_marked_correct; this trigger clamps every field they
-- must not touch back to its previous value. specialist_marked_correct
-- has to be added to that list, otherwise a parent could mark their own
-- homework as correct.
-- ------------------------------------------------------------
create or replace function public.enforce_practice_update_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_specialist(auth.uid()) then
    new.score := old.score;
    new.specialist_marked_correct := old.specialist_marked_correct;
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
