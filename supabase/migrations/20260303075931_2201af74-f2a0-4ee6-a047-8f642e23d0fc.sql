
-- Create parents table
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create parent_student_link table
CREATE TABLE public.parent_student_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_link ENABLE ROW LEVEL SECURITY;

-- Parents RLS policies
CREATE POLICY "Parents can view own record"
  ON public.parents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Principals can manage parents"
  ON public.parents FOR ALL
  USING (has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Service role can manage parents"
  ON public.parents FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Parent student link RLS policies
CREATE POLICY "Parents can view own links"
  ON public.parent_student_link FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parents p
    WHERE p.id = parent_student_link.parent_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Principals can manage links"
  ON public.parent_student_link FOR ALL
  USING (has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Service role can manage links"
  ON public.parent_student_link FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Indexes
CREATE INDEX idx_parents_user_id ON public.parents(user_id);
CREATE INDEX idx_parents_email ON public.parents(email);
CREATE INDEX idx_parent_student_link_parent ON public.parent_student_link(parent_id);
CREATE INDEX idx_parent_student_link_student ON public.parent_student_link(student_id);
