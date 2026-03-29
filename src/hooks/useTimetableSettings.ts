import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TimetableSetting {
  id: string;
  setting_type: 'period' | 'break' | 'day';
  name: string;
  start_time: string | null;
  end_time: string | null;
  day_of_week: number | null;
  is_active: boolean;
  display_order: number;
}

export function useTimetableSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['timetable-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as TimetableSetting[];
    },
  });

  const periods = data?.filter(s => s.setting_type === 'period' || s.setting_type === 'break') || [];
  const days = data?.filter(s => s.setting_type === 'day') || [];

  const createSetting = useMutation({
    mutationFn: async (setting: Omit<TimetableSetting, 'id'>) => {
      const { data, error } = await supabase
        .from('timetable_settings')
        .insert(setting)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-settings'] });
      toast.success('Setting added!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TimetableSetting> & { id: string }) => {
      const { data, error } = await supabase
        .from('timetable_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-settings'] });
      toast.success('Setting updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteSetting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('timetable_settings')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-settings'] });
      toast.success('Setting removed!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    settings: data || [],
    periods,
    days,
    isLoading,
    error,
    createSetting,
    updateSetting,
    deleteSetting,
  };
}
