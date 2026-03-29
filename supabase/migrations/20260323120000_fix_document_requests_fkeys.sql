-- Fix remaining NO ACTION foreign keys on document_requests → employees
-- Run this in Supabase SQL Editor

-- Fix assigned_clerk_id → employees
ALTER TABLE document_requests
  DROP CONSTRAINT IF EXISTS document_requests_assigned_clerk_id_fkey;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_assigned_clerk_id_fkey
  FOREIGN KEY (assigned_clerk_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

-- Fix forwarded_by_clerk_id → employees
ALTER TABLE document_requests
  DROP CONSTRAINT IF EXISTS document_requests_forwarded_by_clerk_id_fkey;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_forwarded_by_clerk_id_fkey
  FOREIGN KEY (forwarded_by_clerk_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

-- Fix principal_id → employees
ALTER TABLE document_requests
  DROP CONSTRAINT IF EXISTS document_requests_principal_id_fkey;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_principal_id_fkey
  FOREIGN KEY (principal_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

-- Fix issued_by_clerk_id → employees
ALTER TABLE document_requests
  DROP CONSTRAINT IF EXISTS document_requests_issued_by_clerk_id_fkey;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_issued_by_clerk_id_fkey
  FOREIGN KEY (issued_by_clerk_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

-- ✅ VERIFY — should return 0 rows when complete:
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name IN ('teachers', 'employees')
AND rc.delete_rule = 'NO ACTION'
ORDER BY tc.table_name;
