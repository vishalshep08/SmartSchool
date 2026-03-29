
-- ========================================
-- Requirement 1: activity_logs table
-- ========================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID,
  role TEXT NOT NULL DEFAULT 'admin',
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_role ON public.activity_logs(role);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Principals can view all activity logs"
ON public.activity_logs FOR SELECT
USING (has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Service role can manage activity logs"
ON public.activity_logs FOR ALL
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================
-- Requirement 2: RPC functions for homework overview
-- ========================================
CREATE OR REPLACE FUNCTION public.get_homework_overview()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_hw INT;
  total_submissions INT;
  total_expected INT;
  result JSON;
BEGIN
  SELECT COUNT(*) INTO total_hw FROM homework;
  SELECT COUNT(*) INTO total_submissions FROM homework_submissions WHERE status != 'pending';

  SELECT COALESCE(SUM(student_count), 0) INTO total_expected
  FROM (
    SELECT h.id, COUNT(DISTINCT s.id) as student_count
    FROM homework h
    JOIN students s ON s.class_id = h.class_id AND s.is_active = true
    GROUP BY h.id
  ) sub;

  SELECT json_build_object(
    'total_assigned', total_hw,
    'total_submissions', total_submissions,
    'pending_submissions', GREATEST(total_expected - total_submissions, 0),
    'submission_rate', CASE WHEN total_expected > 0
      THEN ROUND((total_submissions::NUMERIC / total_expected) * 100, 1)
      ELSE 0 END
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_homework_overview_by_class()
RETURNS TABLE (
  class_name TEXT,
  total_assigned BIGINT,
  total_submitted BIGINT,
  submission_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name AS class_name,
    COUNT(DISTINCT h.id) AS total_assigned,
    COUNT(DISTINCT CASE WHEN hs.status != 'pending' THEN hs.id END) AS total_submitted,
    ROUND(
      CASE WHEN COUNT(DISTINCT h.id) > 0
        THEN (COUNT(DISTINCT CASE WHEN hs.status != 'pending' THEN hs.id END)::NUMERIC / GREATEST(COUNT(DISTINCT h.id), 1)) * 100
        ELSE 0
      END, 1
    ) AS submission_rate
  FROM classes c
  LEFT JOIN homework h ON h.class_id = c.id
  LEFT JOIN homework_submissions hs ON hs.homework_id = h.id
  GROUP BY c.id, c.name
  ORDER BY c.name;
END;
$$;

-- ========================================
-- Requirement 4: teacher_documents table + storage bucket
-- ========================================
CREATE TABLE public.teacher_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'id_proof', 'qualification_certificate', 'experience_certificate', 'profile_photo'
  )),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Principals can manage teacher documents"
ON public.teacher_documents FOR ALL
USING (has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Teachers can view own documents"
ON public.teacher_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM teachers WHERE teachers.id = teacher_documents.teacher_id AND teachers.user_id = auth.uid()
));

CREATE POLICY "Service role can manage teacher documents"
ON public.teacher_documents FOR ALL
USING (auth.role() = 'service_role'::text);

-- Storage bucket for teacher documents
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-documents', 'teacher-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Principals can upload teacher documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'teacher-documents' AND has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Principals can view teacher documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'teacher-documents' AND has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Principals can delete teacher documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'teacher-documents' AND has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Teachers can view own teacher documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'teacher-documents' AND EXISTS (
  SELECT 1 FROM teachers WHERE teachers.user_id = auth.uid()
));

-- ========================================
-- Requirement 5: homework-files storage bucket + columns
-- ========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('homework-files', 'homework-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Teachers can upload homework files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'homework-files' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Principals can upload homework files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'homework-files' AND has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Anyone can view homework files"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework-files');

CREATE POLICY "Teachers can delete homework files"
ON storage.objects FOR DELETE
USING (bucket_id = 'homework-files' AND has_role(auth.uid(), 'teacher'::app_role));

-- Add file columns to homework table
ALTER TABLE public.homework
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- ========================================
-- Requirement 6: homework-submissions storage + table updates
-- ========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('homework-submissions', 'homework-submissions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Service role manages homework submissions storage"
ON storage.objects FOR ALL
USING (bucket_id = 'homework-submissions' AND auth.role() = 'service_role'::text);

CREATE POLICY "Teachers can view homework submission files"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework-submissions' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Principals can view homework submission files"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework-submissions' AND has_role(auth.uid(), 'principal'::app_role));

-- Add missing columns to homework_submissions
ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS submission_text TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- Add unique constraint to prevent duplicate submissions
ALTER TABLE public.homework_submissions
  ADD CONSTRAINT unique_homework_student UNIQUE (homework_id, student_id);
