-- ═══════════════════════════════════════════════════════════════
-- FIX: student_fees RLS for parents
-- Allow parents to view their own child's fee records
-- ═══════════════════════════════════════════════════════════════

-- Check if student_fees has RLS and any parent policy
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

-- Drop if exists first
DROP POLICY IF EXISTS "parents_read_own_student_fees" ON public.student_fees;
DROP POLICY IF EXISTS "admins_manage_student_fees" ON public.student_fees;
DROP POLICY IF EXISTS "all_auth_read_student_fees" ON public.student_fees;

-- Parents can read their own child's fee records
CREATE POLICY "parents_read_own_student_fees"
ON public.student_fees FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.parents p
    JOIN public.parent_student_link psl ON psl.parent_id = p.id
    WHERE p.user_id = auth.uid()
      AND psl.student_id = public.student_fees.student_id
  )
);

-- Principal and super_admin can manage all fee records
CREATE POLICY "admins_manage_student_fees"
ON public.student_fees FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('principal', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('principal', 'super_admin')
  )
);

-- ═══════════════════════════════════════════════════════════════
-- FIX: fee_payments RLS for parents
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_read_own_fee_payments" ON public.fee_payments;
DROP POLICY IF EXISTS "admins_manage_fee_payments" ON public.fee_payments;

-- Parents can read their own child's payment history
CREATE POLICY "parents_read_own_fee_payments"
ON public.fee_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.parents p
    JOIN public.parent_student_link psl ON psl.parent_id = p.id
    WHERE p.user_id = auth.uid()
      AND psl.student_id = public.fee_payments.student_id
  )
);

-- Principal can manage all fee payments
CREATE POLICY "admins_manage_fee_payments"
ON public.fee_payments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('principal', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('principal', 'super_admin')
  )
);

-- Authenticated staff can also insert payments (for fee collection officers)
DROP POLICY IF EXISTS "staff_insert_fee_payments" ON public.fee_payments;
CREATE POLICY "staff_insert_fee_payments"
ON public.fee_payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('principal', 'super_admin', 'teacher')
  )
);
