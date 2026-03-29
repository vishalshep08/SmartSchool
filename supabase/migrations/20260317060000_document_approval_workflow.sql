-- ========================================================================
-- STEP 10 MIGRATION: Document Request Multi-Step Approval Workflow
-- Parent → Clerk → Principal → Clerk → Parent
-- ========================================================================

-- 1. Add new columns to document_requests table
ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS assigned_clerk_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forwarded_to_principal_at timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_by_clerk_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS principal_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS principal_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS principal_employee_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS principal_signature_data text,
  ADD COLUMN IF NOT EXISTS principal_note text,
  ADD COLUMN IF NOT EXISTS returned_to_clerk_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by_clerk_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS clerk_note text,
  ADD COLUMN IF NOT EXISTS downloaded_by_parent_at timestamptz;

-- Backfill: existing 'submitted' records keep current_stage = 'submitted'
UPDATE public.document_requests
  SET current_stage = CASE
    WHEN status = 'ready'      THEN 'ready'
    WHEN status = 'downloaded' THEN 'downloaded'
    WHEN status = 'in_review'  THEN 'clerk_review'
    ELSE 'submitted'
  END
WHERE current_stage = 'submitted';

-- 2. Create document_request_history table for full audit trail
CREATE TABLE IF NOT EXISTS public.document_request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id uuid NOT NULL REFERENCES public.document_requests(id) ON DELETE CASCADE,
  stage_from text NOT NULL,
  stage_to text NOT NULL,
  action_taken_by_user_id uuid,
  action_taken_by_name text NOT NULL DEFAULT '',
  action_taken_by_role text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_req_history_request ON public.document_request_history(document_request_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_history_user ON public.document_request_history(action_taken_by_user_id);

ALTER TABLE public.document_request_history ENABLE ROW LEVEL SECURITY;

-- History: authenticated users can read (RLS on request will protect further)
CREATE POLICY "Authenticated can view doc request history"
  ON public.document_request_history FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert history entries (clerk/principal actions)
CREATE POLICY "Authenticated can insert doc request history"
  ON public.document_request_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Update RLS policies on document_requests to allow clerks and principals

-- Allow authenticated staff to view all document requests (for clerk and principal dashboards)
CREATE POLICY "Staff can view all document requests"
  ON public.document_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('principal', 'teacher'))
    OR EXISTS (SELECT 1 FROM public.parents p WHERE p.id = document_requests.parent_id AND p.user_id = auth.uid())
  );

-- Allow authenticated staff to update document requests (for workflow stage transitions)
CREATE POLICY "Staff can update document requests for workflow"
  ON public.document_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('principal', 'teacher'))
    OR EXISTS (SELECT 1 FROM public.parents p WHERE p.id = document_requests.parent_id AND p.user_id = auth.uid())
  );

-- 4. Function: auto-assign clerk on document request insert
CREATE OR REPLACE FUNCTION public.assign_clerk_on_document_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clerk_id uuid;
  v_clerk_user_id uuid;
BEGIN
  -- Find the first active Administration Clerk (Non-Teaching, Administration dept, Clerk designation)
  SELECT t.id, t.user_id INTO v_clerk_id, v_clerk_user_id
  FROM public.teachers t
  WHERE LOWER(TRIM(t.employee_type)) = 'non-teaching'
    AND LOWER(TRIM(t.department)) = 'administration'
    AND LOWER(TRIM(t.designation)) = 'clerk'
    AND t.is_active = true
    AND (t.status IS NULL OR LOWER(TRIM(t.status)) = 'active')
  ORDER BY t.created_at ASC
  LIMIT 1;

  IF v_clerk_id IS NOT NULL THEN
    NEW.assigned_clerk_id := v_clerk_id;
    NEW.current_stage := 'clerk_review';

    -- Notify the clerk
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_clerk_user_id,
      'New Document Request',
      'A new ' || NEW.document_type || ' request has been submitted and assigned to you.',
      'document_request'
    );
  ELSE
    -- No clerk found — notify all principal users
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id,
      'Document Request Needs Clerk Assignment',
      'A new ' || NEW.document_type || ' request was submitted but no Administration Clerk was found. Please assign manually.',
      'document_request'
    FROM public.user_roles ur
    WHERE ur.role = 'principal';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists then recreate
DROP TRIGGER IF EXISTS trg_assign_clerk_on_doc_request ON public.document_requests;
CREATE TRIGGER trg_assign_clerk_on_doc_request
  BEFORE INSERT ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.assign_clerk_on_document_request();

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_requests_clerk ON public.document_requests(assigned_clerk_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_stage ON public.document_requests(current_stage);
CREATE INDEX IF NOT EXISTS idx_doc_requests_principal ON public.document_requests(principal_employee_id);
