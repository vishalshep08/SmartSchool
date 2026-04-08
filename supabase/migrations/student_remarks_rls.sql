-- ============================================================
-- RLS Policies for student_remarks table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Teachers can INSERT remarks for any student
CREATE POLICY "teachers_can_insert_remarks"
ON student_remarks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'teacher'
  )
);

-- 2. Teachers can read their OWN remarks
--    Principals, admins, super_admins can read ALL remarks
CREATE POLICY "teachers_can_read_own_remarks"
ON student_remarks FOR SELECT
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('principal', 'super_admin')
  )
);

-- 3. Teachers can DELETE their own remarks only
CREATE POLICY "teachers_can_delete_own_remarks"
ON student_remarks FOR DELETE
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- 4. Parents can READ remarks for their linked children
CREATE POLICY "parents_can_read_child_remarks"
ON student_remarks FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT psl.student_id
    FROM parent_student_link psl
    JOIN parents p ON p.id = psl.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- 5. Parents can UPDATE remarks (to mark as read)
CREATE POLICY "parents_can_mark_remarks_read"
ON student_remarks FOR UPDATE
TO authenticated
USING (
  student_id IN (
    SELECT psl.student_id
    FROM parent_student_link psl
    JOIN parents p ON p.id = psl.parent_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (true);
