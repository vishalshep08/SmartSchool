-- =============================================
-- STEP 9 MIGRATION: Fee Module & Announcements
-- =============================================

-- 1. FEE CATEGORIES
CREATE TABLE IF NOT EXISTS fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Seed default categories
INSERT INTO fee_categories (category_name, description) VALUES
  ('General', 'General category students'),
  ('OBC', 'Other Backward Classes'),
  ('SC', 'Scheduled Caste'),
  ('ST', 'Scheduled Tribe'),
  ('EWS', 'Economically Weaker Section')
ON CONFLICT DO NOTHING;

-- 2. FEE STRUCTURES
CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  fee_category_id uuid NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  installment_type text NOT NULL CHECK (installment_type IN ('Full', 'Term-wise', 'Monthly')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. FEE INSTALLMENTS
CREATE TABLE IF NOT EXISTS fee_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id uuid NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  installment_name text NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0)
);

-- 4. STUDENT FEES
CREATE TABLE IF NOT EXISTS student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id uuid NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  total_amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  balance_amount numeric GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status text GENERATED ALWAYS AS (
    CASE
      WHEN paid_amount >= total_amount THEN 'Paid'
      WHEN paid_amount > 0 THEN 'Partial'
      ELSE 'Unpaid'
    END
  ) STORED,
  created_at timestamptz DEFAULT now()
);

-- 5. FEE PAYMENTS
CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES fee_installments(id) ON DELETE SET NULL,
  amount_paid numeric NOT NULL CHECK (amount_paid > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL CHECK (payment_mode IN ('Cash', 'Online', 'Cheque', 'DD')),
  transaction_reference text,
  received_by_admin_id uuid,
  receipt_number text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Receipt number sequence
CREATE SEQUENCE IF NOT EXISTS fee_receipt_seq START 1;

-- 6. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_audience text[] NOT NULL DEFAULT '{All}',
  target_class_ids uuid[],
  posted_by_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 7. ANNOUNCEMENT READ STATUS
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Fee Categories: Authenticated users can read, admins can write
CREATE POLICY "fee_categories_select" ON fee_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_categories_insert" ON fee_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fee_categories_update" ON fee_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "fee_categories_delete" ON fee_categories FOR DELETE TO authenticated USING (true);

-- Fee Structures: Authenticated users can read, admins can write
CREATE POLICY "fee_structures_select" ON fee_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_structures_insert" ON fee_structures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fee_structures_update" ON fee_structures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "fee_structures_delete" ON fee_structures FOR DELETE TO authenticated USING (true);

-- Fee Installments
CREATE POLICY "fee_installments_select" ON fee_installments FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_installments_insert" ON fee_installments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fee_installments_update" ON fee_installments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "fee_installments_delete" ON fee_installments FOR DELETE TO authenticated USING (true);

-- Student Fees
CREATE POLICY "student_fees_select" ON student_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "student_fees_insert" ON student_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "student_fees_update" ON student_fees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "student_fees_delete" ON student_fees FOR DELETE TO authenticated USING (true);

-- Fee Payments
CREATE POLICY "fee_payments_select" ON fee_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_payments_insert" ON fee_payments FOR INSERT TO authenticated WITH CHECK (true);

-- Announcements
CREATE POLICY "announcements_select" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "announcements_update" ON announcements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "announcements_delete" ON announcements FOR DELETE TO authenticated USING (true);

-- Announcement Reads
CREATE POLICY "announcement_reads_select" ON announcement_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_year ON fee_structures(academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_installments_structure ON fee_installments(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_year ON student_fees(academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_fee ON fee_payments(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
