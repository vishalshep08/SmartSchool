import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  performed_by: string | null;
  role: string;
  reference_id: string | null;
  created_at: string;
}

export function useActivityLogs(roleFilter?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activity-logs', roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  useRealtimeSubscription({
    table: 'activity_logs' as any,
    onChange: () => queryClient.invalidateQueries({ queryKey: ['activity-logs'] }),
  });

  return { activities: data || [], isLoading, error, refetch };
}

export function useLogActivity() {
  const logActivity = useMutation({
    mutationFn: async (params: {
      action_type: string;
      description: string;
      performed_by?: string;
      role: string;
      reference_id?: string;
    }) => {
      const { error } = await supabase.from('activity_logs').insert({
        action_type: params.action_type,
        description: params.description,
        performed_by: params.performed_by || null,
        role: params.role,
        reference_id: params.reference_id || null,
      });
      if (error) throw error;
    },
  });

  return { logActivity };
}
