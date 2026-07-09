-- ============================================================
-- Word List 2.0 Migration
-- New levels: Sound → 1 syllable → 2 syllable → 3 syllable → Sentences
-- Run in Supabase SQL Editor
-- WARNING: Clears all existing words and practice records
-- ============================================================

-- 1. Clear dependent data
DELETE FROM public.practice;
DELETE FROM public.words;

-- 2. Drop old sounds table (also drops any FK constraints referencing it)
DROP TABLE IF EXISTS public.sounds CASCADE;

-- 3. Remove old columns from words
ALTER TABLE public.words DROP COLUMN IF EXISTS exercise_code;
ALTER TABLE public.words DROP COLUMN IF EXISTS reading;
ALTER TABLE public.words DROP COLUMN IF EXISTS age_level;
ALTER TABLE public.words DROP COLUMN IF EXISTS sound_id;

-- 4. Create new sounds table
CREATE TABLE public.sounds (
  id         bigserial PRIMARY KEY,
  letter     text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read sounds"
  ON public.sounds FOR SELECT USING (true);

-- 5. Add new columns to words
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS level    text;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS sound_id bigint REFERENCES public.sounds(id);

-- 6. Insert sounds (add more rows here as new sounds are added)
INSERT INTO public.sounds (letter) VALUES ('ป');

-- 7. Insert all words from Word List 2.0
INSERT INTO public.words (letter_category, word, level, emoji, sound_id)
SELECT v.lc, v.w, v.lv, v.w, s.id
FROM (VALUES
  ('ป','ปี','Sound'),
  ('ป','เปีย','Sound'),
  ('ป','ไป','Sound'),
  ('ป','ปอ','Sound'),
  ('ป','ปู','Sound'),
  ('ป','เปา','Sound'),
  ('ป','ปัว','Sound'),
  ('ป','แป','Sound'),
  ('ป','ปลา','1 syllable'),
  ('ป','เป่า','1 syllable'),
  ('ป','ป่า','1 syllable'),
  ('ป','ปก','1 syllable'),
  ('ป','ปีน','1 syllable'),
  ('ป','ปรุง','1 syllable'),
  ('ป','ป่วย','1 syllable'),
  ('ป','เปลี่ยน','1 syllable'),
  ('ป','แปลง','1 syllable'),
  ('ป','เป็น','1 syllable'),
  ('ป','ปลอม','1 syllable'),
  ('ป','ปอดบวม','2 syllable'),
  ('ป','ประโยชน์','2 syllable'),
  ('ป','คนป๋วย','2 syllable'),
  ('ป','กระป๋อง','2 syllable'),
  ('ป','ปากเป็ด','2 syllable'),
  ('ป','เปิดบ้าน','2 syllable'),
  ('ป','ไปเที่ยว','2 syllable'),
  ('ป','ผูกป้าย','2 syllable'),
  ('ป','ปั้นดิน','2 syllable'),
  ('ป','เปียกฝน','2 syllable'),
  ('ป','ปลากระป๋อง','3 syllable'),
  ('ป','แปดสิบแปด','3 syllable'),
  ('ป','เป็ดพะโล้','3 syllable'),
  ('ป','ปลูกต้นไม้','3 syllable'),
  ('ป','ปะการัง','3 syllable'),
  ('ป','ถือกระเป๋า','3 syllable'),
  ('ป','ผู้ากันเปื้อน','3 syllable'),
  ('ป','ปู่เป่าปี่','3 syllable'),
  ('ป','ปีนต้นไม้','3 syllable'),
  ('ป','ใส่กระโปรง','3 syllable'),
  ('ป','ปลาปักเป้ากินปู','Sentences'),
  ('ป','ปังปอนปีนต้นประดู่','Sentences'),
  ('ป','ป้ากับปู่ไปเป็นผู้ปกครอง','Sentences'),
  ('ป','เปียปลูกต้นตีนเป็ด','Sentences'),
  ('ป','เปาอยู่กับปู่ริมป่าโปร่ง','Sentences')
) AS v(lc, w, lv)
JOIN public.sounds s ON s.letter = v.lc;
