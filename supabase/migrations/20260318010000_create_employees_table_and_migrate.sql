-- STEP 1 — CREATE THE EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  contact_number TEXT,
  personal_email TEXT,
  official_email TEXT,
  address TEXT,
  aadhaar_number TEXT,
  employee_type TEXT NOT NULL DEFAULT 'Teaching',
  department TEXT,
  designation TEXT,
  date_of_joining DATE,
  employment_mode TEXT DEFAULT 'Full-time',
  salary_grade TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  account_holder_name TEXT,
  bank_name TEXT,
  branch_name TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  emergency_contact_number TEXT,
  status TEXT DEFAULT 'Active',
  profile_photo_url TEXT,
  -- Teaching specific
  is_class_teacher BOOLEAN DEFAULT FALSE,
  assigned_class_id UUID REFERENCES classes(id),
  experience_type TEXT,
  qualification TEXT,
  subjects_assigned TEXT[],
  classes_assigned UUID[],
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2 — MIGRATE EXISTING TEACHERS DATA INTO EMPLOYEES TABLE
-- Copying all fields including ID so existing foreign key references wouldn't be orphaned logically
INSERT INTO employees (
  id,
  user_id,
  full_name,
  contact_number,
  personal_email,
  department,
  designation,
  date_of_joining,
  status,
  profile_photo_url,
  is_class_teacher,
  assigned_class_id,
  experience_type,
  qualification,
  employee_type,
  created_at,
  updated_at
)
SELECT
  t.id,
  t.user_id,
  COALESCE(p.full_name, 'Unknown Employee') AS full_name,
  COALESCE(t.contact_number, p.phone) AS contact_number,
  COALESCE(t.personal_email, p.email) AS personal_email,
  t.department,
  t.designation,
  t.joining_date AS date_of_joining,
  COALESCE(t.status, CASE WHEN t.is_active = FALSE THEN 'Inactive' ELSE 'Active' END) AS status,
  p.avatar_url AS profile_photo_url,
  FALSE AS is_class_teacher,
  t.assigned_class_id,
  t.experience_type,
  t.qualification,
  COALESCE(t.employee_type, 'Teaching') AS employee_type,
  t.created_at,
  t.updated_at
FROM teachers t
LEFT JOIN profiles p ON t.user_id = p.user_id
ON CONFLICT (id) DO NOTHING;

-- Fix previously created foreign keys in document_requests to point to employees instead of teachers
ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_assigned_clerk_id_fkey;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_assigned_clerk_id_fkey FOREIGN KEY (assigned_clerk_id) REFERENCES employees(id);

ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_forwarded_by_clerk_id_fkey;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_forwarded_by_clerk_id_fkey FOREIGN KEY (forwarded_by_clerk_id) REFERENCES employees(id);

ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_principal_id_fkey;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_principal_id_fkey FOREIGN KEY (principal_id) REFERENCES employees(id);

ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_issued_by_clerk_id_fkey;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_issued_by_clerk_id_fkey FOREIGN KEY (issued_by_clerk_id) REFERENCES employees(id);

-- Update foreign keys for assignments, salary, attendance, etc.
ALTER TABLE teacher_class_assignments DROP CONSTRAINT IF EXISTS teacher_class_assignments_teacher_id_fkey;
ALTER TABLE teacher_class_assignments ADD CONSTRAINT teacher_class_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);

ALTER TABLE salary_records DROP CONSTRAINT IF EXISTS salary_records_teacher_id_fkey;
ALTER TABLE salary_records ADD CONSTRAINT salary_records_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);

ALTER TABLE teacher_attendance DROP CONSTRAINT IF EXISTS teacher_attendance_teacher_id_fkey;
ALTER TABLE teacher_attendance ADD CONSTRAINT teacher_attendance_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);

ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_teacher_id_fkey;
ALTER TABLE timetable ADD CONSTRAINT timetable_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);

ALTER TABLE student_remarks DROP CONSTRAINT IF EXISTS student_remarks_teacher_id_fkey;
ALTER TABLE student_remarks ADD CONSTRAINT student_remarks_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);

ALTER TABLE teacher_documents DROP CONSTRAINT IF EXISTS teacher_documents_teacher_id_fkey;
ALTER TABLE teacher_documents ADD CONSTRAINT teacher_documents_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);

ALTER TABLE teacher_leaves DROP CONSTRAINT IF EXISTS teacher_leaves_teacher_id_fkey;
ALTER TABLE teacher_leaves ADD CONSTRAINT teacher_leaves_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);

ALTER TABLE teacher_permissions DROP CONSTRAINT IF EXISTS teacher_permissions_teacher_id_fkey;
ALTER TABLE teacher_permissions ADD CONSTRAINT teacher_permissions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES employees(id);
-- STEP 3 — UPDATE USER_ROLES TABLE ROLES
UPDATE user_roles
SET role = 'teacher'::app_role
WHERE user_id IN (
  SELECT user_id FROM employees
  WHERE employee_type = 'Teaching'
  AND user_id IS NOT NULL
);

UPDATE user_roles SET role = 'staff'::app_role
WHERE user_id IN (
  SELECT user_id FROM employees
  WHERE employee_type IN ('Non-Teaching', 'Management', 'Contract')
  AND user_id IS NOT NULL
);

-- STEP 4 — ADD RLS POLICIES ON EMPLOYEES TABLE
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_manage_employees" ON employees;
CREATE POLICY "superadmin_manage_employees"
ON employees FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'::app_role
  )
);

DROP POLICY IF EXISTS "employee_read_own" ON employees;
CREATE POLICY "employee_read_own"
ON employees FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "principal_manage_employees" ON employees;
CREATE POLICY "principal_manage_employees"
ON employees FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'principal'::app_role
  )
);

-- STEP 5 — FIX TRIGGERS AND AUTH HANDLER
-- 1. Fix the main auth handler to correctly map 'admin' role to 'super_admin' to prevent AUTH_CREATE_FAILED errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_str text;
  final_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Extract role from metadata
  user_role_str := NEW.raw_user_meta_data ->> 'role';
  
  -- Map 'admin' to 'super_admin' and validate enum
  IF user_role_str = 'admin' THEN
    final_role := 'super_admin'::app_role;
  ELSIF user_role_str IS NULL THEN
    final_role := 'parent'::app_role;
  ELSE
    -- Attempt cast, fallback to parent if invalid
    BEGIN
      final_role := user_role_str::app_role;
    EXCEPTION WHEN OTHERS THEN
      final_role := 'parent'::app_role;
    END;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role);
  
  RETURN NEW;
END;
$$;

-- 2. Move the permissions trigger from teachers to employees
DROP TRIGGER IF EXISTS on_teacher_created ON public.teachers;
DROP TRIGGER IF EXISTS on_employee_created ON public.employees;

CREATE TRIGGER on_employee_created
  AFTER INSERT ON public.employees
  FOR EACH ROW
  WHEN (NEW.employee_type = 'Teaching')
  EXECUTE FUNCTION public.create_teacher_permissions();

-- 3. Move the updated_at trigger to employees
DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
