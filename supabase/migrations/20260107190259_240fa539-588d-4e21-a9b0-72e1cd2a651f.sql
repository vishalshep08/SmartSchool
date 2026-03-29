-- ==============================================================================
-- Teacher Class Assignments & Feature Permissions
-- ==============================================================================

-- Create teacher_class_assignments table for explicit class assignments
CREATE TABLE public.teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  is_class_teacher BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(teacher_id, class_id)
);

-- Enable RLS
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_class_assignments
CREATE POLICY "Authenticated can view assignments"
ON public.teacher_class_assignments FOR SELECT
USING (true);

CREATE POLICY "Principals can manage assignments"
ON public.teacher_class_assignments FOR ALL
USING (has_role(auth.uid(), 'principal'));

-- Create teacher_permissions table for granular feature access
CREATE TABLE public.teacher_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_mark_attendance BOOLEAN DEFAULT true,
  can_assign_homework BOOLEAN DEFAULT true,
  can_add_remarks BOOLEAN DEFAULT true,
  can_view_reports BOOLEAN DEFAULT true,
  can_create_notices BOOLEAN DEFAULT true,
  can_view_timetable BOOLEAN DEFAULT true,
  can_raise_issues BOOLEAN DEFAULT true,
  can_manage_students BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.teacher_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_permissions
CREATE POLICY "Teachers can view own permissions"
ON public.teacher_permissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM teachers WHERE teachers.id = teacher_permissions.teacher_id AND teachers.user_id = auth.uid()
));

CREATE POLICY "Principals can view all permissions"
ON public.teacher_permissions FOR SELECT
USING (has_role(auth.uid(), 'principal'));

CREATE POLICY "Principals can manage permissions"
ON public.teacher_permissions FOR ALL
USING (has_role(auth.uid(), 'principal'));

-- Trigger to auto-create permissions when teacher is created
CREATE OR REPLACE FUNCTION public.create_teacher_permissions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teacher_permissions (teacher_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_teacher_created
AFTER INSERT ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.create_teacher_permissions();

-- Create permissions for existing teachers
INSERT INTO public.teacher_permissions (teacher_id)
SELECT id FROM public.teachers
WHERE id NOT IN (SELECT teacher_id FROM public.teacher_permissions);

-- Add force_password_change column to profiles for first login requirement
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- Function to get teacher's assigned classes
CREATE OR REPLACE FUNCTION public.get_teacher_classes(_teacher_id uuid)
RETURNS TABLE(class_id uuid) AS $$
  SELECT DISTINCT tca.class_id 
  FROM public.teacher_class_assignments tca
  WHERE tca.teacher_id = _teacher_id
  UNION
  SELECT DISTINCT t.class_id 
  FROM public.timetable t
  WHERE t.teacher_id = _teacher_id
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Function to check if teacher has access to a class
CREATE OR REPLACE FUNCTION public.teacher_has_class_access(_teacher_id uuid, _class_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_class_assignments 
    WHERE teacher_id = _teacher_id AND class_id = _class_id
  ) OR EXISTS (
    SELECT 1 FROM public.timetable 
    WHERE teacher_id = _teacher_id AND class_id = _class_id
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;