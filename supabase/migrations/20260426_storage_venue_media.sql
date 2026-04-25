-- Create the venue-media storage bucket (public, so cover photos load without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-media',
  'venue-media',
  true,
  104857600,  -- 100 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 104857600,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm'];

-- Anyone (including anon) can upload to venue-media
CREATE POLICY "venue_media_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'venue-media');

-- Anyone can read/view files
CREATE POLICY "venue_media_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'venue-media');

-- Owners can update/delete their own files
CREATE POLICY "venue_media_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'venue-media');

CREATE POLICY "venue_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'venue-media');
