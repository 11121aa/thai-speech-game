-- ============================================================
-- 029: The แม่กน sound, from the therapist's workbook pages 112-115
-- Run in Supabase SQL Editor. Safe to run more than once.
--
-- Only the words the therapist highlighted. The workbook's แม่กน section
-- has no nonsense-syllable pages, so this sound starts at real words:
--   คำ 1 พยางค์ มีความหมาย   10
--   คำ 2 พยางค์               10
--   คำ 3 พยางค์               10
--   ประโยค                    10
--
-- Source: wordlists/กน.csv
-- ============================================================

BEGIN;

-- 1. The sound, for every therapist account. Words and sounds are private
--    per therapist (per_teacher_content_migration.sql), so each therapist
--    needs their own row or their kids won't see it.
INSERT INTO public.sounds (letter, created_by)
SELECT 'กน', sp.user_id
FROM (SELECT DISTINCT user_id FROM public.role WHERE role = 'specialist') sp
WHERE NOT EXISTS (
  SELECT 1 FROM public.sounds s
  WHERE s.created_by = sp.user_id AND s.letter = 'กน'
);

-- 2. The words, in workbook order, each attached to that therapist's own
--    sound row. Skips any word a therapist already has.
INSERT INTO public.words (letter_category, word, level, sound_id, created_by)
SELECT v.letter, v.word, v.level, s.id, sp.user_id
FROM (VALUES
  (1, 'กน', 'กิน', 'คำ 1 พยางค์ มีความหมาย'),
  (2, 'กน', 'นอน', 'คำ 1 พยางค์ มีความหมาย'),
  (3, 'กน', 'อ่าน', 'คำ 1 พยางค์ มีความหมาย'),
  (4, 'กน', 'ฟัน', 'คำ 1 พยางค์ มีความหมาย'),
  (5, 'กน', 'เทียน', 'คำ 1 พยางค์ มีความหมาย'),
  (6, 'กน', 'ศูนย์', 'คำ 1 พยางค์ มีความหมาย'),
  (7, 'กน', 'ดิน', 'คำ 1 พยางค์ มีความหมาย'),
  (8, 'กน', 'บ้าน', 'คำ 1 พยางค์ มีความหมาย'),
  (9, 'กน', 'ตื่น', 'คำ 1 พยางค์ มีความหมาย'),
  (10, 'กน', 'ยืน', 'คำ 1 พยางค์ มีความหมาย'),
  (11, 'กน', 'เครื่องบิน', 'คำ 2 พยางค์'),
  (12, 'กน', 'กินข้าว', 'คำ 2 พยางค์'),
  (13, 'กน', 'นอนหลับ', 'คำ 2 พยางค์'),
  (14, 'กน', 'ฝนตก', 'คำ 2 พยางค์'),
  (15, 'กน', 'โรงเรียน', 'คำ 2 พยางค์'),
  (16, 'กน', 'อ่านเขียน', 'คำ 2 พยางค์'),
  (17, 'กน', 'ช้อนส้อม', 'คำ 2 พยางค์'),
  (18, 'กน', 'ทำงาน', 'คำ 2 พยางค์'),
  (19, 'กน', 'วันจันทร์', 'คำ 2 พยางค์'),
  (20, 'กน', 'ก้อนหิน', 'คำ 2 พยางค์'),
  (21, 'กน', 'ไปโรงเรียน', 'คำ 3 พยางค์'),
  (22, 'กน', 'อ่านหนังสือ', 'คำ 3 พยางค์'),
  (23, 'กน', 'จักรยาน', 'คำ 3 พยางค์'),
  (24, 'กน', 'เล่นของเล่น', 'คำ 3 พยางค์'),
  (25, 'กน', 'ดอกไม้บาน', 'คำ 3 พยางค์'),
  (26, 'กน', 'รถชนกัน', 'คำ 3 พยางค์'),
  (27, 'กน', 'เรียนวันจันทร์', 'คำ 3 พยางค์'),
  (28, 'กน', 'ตัดผมสั้น', 'คำ 3 พยางค์'),
  (29, 'กน', 'อ่านการ์ตูน', 'คำ 3 พยางค์'),
  (30, 'กน', 'ช้อนกับจาน', 'คำ 3 พยางค์'),
  (31, 'กน', 'นักเรียนต้องไปโรงเรียนทุกวัน', 'ประโยค'),
  (32, 'กน', 'อ่านหนังสือตอนเย็นกับคุณแม่ทุกวัน', 'ประโยค'),
  (33, 'กน', 'ทานขนมจีนกับคุณพ่อตอนเย็น', 'ประโยค'),
  (34, 'กน', 'เล่นคอมพิวเตอร์ทุกวันกับคุณครู', 'ประโยค'),
  (35, 'กน', 'เรียนพิเศษกับคุณครูตอนเย็น', 'ประโยค'),
  (36, 'กน', 'ฝนตกตอนเย็นหลังโรงเรียนเลิก', 'ประโยค'),
  (37, 'กน', 'จานและช้อนเอาไว้กินข้าว', 'ประโยค'),
  (38, 'กน', 'ที่โรงเรียนพานักเรียนไปเที่ยวที่สวนสนุก', 'ประโยค'),
  (39, 'กน', 'คุณครูที่เด็กรักเป็นคนอ่อนหวาน', 'ประโยค'),
  (40, 'กน', 'เขานอนหลับฝันดีทุกวัน', 'ประโยค')
) AS v(ord, letter, word, level)
CROSS JOIN (SELECT DISTINCT user_id FROM public.role WHERE role = 'specialist') sp
JOIN public.sounds s ON s.created_by = sp.user_id AND s.letter = v.letter
WHERE NOT EXISTS (
  SELECT 1 FROM public.words w
  WHERE w.created_by = sp.user_id
    AND w.letter_category = v.letter
    AND w.word = v.word
    AND w.level = v.level
)
ORDER BY sp.user_id, v.ord;

COMMIT;

-- 3. Check: every therapist should show 40 words for กน.
SELECT p.username, w.level, count(*) AS words
FROM public.words w
LEFT JOIN public.profiles p ON p.user_id = w.created_by
WHERE w.letter_category = 'กน'
GROUP BY p.username, w.level
ORDER BY p.username, w.level;
