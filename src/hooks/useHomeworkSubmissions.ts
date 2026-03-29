import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  parent_email: string | null;
  submission_text: string | null;
  submission_url: string | null;
  attachment_name: string | null;
  status: string;
  grade: string | null;
  feedback: string | null;
  remarks: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  students?: {
    id: string;
    full_name: string;
    admission_number: string;
  } | null;
}

export function useHomeworkSubmissions(homeworkId?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['homework-submissions', homeworkId],
    queryFn: async () => {
      if (!homeworkId) return [];
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*, students(id, full_name, admission_number)')
        .eq('homework_id', homeworkId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as HomeworkSubmission[];
    },
    enabled: !!homeworkId,
  });

  useRealtimeSubscription({
    table: 'homework_submissions',
    filter: homeworkId ? `homework_id=eq.${homeworkId}` : undefined,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-submissions', homeworkId] });
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['homework-overview'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.info('New submission received!');
    },
  });

  const markAsReviewed = useMutation({
    mutationFn: async ({ id, reviewed_by }: { id: string; reviewed_by: string }) => {
      const { error } = await supabase
        .from('homework_submissions')
        .update({ status: 'graded' as any, reviewed_at: new Date().toISOString(), reviewed_by })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-submissions'] });
      toast.success('Marked as reviewed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveGrade = useMutation({
    mutationFn: async ({ id, grade, remarks, reviewed_by }: { id: string; grade: string; remarks: string; reviewed_by: string }) => {
      const { error } = await supabase
        .from('homework_submissions')
        .update({
          grade,
          remarks,
          feedback: remarks,
          status: 'graded' as any,
          reviewed_at: new Date().toISOString(),
          reviewed_by,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-submissions'] });
      toast.success('Grade saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitted = data?.filter(s => s.status !== 'pending') || [];
  const pending = data?.filter(s => s.status === 'pending') || [];
  const reviewed = data?.filter(s => s.status === 'graded') || [];

  return {
    submissions: data || [],
    submitted,
    pending,
    reviewed,
    isLoading,
    error,
    refetch,
    markAsReviewed,
    saveGrade,
  };
}
