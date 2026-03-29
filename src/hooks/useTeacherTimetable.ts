import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuth } from '@/contexts/AuthContext';

export interface TeacherTimetableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string | null;
  class_id: string;
  teacher_id: string | null;
  classes: {
    id: string;
    name: string;
    section: string | null;
    grade: number;
  } | null;
}

export function useTeacherTimetable(teacherId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Subscribe to real-time updates
  useRealtimeSubscription({
    table: 'timetable',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-timetable', teacherId] });
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-timetable', teacherId],
    enabled: !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable')
        .select('*, classes(id, name, section, grade)')
        .eq('teacher_id', teacherId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data as TeacherTimetableSlot[];
    },
  });

  // Group by day for easier rendering
  const groupedByDay = (data || []).reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, TeacherTimetableSlot[]>);

  return {
    timetable: data || [],
    groupedByDay,
    isLoading,
    error,
  };
}

// Hook to get current teacher's ID based on logged in user
export function useCurrentTeacherId() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['current-teacher-id', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('id')
        .eq('user_id', user!.id)
        .eq('status', 'Active')
        .single();

      if (error) return null;
      return data?.id;
    },
  });

  return { teacherId: data, isLoading };
}
