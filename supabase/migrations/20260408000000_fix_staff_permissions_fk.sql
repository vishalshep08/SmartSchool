-- Drop existing foreign key constraints on teachers table
ALTER TABLE public.staff_permissions 
  DROP CONSTRAINT IF EXISTS staff_permissions_employee_id_fkey;

ALTER TABLE public.permission_change_log 
  DROP CONSTRAINT IF EXISTS permission_change_log_employee_id_fkey;

-- Add new constraints pointing to employees table
ALTER TABLE public.staff_permissions 
  ADD CONSTRAINT staff_permissions_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE public.permission_change_log 
  ADD CONSTRAINT permission_change_log_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
