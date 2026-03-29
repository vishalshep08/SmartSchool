import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type LeaveType = 'casual' | 'sick' | 'earned' | 'emergency' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface TeacherLeave {
  id: string;
  teacher_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  approved_by: string | null;
  approval_notes: string | null;
  created_at: string;
  updated_at: string;
  teachers?: {
    id: string;
    employee_id: string;
    subject: string;
    user_id: string;
  };
  profiles?: {
    full_name: string;
    email: string;
  };
  approver_profile?: {
    full_name: string;
    email: string;
  };
}

export interface CreateLeaveData {
  teacher_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
}

export function useLeaves() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  // Fetch leaves - for principal: all leaves, for teacher: own leaves
  const { data: leaves, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-leaves', role],
    queryFn: async () => {
      let teacherId = null;
      if (role === 'teacher') {
        const { data: teacherRecord } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user!.id)
          .single();

        if (!teacherRecord) {
          return [];
        }
        teacherId = teacherRecord.id;
      }

      let query = supabase
        .from('teacher_leaves')
        .select(`*, teachers!inner(id, employee_id, subject, user_id)`)
        .order('created_at', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Get teacher names from profiles
      const teacherUserIds = data?.map(l => l.teachers?.user_id).filter(Boolean) || [];
      const approverUserIds = data?.map(l => l.approved_by).filter(Boolean) || [];
      const allUserIds = [...new Set([...teacherUserIds, ...approverUserIds])];
      
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', allUserIds);

        return data?.map(leave => ({
          ...leave,
          profiles: profiles?.find(p => p.user_id === leave.teachers?.user_id),
          approver_profile: leave.approved_by 
            ? profiles?.find(p => p.user_id === leave.approved_by)
            : null
        })) || [];
      }

      return data || [];
    },
    enabled: !!user,
  });

  // Create leave request
  const createLeave = useMutation({
    mutationFn: async (leaveData: CreateLeaveData) => {
      const { data, error } = await supabase
        .from('teacher_leaves')
        .insert(leaveData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leaves'] });
      toast.success('Leave request submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update leave status (for principal approval/rejection)
  // Now correctly stores auth.uid() in approved_by (references auth.users.id)
  const updateLeaveStatus = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      approval_notes 
    }: { 
      id: string; 
      status: LeaveStatus; 
      approval_notes?: string 
    }) => {
      if (!user?.id) {
        throw new Error('You must be logged in to approve/reject leaves');
      }

      const { data, error } = await supabase
        .from('teacher_leaves')
        .update({ 
          status, 
          approval_notes,
          approved_by: user.id // This is now auth.uid() which references auth.users(id)
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Leave update error:', error);
        throw new Error(`Failed to update leave: ${error.message}`);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leaves'] });
      toast.success(`Leave request ${variables.status}!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Cancel leave (for teachers - only pending leaves)
  const cancelLeave = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('teacher_leaves')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leaves'] });
      toast.success('Leave request cancelled!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    leaves: leaves || [],
    isLoading,
    error,
    refetch,
    createLeave,
    updateLeaveStatus,
    cancelLeave,
  };
}
