-- 1. Create teacher_leaves table for leave management
CREATE TABLE public.teacher_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'emergency', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES public.profiles(id),
  approval_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create student_remarks table for behavior tracking
CREATE TABLE public.student_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  remark_type TEXT NOT NULL CHECK (remark_type IN ('positive', 'negative', 'neutral')),
  category TEXT NOT NULL CHECK (category IN ('behavior', 'academic', 'attendance', 'participation', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create notices table for announcements
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  notice_type TEXT NOT NULL CHECK (notice_type IN ('general', 'class', 'emergency', 'event')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'teachers', 'students', 'class')),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  attachment_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teacher_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_leaves
CREATE POLICY "Teachers can view own leaves" ON public.teacher_leaves
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM teachers WHERE teachers.id = teacher_leaves.teacher_id AND teachers.user_id = auth.uid())
  );

CREATE POLICY "Teachers can create own leaves" ON public.teacher_leaves
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM teachers WHERE teachers.id = teacher_leaves.teacher_id AND teachers.user_id = auth.uid())
  );

CREATE POLICY "Teachers can update own pending leaves" ON public.teacher_leaves
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teachers WHERE teachers.id = teacher_leaves.teacher_id AND teachers.user_id = auth.uid())
    AND status = 'pending'
  );

CREATE POLICY "Principals can manage all leaves" ON public.teacher_leaves
  FOR ALL USING (has_role(auth.uid(), 'principal'));

-- RLS Policies for student_remarks
CREATE POLICY "Teachers can view remarks" ON public.student_remarks
  FOR SELECT USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'principal'));

CREATE POLICY "Teachers can create remarks" ON public.student_remarks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM teachers WHERE teachers.id = student_remarks.teacher_id AND teachers.user_id = auth.uid())
  );

CREATE POLICY "Teachers can update own remarks" ON public.student_remarks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teachers WHERE teachers.id = student_remarks.teacher_id AND teachers.user_id = auth.uid())
  );

CREATE POLICY "Principals can manage all remarks" ON public.student_remarks
  FOR ALL USING (has_role(auth.uid(), 'principal'));

-- RLS Policies for notices
CREATE POLICY "Everyone can view approved notices" ON public.notices
  FOR SELECT USING (is_approved = true OR created_by = auth.uid() OR has_role(auth.uid(), 'principal'));

CREATE POLICY "Teachers can create notices" ON public.notices
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'principal'));

CREATE POLICY "Users can update own notices" ON public.notices
  FOR UPDATE USING (created_by = auth.uid() OR has_role(auth.uid(), 'principal'));

CREATE POLICY "Principals can manage all notices" ON public.notices
  FOR ALL USING (has_role(auth.uid(), 'principal'));

-- Add updated_at triggers
CREATE TRIGGER update_teacher_leaves_updated_at
  BEFORE UPDATE ON public.teacher_leaves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();