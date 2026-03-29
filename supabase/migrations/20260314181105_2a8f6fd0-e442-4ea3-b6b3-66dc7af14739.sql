
-- Make the notification insert policy more specific
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'principal') OR
    has_role(auth.uid(), 'teacher') OR
    has_role(auth.uid(), 'parent')
  );
