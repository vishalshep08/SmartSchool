
-- 1. Drop overly permissive teacher attendance policy
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.student_attendance;

-- 2. Class teacher can insert attendance for their class
CREATE POLICY "Class teacher can insert attendance"
ON public.student_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.teachers t ON t.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND tca.is_class_teacher = true
    AND t.user_id = auth.uid()
  )
);

-- 3. Class teacher can update attendance for their class
CREATE POLICY "Class teacher can update attendance"
ON public.student_attendance
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.teachers t ON t.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND tca.is_class_teacher = true
    AND t.user_id = auth.uid()
  )
);

-- 4. Class teacher can delete attendance for their class (needed for re-marking)
CREATE POLICY "Class teacher can delete attendance"
ON public.student_attendance
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.teachers t ON t.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND tca.is_class_teacher = true
    AND t.user_id = auth.uid()
  )
);

-- 5. Teachers can view attendance for their assigned classes
CREATE POLICY "Teachers can view class attendance"
ON public.student_attendance
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.teachers t ON t.id = tca.teacher_id
    WHERE tca.class_id = student_attendance.class_id
    AND t.user_id = auth.uid()
  )
);
