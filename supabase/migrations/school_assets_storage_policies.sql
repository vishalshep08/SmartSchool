-- Storage RLS policies for the 'school-assets' bucket
-- Run this in Supabase Dashboard → SQL Editor
-- (or apply as a migration)

-- 1. Allow principals to upload/update files in the logos/ folder
CREATE POLICY "Principals can upload school assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-assets'
  AND (storage.foldername(name))[1] = 'logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'principal'
  )
);

-- 2. Allow principals to update (upsert) existing files
CREATE POLICY "Principals can update school assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'principal'
  )
)
WITH CHECK (
  bucket_id = 'school-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'principal'
  )
);

-- 3. Allow principals to delete files (for the Remove button)
CREATE POLICY "Principals can delete school assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'principal'
  )
);

-- 4. Allow everyone (including unauthenticated) to read public assets
--    (needed so the logo URL works on the Login page without auth)
CREATE POLICY "Public read access for school assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'school-assets');
