import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export function useEvents(filters?: { classId?: string; status?: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      const now = new Date().toISOString().split('T')[0];
      if (filters?.status === 'upcoming') {
        query = query.gte('start_date', now);
      } else if (filters?.status === 'past') {
        query = query.lt('start_date', now);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  useRealtimeSubscription({
    table: 'events',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const createEvent = useMutation({
    mutationFn: async (event: { title: string; description?: string | null; start_date: string; created_by?: string | null }) => {
      const { data, error } = await supabase.from('events').insert(event).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Event created successfully!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string | null; start_date?: string }) => {
      const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Event deleted!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { events: data || [], isLoading, error, refetch, createEvent, updateEvent, deleteEvent };
}

export function useUpcomingEvents(limit = 5) {
  const queryClient = useQueryClient();
  const now = new Date().toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });

  useRealtimeSubscription({
    table: 'events',
    onChange: () => queryClient.invalidateQueries({ queryKey: ['upcoming-events'] }),
  });

  return { events: data || [], isLoading };
}
