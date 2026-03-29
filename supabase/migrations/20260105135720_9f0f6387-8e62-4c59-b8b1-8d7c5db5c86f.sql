-- Create whatsapp_logs table for tracking all WhatsApp messages
CREATE TABLE public.whatsapp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  parent_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('attendance', 'homework', 'notice', 'leave', 'remark', 'event', 'timetable', 'fee_reminder', 'custom')),
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_logs
CREATE POLICY "Principals can view all whatsapp logs"
ON public.whatsapp_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'principal'
  )
);

CREATE POLICY "Principals can manage whatsapp logs"
ON public.whatsapp_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'principal'
  )
);

-- Allow edge functions to insert/update logs (using service role)
CREATE POLICY "Service role can manage whatsapp logs"
ON public.whatsapp_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX idx_whatsapp_logs_message_type ON public.whatsapp_logs(message_type);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
CREATE INDEX idx_whatsapp_logs_student_id ON public.whatsapp_logs(student_id);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_logs_updated_at
BEFORE UPDATE ON public.whatsapp_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();