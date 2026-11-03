-- ==============================================================================
-- KAWKAB TALTA E3DADI — SUPABASE STORAGE SETUP & RLS POLICIES FOR LESSON MEDIA
-- Migration: 20261028120000_lesson_storage_bucket.sql
-- ==============================================================================

-- 1. Create or Update 'lesson-media' Storage Bucket
-- Public bucket for lesson attachments and diagrams:
-- Anyone (students, visitors) can read via public URL;
-- Only Teachers and Admins can upload, modify, or delete.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-media',
  'lesson-media',
  true,
  10485760, -- 10MB file limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Enable Row Level Security on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public & Students can view/read lesson media images
DROP POLICY IF EXISTS "Public & Students can view lesson media" ON storage.objects;
CREATE POLICY "Public & Students can view lesson media"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-media');

-- 4. Policy: Authenticated Teachers and Admins can upload (INSERT) lesson media
DROP POLICY IF EXISTS "Teachers and Admins can upload lesson media" ON storage.objects;
CREATE POLICY "Teachers and Admins can upload lesson media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  )
);

-- 5. Policy: Authenticated Teachers and Admins can update (UPDATE) lesson media
DROP POLICY IF EXISTS "Teachers and Admins can update lesson media" ON storage.objects;
CREATE POLICY "Teachers and Admins can update lesson media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  )
);

-- 6. Policy: Authenticated Teachers and Admins can delete (DELETE) lesson media
DROP POLICY IF EXISTS "Teachers and Admins can delete lesson media" ON storage.objects;
CREATE POLICY "Teachers and Admins can delete lesson media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  )
);
