-- ============================================================
-- URGENT FIX: sounds.letter's table-wide UNIQUE constraint blocks
-- specialist registration entirely
-- Run in Supabase SQL Editor IMMEDIATELY.
--
-- per_teacher_content_migration.sql made `sounds` private per specialist,
-- but the original `letter text NOT NULL UNIQUE` constraint (from
-- wordlist2_migration.sql, back when sounds were shared globally) still
-- only allows ONE row with letter = 'ป' in the entire table, regardless
-- of which specialist owns it.
--
-- The new-specialist auto-copy trigger tries to give every new specialist
-- their own "ป" row, immediately violates this constraint, and the whole
-- transaction (including the role='specialist' insert that triggered it)
-- gets rolled back — which is why registering as a therapist silently
-- left the account looking like a regular patient/student instead.
--
-- Fix: make the constraint per-specialist (created_by, letter) instead of
-- global — each specialist can still only have one "ป", but different
-- specialists can each have their own.
-- ============================================================

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.sounds'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) = 'letter';
  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.sounds DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE public.sounds DROP CONSTRAINT IF EXISTS sounds_created_by_letter_key;
ALTER TABLE public.sounds ADD CONSTRAINT sounds_created_by_letter_key UNIQUE (created_by, letter);
