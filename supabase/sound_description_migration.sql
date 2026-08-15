-- Adds a teacher-editable pronunciation description column to sounds.
ALTER TABLE public.sounds ADD COLUMN IF NOT EXISTS pronunciation_tip text;
