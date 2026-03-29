
-- Create homework_read_status table for tracking which parent has read which homework
CREATE TABLE public.homework_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(homework_id, parent_id)
);

ALTER TABLE public.homework_read_status ENABLE ROW LEVEL SECURITY;

-- Parents can view their own read status
CREATE POLICY "Parents can view own read status"
ON public.homework_read_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parents p
    WHERE p.id = homework_read_status.parent_id
    AND p.user_id = auth.uid()
  )
);

-- Parents can insert their own read status
CREATE POLICY "Parents can insert own read status"
ON public.homework_read_status
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.parents p
    WHERE p.id = homework_read_status.parent_id
    AND p.user_id = auth.uid()
  )
);

-- Principals can manage all read status
CREATE POLICY "Principals can manage read status"
ON public.homework_read_status
FOR ALL
USING (has_role(auth.uid(), 'principal'::app_role));

-- Service role full access
CREATE POLICY "Service role manage read status"
ON public.homework_read_status
FOR ALL
USING (auth.role() = 'service_role'::text);
