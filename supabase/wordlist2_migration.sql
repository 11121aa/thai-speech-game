-- ============================================================
-- Word List 2.0 Migration
-- Levels: เสียง → 1 พยางค์ไม่มีตัวสะกด → 1 พยางค์ → 2 พยางค์ → 3 พยางค์ → ประโยค
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
  ('ป','ปี','เสียง'),
  ('ป','เปีย','เสียง'),
  ('ป','ไป','เสียง'),
  ('ป','ปอ','เสียง'),
  ('ป','ปู','เสียง'),
  ('ป','เปา','เสียง'),
  ('ป','ปัว','เสียง'),
  ('ป','แป','เสียง'),
  ('ป','ปลา','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','เป่า','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ป่า','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ไป','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ปี่','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ปู่','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ป้า','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','เป้า','1 พยางค์ไม่มีตัวสะกด'),
  ('ป','ปก','1 พยางค์'),
  ('ป','ปีน','1 พยางค์'),
  ('ป','ปรุง','1 พยางค์'),
  ('ป','ป่วย','1 พยางค์'),
  ('ป','เปลี่ยน','1 พยางค์'),
  ('ป','แปลง','1 พยางค์'),
  ('ป','เป็น','1 พยางค์'),
  ('ป','ปลอม','1 พยางค์'),
  ('ป','ปอดบวม','2 พยางค์'),
  ('ป','ประโยชน์','2 พยางค์'),
  ('ป','คนป๋วย','2 พยางค์'),
  ('ป','กระป๋อง','2 พยางค์'),
  ('ป','ปากเป็ด','2 พยางค์'),
  ('ป','เปิดบ้าน','2 พยางค์'),
  ('ป','ไปเที่ยว','2 พยางค์'),
  ('ป','ผูกป้าย','2 พยางค์'),
  ('ป','ปั้นดิน','2 พยางค์'),
  ('ป','เปียกฝน','2 พยางค์'),
  ('ป','ปลากระป๋อง','3 พยางค์'),
  ('ป','แปดสิบแปด','3 พยางค์'),
  ('ป','เป็ดพะโล้','3 พยางค์'),
  ('ป','ปลูกต้นไม้','3 พยางค์'),
  ('ป','ปะการัง','3 พยางค์'),
  ('ป','ถือกระเป๋า','3 พยางค์'),
  ('ป','ผู้ากันเปื้อน','3 พยางค์'),
  ('ป','ปู่เป่าปี่','3 พยางค์'),
  ('ป','ปีนต้นไม้','3 พยางค์'),
  ('ป','ใส่กระโปรง','3 พยางค์'),
  ('ป','ปลาปักเป้ากินปู','ประโยค'),
  ('ป','ปังปอนปีนต้นประดู่','ประโยค'),
  ('ป','ป้ากับปู่ไปเป็นผู้ปกครอง','ประโยค'),
  ('ป','เปียปลูกต้นตีนเป็ด','ประโยค'),
  ('ป','เปาอยู่กับปู่ริมป่าโปร่ง','ประโยค')
) AS v(lc, w, lv)
JOIN public.sounds s ON s.letter = v.lc;
