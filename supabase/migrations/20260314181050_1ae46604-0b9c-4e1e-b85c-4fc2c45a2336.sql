
-- Student leave requests table
CREATE TABLE IF NOT EXISTS public.student_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  leave_type text NOT NULL DEFAULT 'personal',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  teacher_note text,
  reviewed_by_teacher_id uuid REFERENCES public.teachers(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_leave_requests ENABLE ROW LEVEL SECURITY;

-- Parents can view their own requests
CREATE POLICY "Parents can view own leave requests" ON public.student_leave_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parents p WHERE p.id = student_leave_requests.parent_id AND p.user_id = auth.uid()));

-- Parents can insert own requests
CREATE POLICY "Parents can insert own leave requests" ON public.student_leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM parents p WHERE p.id = student_leave_requests.parent_id AND p.user_id = auth.uid()));

-- Parents can update own pending requests (cancel)
CREATE POLICY "Parents can cancel own pending requests" ON public.student_leave_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM parents p WHERE p.id = student_leave_requests.parent_id AND p.user_id = auth.uid()) AND status = 'pending');

-- Class teachers can view requests for their class
CREATE POLICY "Class teachers can view class leave requests" ON public.student_leave_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teacher_class_assignments tca
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE tca.class_id = student_leave_requests.class_id
    AND tca.is_class_teacher = true
    AND t.user_id = auth.uid()
  ));

-- Class teachers can update (approve/reject) requests for their class
CREATE POLICY "Class teachers can review class leave requests" ON public.student_leave_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teacher_class_assignments tca
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE tca.class_id = student_leave_requests.class_id
    AND tca.is_class_teacher = true
    AND t.user_id = auth.uid()
  ));

-- Principals can manage all
CREATE POLICY "Principals can manage student leave requests" ON public.student_leave_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'principal'));

-- Document requests table
CREATE TABLE IF NOT EXISTS public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  other_description text,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  admin_note text,
  document_url text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  downloaded_at timestamptz
);

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Parents can view own requests
CREATE POLICY "Parents can view own document requests" ON public.document_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM parents p WHERE p.id = document_requests.parent_id AND p.user_id = auth.uid()));

-- Parents can insert own requests
CREATE POLICY "Parents can insert document requests" ON public.document_requests
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM parents p WHERE p.id = document_requests.parent_id AND p.user_id = auth.uid()));

-- Parents can update own (for downloaded_at)
CREATE POLICY "Parents can update own document requests" ON public.document_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM parents p WHERE p.id = document_requests.parent_id AND p.user_id = auth.uid()));

-- Principals can manage all
CREATE POLICY "Principals can manage document requests" ON public.document_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'principal'));

-- Add is_read_by_parent to student_remarks if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_remarks' AND column_name = 'is_read_by_parent') THEN
    ALTER TABLE public.student_remarks ADD COLUMN is_read_by_parent boolean DEFAULT false;
    ALTER TABLE public.student_remarks ADD COLUMN read_at timestamptz;
  END IF;
END $$;

-- Parents can view own child remarks
CREATE POLICY "Parents can view child remarks" ON public.student_remarks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_remarks.student_id AND s.parent_user_id = auth.uid()));

-- Parents can update read status
CREATE POLICY "Parents can mark remarks as read" ON public.student_remarks
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_remarks.student_id AND s.parent_user_id = auth.uid()));

-- Allow service role and principals to insert notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow inserting notifications for any authenticated user (needed for cross-user notifications)
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
