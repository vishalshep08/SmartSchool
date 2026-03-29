
-- Create super_admin_activity_log table
CREATE TABLE public.super_admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name TEXT NOT NULL DEFAULT 'Unknown',
  performed_by_role TEXT NOT NULL DEFAULT 'admin',
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  record_affected TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT 'N/A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_super_admin_activity_log_created_at ON public.super_admin_activity_log(created_at DESC);
CREATE INDEX idx_super_admin_activity_log_action_type ON public.super_admin_activity_log(action_type);
CREATE INDEX idx_super_admin_activity_log_module ON public.super_admin_activity_log(module);

-- RLS
ALTER TABLE public.super_admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Super admins can read all logs
CREATE POLICY "Super admins can view activity logs"
  ON public.super_admin_activity_log
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Any authenticated user can insert logs (admin actions get logged)
CREATE POLICY "Authenticated users can insert activity logs sa"
  ON public.super_admin_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role full access
CREATE POLICY "Service role full access sa"
  ON public.super_admin_activity_log
  FOR ALL
  TO service_role
  USING (true);
