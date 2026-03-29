import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useQueryClient } from '@tanstack/react-query';

export interface DashboardFilters {
  classId?: string;
  date?: string; // YYYY-MM-DD
  nameSearch?: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingHomework: number;
  openIssues: number;
  upcomingEvents: number;
}

export function useDashboardStats(filters?: DashboardFilters) {
  const queryClient = useQueryClient();
  const selectedDate = filters?.date || new Date().toISOString().split('T')[0];
  const classId = filters?.classId;
  const nameSearch = filters?.nameSearch;

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats', selectedDate, classId, nameSearch],
    queryFn: async (): Promise<DashboardStats> => {
      // Build queries with filters
      let studentsQuery = supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true);
      if (classId) studentsQuery = studentsQuery.eq('class_id', classId);

      let teachersQuery = (supabase as any).from('employees').select('id', { count: 'exact', head: true }).eq('employee_type', 'Teaching').eq('status', 'Active');

      const classesQuery = supabase.from('classes').select('id', { count: 'exact', head: true });

      let attendanceQuery = supabase.from('student_attendance').select('status').eq('date', selectedDate);
      if (classId) attendanceQuery = attendanceQuery.eq('class_id', classId);

      let homeworkQuery = supabase.from('homework').select('id', { count: 'exact', head: true }).gte('due_date', new Date().toISOString().split('T')[0]);
      if (classId) homeworkQuery = homeworkQuery.eq('class_id', classId);

      const issuesQuery = supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'open');

      let eventsQuery = supabase.from('events').select('id', { count: 'exact', head: true }).gte('start_date', new Date().toISOString().split('T')[0]);

      const [
        studentsResult,
        teachersResult,
        classesResult,
        attendanceResult,
        homeworkResult,
        issuesResult,
        eventsResult,
      ] = await Promise.all([
        studentsQuery,
        teachersQuery,
        classesQuery,
        attendanceQuery,
        homeworkQuery,
        issuesQuery,
        eventsQuery,
      ]);

      const attendanceData = attendanceResult.data || [];
      const presentCount = attendanceData.filter(a => a.status === 'present').length;
      const absentCount = attendanceData.filter(a => a.status === 'absent').length;
      const lateCount = attendanceData.filter(a => a.status === 'late').length;

      return {
        totalStudents: studentsResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        totalClasses: classesResult.count || 0,
        presentToday: presentCount,
        absentToday: absentCount,
        lateToday: lateCount,
        pendingHomework: homeworkResult.count || 0,
        openIssues: issuesResult.count || 0,
        upcomingEvents: eventsResult.count || 0,
      };
    },
    staleTime: 30000,
  });

  useRealtimeSubscription({ table: 'student_attendance', onChange: () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }) });
  useRealtimeSubscription({ table: 'issues', onChange: () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }) });
  useRealtimeSubscription({ table: 'homework', onChange: () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }) });
  useRealtimeSubscription({ table: 'students', onChange: () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }) });
  useRealtimeSubscription({ table: 'events', onChange: () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }) });

  return {
    stats: stats || {
      totalStudents: 0, totalTeachers: 0, totalClasses: 0,
      presentToday: 0, absentToday: 0, lateToday: 0,
      pendingHomework: 0, openIssues: 0, upcomingEvents: 0,
    },
    isLoading,
    error,
    refetch,
  };
}
