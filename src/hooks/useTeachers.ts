import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Teacher = any;

export function useTeachers() {
  const queryClient = useQueryClient();

  const { data: teachers, isLoading, error, refetch } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('employee_type', 'Teaching')
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const createTeacher = useMutation({
    mutationFn: async (teacher: any) => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .insert({ ...teacher, employee_type: 'Teaching' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('employees')
        .update({ status: 'Inactive' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher removed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    teachers: teachers || [],
    isLoading,
    error,
    refetch,
    createTeacher,
    updateTeacher,
    deleteTeacher,
  };
}

export function useTeacherProfiles() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-profiles'],
    queryFn: async () => {
      const { data: teachers, error: teachersError } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('status', 'Active');

      if (teachersError) throw teachersError;

      const userIds = teachers?.map((t: any) => t.user_id) || [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return teachers?.map((teacher: any) => ({
        ...teacher,
        profile: profiles?.find(p => p.user_id === teacher.user_id),
      })) || [];
    },
  });

  return {
    teacherProfiles: data || [],
    isLoading,
    error,
  };
}
