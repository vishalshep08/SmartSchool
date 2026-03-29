-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('principal', 'teacher', 'parent');

-- Create enum for issue types
CREATE TYPE public.issue_type AS ENUM ('classroom', 'timetable', 'leave_request', 'technical');

-- Create enum for issue status
CREATE TYPE public.issue_status AS ENUM ('open', 'in_review', 'resolved', 'rejected');

-- Create enum for issue priority
CREATE TYPE public.issue_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'half_day');

-- Create enum for homework status
CREATE TYPE public.homework_status AS ENUM ('pending', 'submitted', 'graded', 'late');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT,
  grade INTEGER NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  employee_id TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  salary_amount DECIMAL(10,2) DEFAULT 0,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  blood_group TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create student_attendance table
CREATE TABLE public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  in_time TIME,
  out_time TIME,
  marked_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (student_id, date)
);

-- Create teacher_attendance table
CREATE TABLE public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  in_time TIME,
  out_time TIME,
  is_biometric BOOLEAN DEFAULT false,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (teacher_id, date)
);

-- Create homework table
CREATE TABLE public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  assigned_by UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create homework_submissions table
CREATE TABLE public.homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES public.homework(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  status homework_status NOT NULL DEFAULT 'pending',
  submission_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  grade TEXT,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (homework_id, student_id)
);

-- Create issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type issue_type NOT NULL,
  priority issue_priority NOT NULL DEFAULT 'medium',
  status issue_status NOT NULL DEFAULT 'open',
  raised_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create timetable table
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'event',
  start_date DATE NOT NULL,
  end_date DATE,
  is_holiday BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create salary_records table
CREATE TABLE public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  basic_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_on DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (teacher_id, month, year)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Principals can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'principal'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Principals can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for classes
CREATE POLICY "Authenticated users can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage classes" ON public.classes FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for teachers
CREATE POLICY "Teachers can view own record" ON public.teachers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Principals can manage teachers" ON public.teachers FOR ALL USING (public.has_role(auth.uid(), 'principal'));
CREATE POLICY "Authenticated can view teachers" ON public.teachers FOR SELECT TO authenticated USING (true);

-- RLS Policies for students
CREATE POLICY "Parents can view own children" ON public.students FOR SELECT USING (auth.uid() = parent_user_id);
CREATE POLICY "Teachers can view students" ON public.students FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Principals can manage students" ON public.students FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for student_attendance
CREATE POLICY "Parents can view child attendance" ON public.student_attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND parent_user_id = auth.uid())
);
CREATE POLICY "Teachers can manage attendance" ON public.student_attendance FOR ALL USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Principals can manage attendance" ON public.student_attendance FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for teacher_attendance
CREATE POLICY "Teachers can view own attendance" ON public.teacher_attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teachers WHERE id = teacher_id AND user_id = auth.uid())
);
CREATE POLICY "Principals can manage teacher attendance" ON public.teacher_attendance FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for homework
CREATE POLICY "Authenticated can view homework" ON public.homework FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage homework" ON public.homework FOR ALL USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Principals can manage homework" ON public.homework FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for homework_submissions
CREATE POLICY "Parents can view child submissions" ON public.homework_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND parent_user_id = auth.uid())
);
CREATE POLICY "Parents can submit homework" ON public.homework_submissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND parent_user_id = auth.uid())
);
CREATE POLICY "Teachers can manage submissions" ON public.homework_submissions FOR ALL USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Principals can manage submissions" ON public.homework_submissions FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for issues
CREATE POLICY "Users can view own issues" ON public.issues FOR SELECT USING (auth.uid() = raised_by);
CREATE POLICY "Users can create issues" ON public.issues FOR INSERT WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "Principals can manage all issues" ON public.issues FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for timetable
CREATE POLICY "Authenticated can view timetable" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage timetable" ON public.timetable FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for events
CREATE POLICY "Authenticated can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principals can manage events" ON public.events FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for salary_records
CREATE POLICY "Teachers can view own salary" ON public.salary_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teachers WHERE id = teacher_id AND user_id = auth.uid())
);
CREATE POLICY "Principals can manage salary" ON public.salary_records FOR ALL USING (public.has_role(auth.uid(), 'principal'));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Set REPLICA IDENTITY FULL for realtime tables
ALTER TABLE public.student_attendance REPLICA IDENTITY FULL;
ALTER TABLE public.teacher_attendance REPLICA IDENTITY FULL;
ALTER TABLE public.homework REPLICA IDENTITY FULL;
ALTER TABLE public.homework_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.issues REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homework_submissions_updated_at BEFORE UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();