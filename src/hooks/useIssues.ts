import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/integrations/supabase/types';

export type Issue = Tables<'issues'>;
type IssueStatus = Database['public']['Enums']['issue_status'];

export function useIssues(statusFilter?: string) {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['issues', statusFilter, role],
    queryFn: async () => {
      let query = supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as IssueStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Issue[];
    },
  });

  useRealtimeSubscription({
    table: 'issues',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const createIssue = useMutation({
    mutationFn: async (issue: Omit<TablesInsert<'issues'>, 'raised_by'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('issues')
        .insert({ ...issue, raised_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Issue submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateIssue = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'issues'> & { id: string }) => {
      const { data, error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Issue updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resolveIssue = useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes: string }) => {
      const { data, error } = await supabase
        .from('issues')
        .update({ status: 'resolved', resolution_notes })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Issue resolved successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const rejectIssue = useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes?: string }) => {
      const { data, error } = await supabase
        .from('issues')
        .update({ status: 'rejected', resolution_notes })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Issue rejected!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const acceptIssue = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('issues')
        .update({ status: 'in_review' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue accepted for review!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    issues: data || [],
    isLoading,
    error,
    refetch,
    createIssue,
    updateIssue,
    resolveIssue,
    rejectIssue,
    acceptIssue,
  };
}
