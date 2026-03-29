import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type StaffMember = any;

export function useStaff() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const [{ data: teachers, error: teachersError }, { data: employees, error: employeesError }] = await Promise.all([
        (supabase as any).from('teachers').select('*'),
        (supabase as any).from('employees').select('*')
      ]);

      if (teachersError) throw teachersError;
      if (employeesError) throw employeesError;

      const userIds = [
        ...(teachers || []).map(t => t.user_id),
        ...(employees || []).map(e => e.user_id)
      ].filter(Boolean);

      const classIds = [
        ...(teachers || []).map(t => t.assigned_class_id),
        ...(employees || []).map(e => e.assigned_class_id)
      ].filter(Boolean);

      const [{ data: profiles }, { data: classes }] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('*').in('user_id', userIds) : Promise.resolve({ data: [] }),
        classIds.length > 0 ? supabase.from('classes').select('*').in('id', classIds) : Promise.resolve({ data: [] }),
      ]);

      const mergedTeachers = (teachers || []).map(t => ({
        ...t,
        source_table: 'teachers',
        employee_type: 'Teaching',
        profile: profiles?.find(p => p.user_id === t.user_id) || null,
        assignedClass: classes?.find(c => c.id === t.assigned_class_id) || null,
      }));

      const mergedEmployees = (employees || []).map(e => ({
        ...e,
        source_table: 'employees',
        employee_type: e.employee_type || 'Non-Teaching',
        profile: profiles?.find(p => p.user_id === e.user_id) || null,
        assignedClass: classes?.find(c => c.id === e.assigned_class_id) || null,
      }));

      return [...mergedTeachers, ...mergedEmployees].sort((a, b) => {
        const nameA = a.profile?.full_name || '';
        const nameB = b.profile?.full_name || '';
        return nameA.localeCompare(nameB);
      }) as StaffMember[];
    },
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, source_table, ...updates }: any) => {
      const table = source_table === 'teachers' ? 'teachers' : 'employees';
      const { data, error } = await (supabase as any)
        .from(table)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff updated successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active, source_table }: { id: string; is_active: boolean; source_table?: string }) => {
      const table = source_table === 'teachers' ? 'teachers' : 'employees';
      const { error } = await (supabase as any)
        .from(table)
        .update({ status: is_active ? 'Active' : 'Inactive', is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    staff: (data || []) as StaffMember[],
    isLoading,
    error,
    refetch,
    updateStaff,
    toggleActive,
  };
}
