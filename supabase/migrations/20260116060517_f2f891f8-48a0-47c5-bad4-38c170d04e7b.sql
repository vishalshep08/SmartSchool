-- Create student academic history table for tracking promotions
CREATE TABLE public.student_academic_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id),
  academic_year TEXT NOT NULL,
  promoted_from_class_id UUID REFERENCES public.classes(id),
  promoted_on DATE,
  attendance_percentage NUMERIC(5,2),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_academic_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Principals can manage student history" 
ON public.student_academic_history 
FOR ALL 
USING (has_role(auth.uid(), 'principal'));

CREATE POLICY "Teachers can view student history" 
ON public.student_academic_history 
FOR SELECT 
USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Parents can view own child history" 
ON public.student_academic_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM students 
  WHERE students.id = student_academic_history.student_id 
  AND students.parent_user_id = auth.uid()
));

-- Create indexes
CREATE INDEX idx_student_academic_history_student ON public.student_academic_history(student_id);
CREATE INDEX idx_student_academic_history_year ON public.student_academic_history(academic_year);

-- Create timetable_settings table for customizable periods
CREATE TABLE public.timetable_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_type TEXT NOT NULL, -- 'period', 'break', 'day'
  name TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  day_of_week INTEGER, -- For days: 1-7
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view timetable settings" 
ON public.timetable_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Principals can manage timetable settings" 
ON public.timetable_settings 
FOR ALL 
USING (has_role(auth.uid(), 'principal'));

-- Insert default periods
INSERT INTO public.timetable_settings (setting_type, name, start_time, end_time, display_order) VALUES
('period', 'Period 1', '08:00', '08:45', 1),
('period', 'Period 2', '08:50', '09:35', 2),
('period', 'Period 3', '09:40', '10:25', 3),
('break', 'Short Break', '10:30', '10:45', 4),
('period', 'Period 4', '10:45', '11:30', 5),
('period', 'Period 5', '11:35', '12:20', 6),
('period', 'Period 6', '12:25', '13:10', 7),
('break', 'Lunch Break', '13:15', '14:00', 8),
('period', 'Period 7', '14:00', '14:45', 9),
('period', 'Period 8', '14:50', '15:30', 10);

-- Insert default days
INSERT INTO public.timetable_settings (setting_type, name, day_of_week, display_order) VALUES
('day', 'Monday', 1, 1),
('day', 'Tuesday', 2, 2),
('day', 'Wednesday', 3, 3),
('day', 'Thursday', 4, 4),
('day', 'Friday', 5, 5),
('day', 'Saturday', 6, 6);