
-- Add new staff columns to teachers table
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS employee_type text DEFAULT 'Teaching',
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'Academic',
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS employment_mode text DEFAULT 'Full-time',
  ADD COLUMN IF NOT EXISTS salary_grade text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS ifsc_code text,
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS official_email text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS experience_type text,
  ADD COLUMN IF NOT EXISTS assigned_class_id uuid REFERENCES public.classes(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
