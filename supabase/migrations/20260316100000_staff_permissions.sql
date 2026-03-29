-- ========================================================================
-- STEP 8 MIGRATION: Staff Permissions & Permission Change Log
-- ========================================================================

-- 1. Create staff_permissions table
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  is_enabled boolean DEFAULT false,
  updated_by_super_admin_id uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, permission_key)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_permissions_employee ON public.staff_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_user ON public.staff_permissions(user_id);

-- 2. Create permission_change_log table for audit
CREATE TABLE IF NOT EXISTS public.permission_change_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  old_value boolean DEFAULT false,
  new_value boolean DEFAULT false,
  changed_by_name text DEFAULT 'Super Admin',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_change_log_employee ON public.permission_change_log(employee_id);

-- 3. Create permission_templates table
CREATE TABLE IF NOT EXISTS public.permission_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. Seed default permission templates
INSERT INTO public.permission_templates (template_name, permissions) VALUES
  ('Class Teacher', '{
    "attendance.mark": true, "attendance.edit": true, "attendance.view_reports": true,
    "homework.post": true, "homework.edit": true, "homework.delete": false,
    "students.view": true, "students.edit": false, "students.delete": false,
    "leave.approve": true, "leave.reject": true, "leave.view": true,
    "remarks.post": true, "remarks.edit": true, "remarks.delete": false,
    "reports.view": true, "reports.export": true,
    "salary.view_own": true, "salary.view_others": false, "salary.generate": false,
    "announcements.post": false, "announcements.delete": false,
    "documents.process": false,
    "fee.view": false, "fee.edit": false
  }'::jsonb),
  ('Subject Teacher', '{
    "attendance.mark": false, "attendance.edit": false, "attendance.view_reports": false,
    "homework.post": true, "homework.edit": true, "homework.delete": false,
    "students.view": true, "students.edit": false, "students.delete": false,
    "leave.approve": false, "leave.reject": false, "leave.view": false,
    "remarks.post": true, "remarks.edit": true, "remarks.delete": false,
    "reports.view": false, "reports.export": false,
    "salary.view_own": true, "salary.view_others": false, "salary.generate": false,
    "announcements.post": false, "announcements.delete": false,
    "documents.process": false,
    "fee.view": false, "fee.edit": false
  }'::jsonb),
  ('Non-Teaching Staff', '{
    "attendance.mark": false, "attendance.edit": false, "attendance.view_reports": false,
    "homework.post": false, "homework.edit": false, "homework.delete": false,
    "students.view": false, "students.edit": false, "students.delete": false,
    "leave.approve": false, "leave.reject": false, "leave.view": false,
    "remarks.post": false, "remarks.edit": false, "remarks.delete": false,
    "reports.view": false, "reports.export": false,
    "salary.view_own": true, "salary.view_others": false, "salary.generate": false,
    "announcements.post": false, "announcements.delete": false,
    "documents.process": false,
    "fee.view": false, "fee.edit": false
  }'::jsonb),
  ('Principal', '{
    "attendance.mark": true, "attendance.edit": true, "attendance.view_reports": true,
    "homework.post": true, "homework.edit": true, "homework.delete": true,
    "students.view": true, "students.edit": true, "students.delete": true,
    "leave.approve": true, "leave.reject": true, "leave.view": true,
    "remarks.post": true, "remarks.edit": true, "remarks.delete": true,
    "reports.view": true, "reports.export": true,
    "salary.view_own": true, "salary.view_others": true, "salary.generate": true,
    "announcements.post": true, "announcements.delete": true,
    "documents.process": true,
    "fee.view": true, "fee.edit": true
  }'::jsonb)
ON CONFLICT (template_name) DO NOTHING;

-- 5. RLS Policies
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

-- Super Admin can do everything on staff_permissions
CREATE POLICY "super_admin_manage_staff_permissions"
  ON public.staff_permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'principal'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'principal'))
  );

-- Users can read their own permissions
CREATE POLICY "users_read_own_permissions"
  ON public.staff_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Super Admin can manage permission_change_log
CREATE POLICY "super_admin_manage_change_log"
  ON public.permission_change_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'principal'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'principal'))
  );

-- Users can read their own permission change log
CREATE POLICY "users_read_own_change_log"
  ON public.permission_change_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.staff_permissions WHERE employee_id = permission_change_log.employee_id AND user_id = auth.uid())
  );

-- Everyone can read templates
CREATE POLICY "anyone_read_templates"
  ON public.permission_templates FOR SELECT
  USING (true);

-- Only super admin can modify templates
CREATE POLICY "super_admin_manage_templates"
  ON public.permission_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 6. Add roll_number column to students if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'roll_number'
  ) THEN
    ALTER TABLE public.students ADD COLUMN roll_number text;
  END IF;
END $$;
