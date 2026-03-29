
-- Create document status enum
CREATE TYPE public.document_status AS ENUM ('pending', 'verified', 'rejected');

-- Create document type enum
CREATE TYPE public.document_type AS ENUM (
  'aadhaar_card',
  'birth_certificate',
  'transfer_certificate',
  'bonafide_certificate',
  'marksheet',
  'caste_certificate',
  'income_certificate',
  'passport_photo'
);

-- Create student_documents table
CREATE TABLE public.student_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type public.document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status public.document_status NOT NULL DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  academic_year TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_student_documents_student_id ON public.student_documents(student_id);
CREATE INDEX idx_student_documents_status ON public.student_documents(status);
CREATE INDEX idx_student_documents_document_type ON public.student_documents(document_type);
CREATE INDEX idx_student_documents_uploaded_by ON public.student_documents(uploaded_by);

-- RLS: Principals can do everything
CREATE POLICY "Principals can manage all documents"
  ON public.student_documents FOR ALL
  USING (public.has_role(auth.uid(), 'principal'));

-- RLS: Teachers can view documents of students in their assigned classes
CREATE POLICY "Teachers can view assigned class documents"
  ON public.student_documents FOR SELECT
  USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_class_assignments tca ON tca.class_id = s.class_id
      JOIN public.teachers t ON t.id = tca.teacher_id AND t.user_id = auth.uid()
      WHERE s.id = student_documents.student_id
    )
  );

-- RLS: Teachers can upload documents for students in their assigned classes
CREATE POLICY "Teachers can upload for assigned class"
  ON public.student_documents FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_class_assignments tca ON tca.class_id = s.class_id
      JOIN public.teachers t ON t.id = tca.teacher_id AND t.user_id = auth.uid()
      WHERE s.id = student_documents.student_id
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_student_documents_updated_at
  BEFORE UPDATE ON public.student_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- Storage RLS: Principals can do everything
CREATE POLICY "Principals full access to student docs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'student-documents' AND public.has_role(auth.uid(), 'principal'));

-- Storage: Teachers can upload to assigned student folders
CREATE POLICY "Teachers can upload student docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-documents' AND
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_class_assignments tca ON tca.class_id = s.class_id
      JOIN public.teachers t ON t.id = tca.teacher_id AND t.user_id = auth.uid()
      WHERE s.id::text = (storage.foldername(name))[1]
    )
  );

-- Storage: Teachers can view assigned student docs
CREATE POLICY "Teachers can view student docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-documents' AND
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_class_assignments tca ON tca.class_id = s.class_id
      JOIN public.teachers t ON t.id = tca.teacher_id AND t.user_id = auth.uid()
      WHERE s.id::text = (storage.foldername(name))[1]
    )
  );
