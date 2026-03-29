import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Email notification helper - sends homework notifications automatically
async function sendHomeworkEmail(homework: Tables<'homework'>, classId: string) {
  try {
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, parent_email')
      .eq('class_id', classId)
      .eq('is_active', true);

    if (!students || students.length === 0) return;

    const { data: classInfo } = await supabase
      .from('classes')
      .select('name, section')
      .eq('id', classId)
      .single();

    const className = classInfo
      ? `${classInfo.name}${classInfo.section ? ` - ${classInfo.section}` : ''}`
      : 'Class';

    const recipients = students
      .filter(s => s.parent_email)
      .map(s => ({
        to: s.parent_email!,
        studentId: s.id,
        studentName: s.full_name,
        className,
      }));

    if (recipients.length === 0) return;

    await supabase.functions.invoke('send-email-notification', {
      body: {
        type: 'homework',
        recipients,
        subject: `Homework: [${homework.subject} – ${homework.title}] [REF:HW-${homework.id}]`,
        metadata: {
          subject: homework.subject,
          title: homework.title,
          className,
          dueDate: homework.due_date,
          description: homework.description,
          refCode: `REF:HW-${homework.id}`,
        },
      },
    });

    console.log(`Sent homework email notifications to ${recipients.length} parents`);
  } catch (error) {
    console.error('Failed to send homework email notifications:', error);
    // Don't throw — homework save should not fail due to email errors
  }
}

export type Homework = Tables<'homework'> & {
  classes?: Tables<'classes'> | null;
  submissions?: Tables<'homework_submissions'>[];
};

export function useHomework(classId?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['homework', classId],
    queryFn: async () => {
      let query = supabase
        .from('homework')
        .select('*, classes(*), homework_submissions(*)')
        .order('due_date', { ascending: true });

      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Homework[];
    },
  });

  useRealtimeSubscription({
    table: 'homework',
    onChange: () => queryClient.invalidateQueries({ queryKey: ['homework'] }),
  });

  useRealtimeSubscription({
    table: 'homework_submissions',
    onChange: () => queryClient.invalidateQueries({ queryKey: ['homework'] }),
  });

  const createHomework = useMutation({
    mutationFn: async (homework: TablesInsert<'homework'>) => {
      const { data, error } = await supabase
        .from('homework')
        .insert(homework)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'homework'>;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Homework assigned successfully!');

      // Auto-send email notifications
      toast.info('Sending email notifications to parents...');
      await sendHomeworkEmail(data, data.class_id);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateHomework = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'homework'> & { id: string }) => {
      const { data, error } = await supabase
        .from('homework')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      toast.success('Homework updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteHomework = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Homework deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { homework: data || [], isLoading, error, refetch, createHomework, updateHomework, deleteHomework };
}
