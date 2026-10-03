-- ============================================================
-- 030: The แม่กด sound, from the therapist's workbook pages 116-119
-- Run in Supabase SQL Editor. Safe to run more than once.
--
-- Only the words the therapist highlighted. Like แม่กน (029), this
-- section of the workbook has no nonsense-syllable pages, so the sound
-- starts at real words:
--   คำ 1 พยางค์ มีความหมาย   11
--   คำ 2 พยางค์               10
--   คำ 3 พยางค์               11
--   ประโยค                    11
--
-- Source: wordlists/กด.csv
-- ============================================================

BEGIN;

-- 1. The sound, for every therapist account. Words and sounds are private
--    per therapist (per_teacher_content_migration.sql), so each therapist
--    needs their own row or their kids won't see it.
INSERT INTO public.sounds (letter, created_by)
SELECT 'กด', sp.user_id
FROM (SELECT DISTINCT user_id FROM public.role WHERE role = 'specialist') sp
WHERE NOT EXISTS (
  SELECT 1 FROM public.sounds s
  WHERE s.created_by = sp.user_id AND s.letter = 'กด'
);

-- 2. The words, in workbook order, each attached to that therapist's own
--    sound row. Skips any word a therapist already has.
INSERT INTO public.words (letter_category, word, level, sound_id, created_by)
SELECT v.letter, v.word, v.level, s.id, sp.user_id
FROM (VALUES
  (1, 'กด', 'วัด', 'คำ 1 พยางค์ มีความหมาย'),
  (2, 'กด', 'พัด', 'คำ 1 พยางค์ มีความหมาย'),
  (3, 'กด', 'ขัด', 'คำ 1 พยางค์ มีความหมาย'),
  (4, 'กด', 'มด', 'คำ 1 พยางค์ มีความหมาย'),
  (5, 'กด', 'โดด', 'คำ 1 พยางค์ มีความหมาย'),
  (6, 'กด', 'วาด', 'คำ 1 พยางค์ มีความหมาย'),
  (7, 'กด', 'เจ็ด', 'คำ 1 พยางค์ มีความหมาย'),
  (8, 'กด', 'แปด', 'คำ 1 พยางค์ มีความหมาย'),
  (9, 'กด', 'ปิด', 'คำ 1 พยางค์ มีความหมาย'),
  (10, 'กด', 'กอด', 'คำ 1 พยางค์ มีความหมาย'),
  (11, 'กด', 'เลือด', 'คำ 1 พยางค์ มีความหมาย'),
  (12, 'กด', 'รถยนต์', 'คำ 2 พยางค์'),
  (13, 'กด', 'หลอดดูด', 'คำ 2 พยางค์'),
  (14, 'กด', 'วาดรูป', 'คำ 2 พยางค์'),
  (15, 'กด', 'เปิดปิด', 'คำ 2 พยางค์'),
  (16, 'กด', 'เงินสด', 'คำ 2 พยางค์'),
  (17, 'กด', 'พูดชัด', 'คำ 2 พยางค์'),
  (18, 'กด', 'กระโดด', 'คำ 2 พยางค์'),
  (19, 'กด', 'มดกัด', 'คำ 2 พยางค์'),
  (20, 'กด', 'ตัดผม', 'คำ 2 พยางค์'),
  (21, 'กด', 'ไปวัด', 'คำ 2 พยางค์'),
  (22, 'กด', 'ผักกาดขาว', 'คำ 3 พยางค์'),
  (23, 'กด', 'กบกระโดด', 'คำ 3 พยางค์'),
  (24, 'กด', 'กระเป๋าขาด', 'คำ 3 พยางค์'),
  (25, 'กด', 'ขัดห้องน้ำ', 'คำ 3 พยางค์'),
  (26, 'กด', 'กินผัดเห็ด', 'คำ 3 พยางค์'),
  (27, 'กด', 'หลอดดูดน้ำ', 'คำ 3 พยางค์'),
  (28, 'กด', 'ตัดกระดาษ', 'คำ 3 พยางค์'),
  (29, 'กด', 'ประเทศไทย', 'คำ 3 พยางค์'),
  (30, 'กด', 'เจ็ดสิบแปด', 'คำ 3 พยางค์'),
  (31, 'กด', 'มดแดงกัด', 'คำ 3 พยางค์'),
  (32, 'กด', 'ขีดเส้นใต้', 'คำ 3 พยางค์'),
  (33, 'กด', 'แม่กินแกงเผ็ดหมดแล้ว', 'ประโยค'),
  (34, 'กด', 'ปลากระโดดน้ำไปมา', 'ประโยค'),
  (35, 'กด', 'เขารับเด็กมาเป็นบุตรบุญธรรม', 'ประโยค'),
  (36, 'กด', 'ฉันพูดชัดเจนมากขึ้น', 'ประโยค'),
  (37, 'กด', 'เม่นเป็นสัตว์ที่แปลกชนิดหนึ่ง', 'ประโยค'),
  (38, 'กด', 'เด็กจดการบ้านเสร็จแล้ว', 'ประโยค'),
  (39, 'กด', 'โกรธกันเป็นสิ่งไม่ดี', 'ประโยค'),
  (40, 'กด', 'แม่ไปซื้อกับข้าวที่ตลาดสด', 'ประโยค'),
  (41, 'กด', 'ฉันทำกระเป๋าเสื้อขาด', 'ประโยค'),
  (42, 'กด', 'ครูตรวจห้องที่จัดไว้', 'ประโยค'),
  (43, 'กด', 'เด็กคิดเลขคณิตเร็ว', 'ประโยค')
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

-- 3. Check: every therapist should show 43 words for กด.
SELECT p.username, w.level, count(*) AS words
FROM public.words w
LEFT JOIN public.profiles p ON p.user_id = w.created_by
WHERE w.letter_category = 'กด'
GROUP BY p.username, w.level
ORDER BY p.username, w.level;
