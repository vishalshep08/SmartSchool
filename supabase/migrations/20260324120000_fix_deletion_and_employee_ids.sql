-- FIX 1: Allow teacher_id to be NULL in teacher_class_assignments
-- This is required so SET NULL works when deleting employees who are class teachers
ALTER TABLE teacher_class_assignments
  ALTER COLUMN teacher_id DROP NOT NULL;

-- FIX 2: Add employee_id column to employees table for non-teaching staff
-- Teaching staff get their ID from the teachers table; all employees need one
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;

-- Generate IDs for existing employees that don't have one yet
UPDATE employees
SET employee_id = 'EMP-' || UPPER(SUBSTRING(MD5(id::text), 1, 6))
WHERE employee_id IS NULL;

-- FIX 3: Update the RLS on employees to allow staff to read their own record
-- (in case it was missing)
DROP POLICY IF EXISTS "employee_read_own" ON employees;
CREATE POLICY "employee_read_own"
ON employees FOR SELECT
TO authenticated
USING (user_id = auth.uid());
