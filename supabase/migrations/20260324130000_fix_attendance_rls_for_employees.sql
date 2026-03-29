-- Fix student_attendance RLS policies that reference teachers table.
-- After the employees migration, teacher_class_assignments.teacher_id now
-- references employees(id), not teachers(id). The JOIN must be updated accordingly.

-- Drop the stale policies that join on teachers
DROP POLICY IF EXISTS "Class teacher can insert attendance" ON public.student_attendance;
DROP POLICY IF EXISTS "Class teacher can update attendance" ON public.student_attendance;
DROP POLICY IF EXISTS "Class teacher can delete attendance" ON public.student_attendance;
DROP POLICY IF EXISTS "Teachers can view class attendance" ON public.student_attendance;

-- Re-create INSERT policy: join employees instead of teachers
CREATE POLICY "Class teacher can insert attendance"
ON public.student_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.employees e ON e.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND tca.is_class_teacher = true
    AND e.user_id = auth.uid()
  )
);

-- Re-create UPDATE policy
CREATE POLICY "Class teacher can update attendance"
ON public.student_attendance
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.employees e ON e.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND tca.is_class_teacher = true
    AND e.user_id = auth.uid()
  )
);

-- Re-create DELETE policy (needed for re-marking: delete then re-insert)
CREATE POLICY "Class teacher can delete attendance"
ON public.student_attendance
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.employees e ON e.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND tca.is_class_teacher = true
    AND e.user_id = auth.uid()
  )
);

-- Re-create SELECT policy for teachers viewing their assigned classes
CREATE POLICY "Teachers can view class attendance"
ON public.student_attendance
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.employees e ON e.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND e.user_id = auth.uid()
  )
);
