import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTeachers } from '@/hooks/useTeachers';

export interface TeacherPermissions {
  id: string;
  teacher_id: string;
  can_mark_attendance: boolean;
  can_assign_homework: boolean;
  can_add_remarks: boolean;
  can_view_reports: boolean;
  can_create_notices: boolean;
  can_view_timetable: boolean;
  can_raise_issues: boolean;
  can_manage_students: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface TeacherClassAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  is_class_teacher: boolean;
  assigned_at: string;
  assigned_by: string | null;
}

export function useTeacherPermissions(teacherId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['teacher-permissions', teacherId],
    enabled: !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_id', teacherId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as TeacherPermissions | null;
    },
  });

  const updatePermissions = useMutation({
    mutationFn: async (updates: Partial<TeacherPermissions> & { teacher_id: string }) => {
      const { teacher_id, ...permissionUpdates } = updates;
      
      const { data, error } = await supabase
        .from('teacher_permissions')
        .update({
          ...permissionUpdates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('teacher_id', teacher_id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-permissions'] });
      toast.success('Permissions updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    permissions,
    isLoading,
    updatePermissions,
  };
}

export function useAllTeacherPermissions() {
  const queryClient = useQueryClient();

  const { data: allPermissions = [], isLoading } = useQuery({
    queryKey: ['all-teacher-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_permissions')
        .select('*');
      
      if (error) throw error;
      return data as TeacherPermissions[];
    },
  });

  return {
    allPermissions,
    isLoading,
  };
}

export function useTeacherClassAssignments(teacherId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['teacher-class-assignments', teacherId],
    queryFn: async () => {
      let query = supabase
        .from('teacher_class_assignments')
        .select('*, classes(*)');
      
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const assignClass = useMutation({
    mutationFn: async (data: { teacher_id: string; class_id: string; is_class_teacher?: boolean }) => {
      const { data: result, error } = await supabase
        .from('teacher_class_assignments')
        .insert({
          ...data,
          assigned_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-class-assignments'] });
      toast.success('Class assigned successfully!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Teacher is already assigned to this class');
      } else {
        toast.error(error.message);
      }
    },
  });

  const removeAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('teacher_class_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-class-assignments'] });
      toast.success('Class assignment removed!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    assignments,
    isLoading,
    assignClass,
    removeAssignment,
  };
}

export function useCurrentTeacherPermissions() {
  const { user } = useAuth();
  const { teachers } = useTeachers();
  
  const currentTeacher = teachers.find(t => t.user_id === user?.id);
  const { permissions, isLoading } = useTeacherPermissions(currentTeacher?.id);
  const { assignments } = useTeacherClassAssignments(currentTeacher?.id);

  const assignedClassIds = assignments.map(a => a.class_id);

  return {
    currentTeacher,
    permissions,
    assignedClassIds,
    isLoading,
    hasPermission: (key: keyof TeacherPermissions) => {
      if (!permissions) return true; // Default to true if not loaded
      return permissions[key] as boolean;
    },
    hasClassAccess: (classId: string) => {
      if (!currentTeacher) return false;
      return assignedClassIds.includes(classId);
    },
  };
}
