import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreateTeacherData {
  fullName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  subject: string;
  qualification?: string;
  experienceYears?: number;
  salaryAmount?: number;
  joiningDate?: string;
  systemRole?: 'teacher' | 'staff';
  designation?: string;
}

export interface CreatedTeacher {
  id: string;
  userId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  qualification: string | null;
  experienceYears: number;
  salaryAmount: number;
  joiningDate: string;
  defaultPassword: string;
  status: string;
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();

  const createTeacher = useMutation({
    mutationFn: async (data: CreateTeacherData): Promise<CreatedTeacher> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to create teachers');
      }

      const response = await supabase.functions.invoke('create-teacher', {
        body: data,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create teacher');
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create teacher');
      }

      return response.data.teacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-profiles'] });
      toast.success('Teacher account created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { createTeacher };
}

// CSV Export utility for teacher credentials
export function exportTeachersToCSV(teachers: CreatedTeacher[]) {
  const headers = [
    'Full Name',
    'Employee ID',
    'Email',
    'Phone',
    'Subject',
    'Default Password',
    'Joining Date',
    'Status'
  ];

  const rows = teachers.map(t => [
    t.fullName,
    t.employeeId,
    t.email,
    t.phone || '',
    t.subject,
    t.defaultPassword,
    t.joiningDate,
    t.status
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `teacher_credentials_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export single teacher
export function exportSingleTeacherCSV(teacher: CreatedTeacher) {
  exportTeachersToCSV([teacher]);
}
