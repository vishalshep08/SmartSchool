-- Migration to add RLS policies for class teachers to manage student leave requests

-- Drop existing if any to avoid conflicts
DROP POLICY IF EXISTS "class_teacher_can_view_class_leaves" ON student_leave_requests;
DROP POLICY IF EXISTS "class_teacher_can_update_class_leaves" ON student_leave_requests;

-- Enable RLS just in case (though it should already be enabled)
ALTER TABLE student_leave_requests ENABLE ROW LEVEL SECURITY;

-- Allow class teachers to view leave requests for their assigned class
CREATE POLICY "class_teacher_can_view_class_leaves"
ON student_leave_requests
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT class_id FROM teacher_class_assignments
    WHERE teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND is_class_teacher = true
  )
);

-- Allow class teachers to update (approve/reject) leave requests for their assigned class
CREATE POLICY "class_teacher_can_update_class_leaves"
ON student_leave_requests
FOR UPDATE
TO authenticated
USING (
  class_id IN (
    SELECT class_id FROM teacher_class_assignments
    WHERE teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND is_class_teacher = true
  )
);
