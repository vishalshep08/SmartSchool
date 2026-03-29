import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentData } from './useParentData';

export function useParentDashboardData(studentId?: string) {
  const { parentRecord } = useParentData();

  const today = new Date().toISOString().split('T')[0];

  // Today's attendance
  const { data: todayAttendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ['parent-attendance-today', studentId, today],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from('student_attendance')
        .select('status, remarks')
        .eq('student_id', studentId)
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Unread homework count
  const { data: unreadHomeworkCount = 0, isLoading: loadingHomework } = useQuery({
    queryKey: ['parent-unread-homework', studentId, parentRecord?.id],
    queryFn: async () => {
      if (!studentId || !parentRecord?.id) return 0;
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', studentId)
        .single();
      if (!student?.class_id) return 0;

      const { data: homework } = await supabase
        .from('homework')
        .select('id')
        .eq('class_id', student.class_id);
      if (!homework || homework.length === 0) return 0;

      const { data: readStatuses } = await supabase
        .from('homework_read_status')
        .select('homework_id')
        .eq('parent_id', parentRecord.id);

      const readIds = new Set(readStatuses?.map(r => r.homework_id) || []);
      return homework.filter(h => !readIds.has(h.id)).length;
    },
    enabled: !!studentId && !!parentRecord?.id,
  });

  // Pending leave requests count
  const { data: pendingLeaveCount = 0, isLoading: loadingLeaves } = useQuery({
    queryKey: ['parent-pending-leaves', studentId, parentRecord?.id],
    queryFn: async () => {
      if (!studentId || !parentRecord?.id) return 0;
      const { count, error } = await supabase
        .from('student_leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('parent_id', parentRecord.id)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!studentId && !!parentRecord?.id,
  });

  // Unread remarks count
  const { data: unreadRemarksCount = 0, isLoading: loadingRemarks } = useQuery({
    queryKey: ['parent-unread-remarks', studentId],
    queryFn: async () => {
      if (!studentId) return 0;
      const { count, error } = await supabase
        .from('student_remarks')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('is_read_by_parent', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!studentId,
  });

  // Recent activity
  const { data: recentActivity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['parent-recent-activity', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const activities: Array<{ id: string; icon: string; text: string; time: string }> = [];

      const { data: student } = await supabase
        .from('students')
        .select('class_id, full_name')
        .eq('id', studentId)
        .single();

      // Recent attendance
      const { data: recentAtt } = await supabase
        .from('student_attendance')
        .select('id, date, status')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(3);

      recentAtt?.forEach(a => {
        const label = a.status === 'present' ? 'Present' : a.status === 'absent' ? 'Absent' : a.status === 'half_day' ? 'Half Day' : a.status;
        activities.push({ id: `att-${a.id}`, icon: 'attendance', text: `Attendance marked: ${label}`, time: a.date });
      });

      // Recent homework
      if (student?.class_id) {
        const { data: recentHw } = await supabase
          .from('homework')
          .select('id, subject, due_date, created_at')
          .eq('class_id', student.class_id)
          .order('created_at', { ascending: false })
          .limit(3);

        recentHw?.forEach(h => {
          activities.push({ id: `hw-${h.id}`, icon: 'homework', text: `New homework for ${h.subject} — Due ${h.due_date}`, time: h.created_at });
        });
      }

      // Recent remarks
      const { data: recentRemarks } = await supabase
        .from('student_remarks')
        .select('id, title, category, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(2);

      recentRemarks?.forEach(r => {
        activities.push({ id: `rem-${r.id}`, icon: 'remark', text: `New remark: ${r.title}`, time: r.created_at });
      });

      // Recent leave status changes
      const { data: recentLeaves } = await supabase
        .from('student_leave_requests')
        .select('id, status, from_date, to_date, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(2);

      recentLeaves?.forEach(l => {
        const statusText = l.status === 'approved' ? 'approved' : l.status === 'rejected' ? 'rejected' : 'submitted';
        activities.push({ id: `leave-${l.id}`, icon: 'leave', text: `Leave request ${statusText} (${l.from_date} to ${l.to_date})`, time: l.created_at });
      });

      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      return activities.slice(0, 5);
    },
    enabled: !!studentId,
  });

  return {
    todayAttendance,
    unreadHomeworkCount,
    pendingLeaveCount,
    unreadRemarksCount,
    recentActivity,
    isLoading: loadingAttendance || loadingHomework || loadingActivity || loadingLeaves || loadingRemarks,
  };
}
