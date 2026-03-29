-- Add new columns to whatsapp_logs table for role-based tracking
ALTER TABLE public.whatsapp_logs 
ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system' CHECK (triggered_by IN ('system', 'teacher', 'admin')),
ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
ADD COLUMN IF NOT EXISTS is_queued BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id),
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_trigger_type ON public.whatsapp_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_triggered_by ON public.whatsapp_logs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_priority ON public.whatsapp_logs(priority);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_is_queued ON public.whatsapp_logs(is_queued) WHERE is_queued = true;