import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type TimetableSlot = any;

export function useTimetable(classId?: string) {
  const queryClient = useQueryClient();

  /* ------------------ REALTIME ------------------ */
  useRealtimeSubscription({
    table: 'timetable',
    filter: classId ? `class_id=eq.${classId}` : undefined,
    onChange: () => {
      queryClient.invalidateQueries({
        queryKey: ['timetable', classId],
      });
    },
  });

  /* ------------------ QUERY ------------------ */
  const { data, isLoading, error } = useQuery({
    queryKey: ['timetable', classId],
    enabled: !!classId,
    queryFn: async () => {
      let query = (supabase as any)
        .from('timetable')
        .select('*, classes(*), employees(*)')
        .order('day_of_week')
        .order('start_time');

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TimetableSlot[];
    },
  });

  /* ------------------ CREATE ------------------ */
  const createSlot = useMutation({
    mutationFn: async (slot: TablesInsert<'timetable'>) => {
      const { data, error } = await supabase
        .from('timetable')
        .insert(slot)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['timetable', classId],
      });
      toast.success('Timetable slot added!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /* ------------------ UPDATE ------------------ */
  const updateSlot = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'timetable'> & { id: string }) => {
      const { data, error } = await supabase
        .from('timetable')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['timetable', classId],
      });
      toast.success('Timetable updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /* ------------------ DELETE ------------------ */
  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['timetable', classId],
      });
      toast.success('Timetable slot removed!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    timetable: data || [],
    isLoading,
    error,
    createSlot,
    updateSlot,
    deleteSlot,
  };
}
