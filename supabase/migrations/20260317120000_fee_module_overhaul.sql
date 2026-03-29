-- =============================================
-- FEE MODULE OVERHAUL — Payment Modes, Cheque
-- Tracking, Pending Notifications
-- =============================================

-- 1. Expand fee_payments table with new payment mode columns
ALTER TABLE public.fee_payments
  ALTER COLUMN payment_mode TYPE text,
  DROP CONSTRAINT IF EXISTS fee_payments_payment_mode_check;

ALTER TABLE public.fee_payments
  ADD CONSTRAINT fee_payments_payment_mode_check
  CHECK (payment_mode IN ('Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Demand Draft'));

ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS upi_transaction_id        text,
  ADD COLUMN IF NOT EXISTS upi_payer_id              text,
  ADD COLUMN IF NOT EXISTS cheque_number             text,
  ADD COLUMN IF NOT EXISTS cheque_date               date,
  ADD COLUMN IF NOT EXISTS cheque_bank_name          text,
  ADD COLUMN IF NOT EXISTS cheque_status             text DEFAULT 'Received'
    CHECK (cheque_status IN ('Received', 'Cleared', 'Bounced')),
  ADD COLUMN IF NOT EXISTS bank_transfer_reference   text,
  ADD COLUMN IF NOT EXISTS bank_transfer_date        date,
  ADD COLUMN IF NOT EXISTS bank_transfer_bank        text,
  ADD COLUMN IF NOT EXISTS dd_number                 text,
  ADD COLUMN IF NOT EXISTS dd_bank_name              text,
  ADD COLUMN IF NOT EXISTS dd_date                   date,
  ADD COLUMN IF NOT EXISTS collected_by_employee_id  uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_generated_at      timestamptz,
  ADD COLUMN IF NOT EXISTS is_receipt_printed        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bounced                boolean DEFAULT false;

-- 2. Cheque tracking table
CREATE TABLE IF NOT EXISTS public.cheque_tracking (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_payment_id      uuid NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  cheque_number       text NOT NULL,
  cheque_date         date NOT NULL,
  bank_name           text NOT NULL,
  amount              numeric NOT NULL,
  received_date       date NOT NULL DEFAULT CURRENT_DATE,
  clearance_status    text NOT NULL DEFAULT 'Pending'
    CHECK (clearance_status IN ('Pending', 'Cleared', 'Bounced')),
  cleared_date        date,
  bounce_reason       text,
  re_payment_id       uuid REFERENCES public.fee_payments(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.cheque_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cheque_tracking_all" ON public.cheque_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Fee pending notifications table
CREATE TABLE IF NOT EXISTS public.fee_pending_notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id           uuid REFERENCES public.parents(id) ON DELETE SET NULL,
  notification_type   text NOT NULL DEFAULT 'in_app'
    CHECK (notification_type IN ('in_app', 'email', 'both')),
  sent_by_admin_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at             timestamptz DEFAULT now(),
  amount_pending      numeric,
  message             text,
  academic_year       text,
  is_read             boolean DEFAULT false
);

ALTER TABLE public.fee_pending_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_notifications_select" ON public.fee_pending_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_notifications_insert" ON public.fee_pending_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fee_notifications_update" ON public.fee_pending_notifications FOR UPDATE TO authenticated USING (true);

-- 4. Emergency contacts table (for employee profiles)
CREATE TABLE IF NOT EXISTS public.employee_emergency_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  contact_name    text NOT NULL,
  relationship    text NOT NULL,
  contact_number  text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency_contacts_all" ON public.employee_emergency_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Employee edit history table
CREATE TABLE IF NOT EXISTS public.employee_edit_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  changed_by_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name text,
  changed_by_role text DEFAULT 'principal',
  changed_fields  jsonb NOT NULL DEFAULT '{}',
  change_summary  text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.employee_edit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_edit_history_select" ON public.employee_edit_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "emp_edit_history_insert" ON public.employee_edit_history FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Realtime for fee notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_pending_notifications;
