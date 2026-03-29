import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

// Email notification helper - sends attendance notifications automatically
async function sendAttendanceEmail(
  records: TablesInsert<'student_attendance'>[],
  classId: string,
) {
  try {
    const studentIds = records.map(r => r.student_id);
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, parent_email, class_id, classes(name, section)')
      .in('id', studentIds);

    if (!students || students.length === 0) return;

    const { data: classInfo } = await supabase
      .from('classes')
      .select('name, section')
      .eq('id', classId)
      .single();

    const className = classInfo ? `${classInfo.name}${classInfo.section ? ` - ${classInfo.section}` : ''}` : 'Class';
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const statusGroups: Record<string, Array<{ to: string; studentId: string; studentName: string; className: string }>> = {};
    for (const record of records) {
      const student = students.find(s => s.id === record.student_id);
      if (student?.parent_email) {
        const status = record.status || 'present';
        if (!statusGroups[status]) statusGroups[status] = [];
        statusGroups[status].push({
          to: student.parent_email,
          studentId: student.id,
          studentName: student.full_name,
          className,
        });
      }
    }

    for (const [status, recs] of Object.entries(statusGroups)) {
      if (recs.length === 0) continue;
      await supabase.functions.invoke('send-email-notification', {
        body: {
          type: 'attendance',
          recipients: recs,
          subject: `Attendance Update – ${today}`,
          metadata: { status, date: today, className },
        },
      });
    }
  } catch (error) {
    console.error('Failed to send attendance email notifications:', error);
    // Don't throw — attendance save should not fail due to email errors
  }
}

type AttendanceStatus = Database['public']['Enums']['attendance_status'];

export type StudentAttendance = Tables<'student_attendance'> & {
  students?: Tables<'students'> | null;
};

export type TeacherAttendance = any;

export function useStudentAttendance(classId: string, date: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-attendance', classId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*, students(*)')
        .eq('class_id', classId)
        .eq('date', date);
      if (error) throw error;
      return data as StudentAttendance[];
    },
    enabled: !!classId && !!date,
  });

  useRealtimeSubscription({
    table: 'student_attendance',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
    },
  });

  const markAttendance = useMutation({
    mutationFn: async (records: TablesInsert<'student_attendance'>[]) => {
      await supabase
        .from('student_attendance')
        .delete()
        .eq('class_id', classId)
        .eq('date', date);

      const { data, error } = await supabase
        .from('student_attendance')
        .insert(records)
        .select();
      if (error) throw error;
      return { data, records };
    },
    onSuccess: async ({ records }) => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Attendance saved successfully!');

      // Auto-send email notifications (5-second delay for undo buffer)
      toast.info('Email notifications will be sent in 5 seconds...', { duration: 5000 });
      setTimeout(() => {
        sendAttendanceEmail(records, classId);
      }, 5000);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAttendance = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'student_attendance'> & { id: string }) => {
      const { data, error } = await supabase
        .from('student_attendance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { attendance: data || [], isLoading, error, refetch, markAttendance, updateAttendance };
}

export function useTeacherAttendance(date: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-attendance', date],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('teacher_attendance')
        .select('*, employees(*)')
        .eq('date', date);
      if (error) throw error;
      return data as TeacherAttendance[];
    },
    enabled: !!date,
  });

  useRealtimeSubscription({
    table: 'teacher_attendance',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
    },
  });

  const markTeacherAttendance = useMutation({
    mutationFn: async (records: TablesInsert<'teacher_attendance'>[]) => {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .upsert(records, { onConflict: 'teacher_id,date' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
      toast.success('Teacher attendance saved!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { attendance: data || [], isLoading, error, refetch, markTeacherAttendance };
}
