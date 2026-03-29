-- Migration to expand document_requests for the multi-stage approval workflow and create history table

ALTER TABLE document_requests
ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'clerk_review',
ADD COLUMN IF NOT EXISTS assigned_clerk_id uuid REFERENCES teachers(id),
ADD COLUMN IF NOT EXISTS forwarded_to_principal_at timestamptz,
ADD COLUMN IF NOT EXISTS forwarded_by_clerk_id uuid REFERENCES teachers(id),
ADD COLUMN IF NOT EXISTS clerk_note text,
ADD COLUMN IF NOT EXISTS principal_signed_at timestamptz,
ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES teachers(id),
ADD COLUMN IF NOT EXISTS principal_note text,
ADD COLUMN IF NOT EXISTS principal_signature_data text,
ADD COLUMN IF NOT EXISTS returned_to_clerk_at timestamptz,
ADD COLUMN IF NOT EXISTS issued_by_clerk_id uuid REFERENCES teachers(id),
ADD COLUMN IF NOT EXISTS issued_at timestamptz;

-- Migrate existing status to current_stage if applicable
UPDATE document_requests SET current_stage = 'ready' WHERE status = 'ready' AND current_stage = 'clerk_review';
UPDATE document_requests SET current_stage = 'downloaded' WHERE status = 'downloaded' AND current_stage = 'clerk_review';

-- Create history table
CREATE TABLE IF NOT EXISTS document_request_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_request_id uuid REFERENCES document_requests(id) ON DELETE CASCADE NOT NULL,
    stage_from text,
    stage_to text NOT NULL,
    action_taken_by_user_id uuid REFERENCES auth.users(id),
    action_taken_by_name text,
    action_taken_by_role text,
    note text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS for history
ALTER TABLE document_request_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_request_history_read_all"
ON document_request_history FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "document_request_history_insert_all"
ON document_request_history FOR INSERT 
TO authenticated WITH CHECK (true);
