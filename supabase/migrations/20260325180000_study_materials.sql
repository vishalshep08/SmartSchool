-- ─── Study Materials Table ────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.study_materials CASCADE;

CREATE TABLE IF NOT EXISTS public.study_materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  topic           TEXT NOT NULL,
  material_type   TEXT NOT NULL CHECK (material_type IN ('lecture_link', 'notes', 'syllabus', 'assignment', 'other')),
  title           TEXT NOT NULL,
  description     TEXT,
  -- For file uploads: path in storage bucket
  file_url        TEXT,
  file_name       TEXT,
  file_size       BIGINT,
  -- For lecture links (YouTube / recorded classes)
  lecture_url     TEXT,
  material_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast class+subject queries (parent portal)
CREATE INDEX IF NOT EXISTS study_materials_class_subject_idx
  ON public.study_materials (class_id, subject);

CREATE INDEX IF NOT EXISTS study_materials_teacher_idx
  ON public.study_materials (teacher_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_study_materials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_study_materials_updated_at ON public.study_materials;
CREATE TRIGGER trg_study_materials_updated_at
  BEFORE UPDATE ON public.study_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_study_materials_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Teachers (employees) can read their own materials
CREATE POLICY "teachers_read_own_materials"
  ON public.study_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = teacher_id
        AND e.user_id = auth.uid()
    )
  );

-- Teachers (employees) can insert their own materials
CREATE POLICY "teachers_insert_own_materials"
  ON public.study_materials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = teacher_id
        AND e.user_id = auth.uid()
    )
  );

-- Teachers (employees) can update their own materials
CREATE POLICY "teachers_update_own_materials"
  ON public.study_materials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = teacher_id
        AND e.user_id = auth.uid()
    )
  );

-- Teachers (employees) can delete their own materials
CREATE POLICY "teachers_delete_own_materials"
  ON public.study_materials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = teacher_id
        AND e.user_id = auth.uid()
    )
  );

-- Parents can read study materials for their child's class
CREATE POLICY "parents_read_class_materials"
  ON public.study_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.parents p
      JOIN public.parent_student_link psl ON psl.parent_id = p.id
      JOIN public.students s ON s.id = psl.student_id
      WHERE p.user_id = auth.uid()
        AND s.class_id = class_id
    )
  );

-- Principal can read all materials
CREATE POLICY "principal_read_all_materials"
  ON public.study_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('principal')
    )
  );

-- ─── Storage Bucket ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: Anyone can view study materials
DROP POLICY IF EXISTS "study_materials_Public_Access" ON storage.objects;
CREATE POLICY "study_materials_Public_Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'study-materials');

-- Storage RLS: Authenticated users can insert
DROP POLICY IF EXISTS "study_materials_Auth_Insert" ON storage.objects;
CREATE POLICY "study_materials_Auth_Insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-materials');

-- Storage RLS: Authenticated users can update
DROP POLICY IF EXISTS "study_materials_Auth_Update" ON storage.objects;
CREATE POLICY "study_materials_Auth_Update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'study-materials');

-- Storage RLS: Authenticated users can delete
DROP POLICY IF EXISTS "study_materials_Auth_Delete" ON storage.objects;
CREATE POLICY "study_materials_Auth_Delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'study-materials');
