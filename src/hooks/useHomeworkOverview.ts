import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export interface HomeworkOverview {
  total_assigned: number;
  total_submissions: number;
  pending_submissions: number;
  submission_rate: number;
}

export interface HomeworkClassBreakdown {
  class_name: string;
  total_assigned: number;
  total_submitted: number;
  submission_rate: number;
}

export function useHomeworkOverview() {
  const queryClient = useQueryClient();

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['homework-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_homework_overview');
      if (error) throw error;
      return data as unknown as HomeworkOverview;
    },
  });

  const { data: classBreakdown, isLoading: classLoading, error: classError } = useQuery({
    queryKey: ['homework-overview-by-class'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_homework_overview_by_class');
      if (error) throw error;
      return data as unknown as HomeworkClassBreakdown[];
    },
  });

  useRealtimeSubscription({
    table: 'homework',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-overview'] });
      queryClient.invalidateQueries({ queryKey: ['homework-overview-by-class'] });
    },
  });

  useRealtimeSubscription({
    table: 'homework_submissions',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-overview'] });
      queryClient.invalidateQueries({ queryKey: ['homework-overview-by-class'] });
    },
  });

  return {
    overview: overview || { total_assigned: 0, total_submissions: 0, pending_submissions: 0, submission_rate: 0 },
    classBreakdown: classBreakdown || [],
    isLoading: overviewLoading || classLoading,
    error: overviewError || classError,
  };
}
