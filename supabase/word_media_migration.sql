-- ============================================================
-- Word media migration: pictures + pronunciation clips per word,
-- mouth-animation clips per sound
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.words  ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.words  ADD COLUMN IF NOT EXISTS sound_url text;
ALTER TABLE public.sounds ADD COLUMN IF NOT EXISTS mouth_animation_url text;

-- ------------------------------------------------------------
-- Storage buckets
--   word-images: word pictures (2MB cap)
--   word-media : pronunciation clips + mouth-animation clips (5MB cap)
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('word-images', 'word-images', true, 2097152)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 2097152;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('word-media', 'word-media', true, 5242880)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 5242880;

-- Same shape as the `words` table's own policies: public read,
-- specialist-only write (see schema.sql's words_select_all /
-- words_insert_specialist etc.) — these aren't per-user files, so no
-- per-folder ownership check is needed like the avatars/practice-audio
-- buckets have.

DROP POLICY IF EXISTS "word_images_select_all" ON storage.objects;
CREATE POLICY "word_images_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'word-images');

DROP POLICY IF EXISTS "word_images_write_specialist" ON storage.objects;
CREATE POLICY "word_images_write_specialist" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'word-images' AND public.is_specialist(auth.uid()));

DROP POLICY IF EXISTS "word_images_update_specialist" ON storage.objects;
CREATE POLICY "word_images_update_specialist" ON storage.objects
  FOR UPDATE USING (bucket_id = 'word-images' AND public.is_specialist(auth.uid()))
  WITH CHECK (bucket_id = 'word-images' AND public.is_specialist(auth.uid()));

DROP POLICY IF EXISTS "word_images_delete_specialist" ON storage.objects;
CREATE POLICY "word_images_delete_specialist" ON storage.objects
  FOR DELETE USING (bucket_id = 'word-images' AND public.is_specialist(auth.uid()));

DROP POLICY IF EXISTS "word_media_select_all" ON storage.objects;
CREATE POLICY "word_media_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'word-media');

DROP POLICY IF EXISTS "word_media_write_specialist" ON storage.objects;
CREATE POLICY "word_media_write_specialist" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'word-media' AND public.is_specialist(auth.uid()));

DROP POLICY IF EXISTS "word_media_update_specialist" ON storage.objects;
CREATE POLICY "word_media_update_specialist" ON storage.objects
  FOR UPDATE USING (bucket_id = 'word-media' AND public.is_specialist(auth.uid()))
  WITH CHECK (bucket_id = 'word-media' AND public.is_specialist(auth.uid()));

DROP POLICY IF EXISTS "word_media_delete_specialist" ON storage.objects;
CREATE POLICY "word_media_delete_specialist" ON storage.objects
  FOR DELETE USING (bucket_id = 'word-media' AND public.is_specialist(auth.uid()));
