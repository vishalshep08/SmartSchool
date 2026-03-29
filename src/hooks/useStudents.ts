import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Student = Tables<'students'> & {
  classes?: Tables<'classes'> | null;
};

export function useStudents(classId?: string) {
  const queryClient = useQueryClient();

  const { data: students, isLoading, error, refetch } = useQuery({
    queryKey: ['students', classId],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('*, classes(*)')
        .order('full_name');

      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
  });

  const createStudent = useMutation({
    mutationFn: async (student: TablesInsert<'students'>) => {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateStudent = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'students'> & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      // PERMANENT DELETION - This will remove the student completely
      // Note: If you have related tables (attendance, grades, etc.) with foreign keys,
      // make sure they have ON DELETE CASCADE set up in your database,
      // or delete those records first manually
      
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student permanently deleted from all records!', {
        description: 'The student has been removed from the database.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete student', {
        description: error.message,
      });
    },
  });

  return {
    students: students || [],
    isLoading,
    error,
    refetch,
    createStudent,
    updateStudent,
    deleteStudent,
  };
}

export function useClasses() {
  const queryClient = useQueryClient();

  const { data: classes, isLoading, error, refetch } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('grade')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  return {
    classes: classes || [],
    isLoading,
    error,
    refetch,
  };
}