
-- Add profile_photo_url to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Create student-profile-photos bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-profile-photos', 'student-profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for student-profile-photos
CREATE POLICY "Anyone can view student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-profile-photos');

CREATE POLICY "Authenticated users can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-profile-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update student photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'student-profile-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete student photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-profile-photos' AND auth.uid() IS NOT NULL);
