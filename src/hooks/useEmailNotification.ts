import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export type EmailType = 'notice' | 'homework' | 'alert' | 'attendance' | 'leave' | 'remark' | 'event' | 'custom';
export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: EmailStatus;
  type: EmailType;
  sent_by: string | null;
  failure_reason: string | null;
  message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendEmailParams {
  recipients: Array<string | { to: string; studentName?: string; studentId?: string; className?: string }>;
  subject: string;
  htmlBody?: string;
  type: EmailType;
  metadata?: Record<string, unknown>;
  sentBy?: string;
}

interface LogFilters {
  type?: EmailType;
  status?: EmailStatus;
  dateFrom?: string;
  dateTo?: string;
}

export function useEmailLogs(filters?: LogFilters) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['email-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  useRealtimeSubscription({
    table: 'email_logs' as any,
    onChange: () => queryClient.invalidateQueries({ queryKey: ['email-logs'] }),
  });

  const stats = {
    total: data?.length || 0,
    sent: data?.filter((l) => l.status === 'sent').length || 0,
    failed: data?.filter((l) => l.status === 'failed').length || 0,
    pending: data?.filter((l) => l.status === 'pending').length || 0,
    today: data?.filter((l) => {
      const today = new Date().toISOString().split('T')[0];
      return l.created_at.startsWith(today);
    }).length || 0,
  };

  const statsByType: Record<EmailType, number> = {
    notice: data?.filter((l) => l.type === 'notice').length || 0,
    homework: data?.filter((l) => l.type === 'homework').length || 0,
    alert: data?.filter((l) => l.type === 'alert').length || 0,
    attendance: data?.filter((l) => l.type === 'attendance').length || 0,
    leave: data?.filter((l) => l.type === 'leave').length || 0,
    remark: data?.filter((l) => l.type === 'remark').length || 0,
    event: data?.filter((l) => l.type === 'event').length || 0,
    custom: data?.filter((l) => l.type === 'custom').length || 0,
  };

  return { logs: data || [], isLoading, error, refetch, stats, statsByType };
}

export function useEmailNotification() {
  const sendEmail = useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const { summary } = data;
      if (summary?.failed > 0) {
        toast.warning(`Emails sent: ${summary.sent}, failed: ${summary.failed}`);
      } else {
        toast.success(`Email${summary?.sent !== 1 ? 's' : ''} sent successfully!`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  const sendAttendanceNotification = (
    recipients: Array<{ to: string; studentName: string; studentId: string; className: string }>,
    status: string,
    date: string,
  ) =>
    sendEmail.mutateAsync({
      recipients,
      subject: `Attendance Update – ${date}`,
      type: 'attendance',
      metadata: { status, date },
    });

  const sendHomeworkNotification = (
    recipients: Array<{ to: string; studentName: string; studentId: string; className: string }>,
    subject: string,
    title: string,
    dueDate: string,
    description?: string,
  ) =>
    sendEmail.mutateAsync({
      recipients,
      subject: `New Homework: ${subject}`,
      type: 'homework',
      metadata: { subject, title, dueDate, description },
    });

  const sendNoticeNotification = (
    recipients: string[],
    noticeTitle: string,
    content: string,
    priority: string,
  ) =>
    sendEmail.mutateAsync({
      recipients,
      subject: `School Notice: ${noticeTitle}`,
      type: 'notice',
      htmlBody: `<h2>${noticeTitle}</h2><p>${content.replace(/\n/g, '<br/>')}</p><p><strong>Priority:</strong> ${priority}</p>`,
    });

  const sendEmergencyAlert = (recipients: string[], message: string) =>
    sendEmail.mutateAsync({
      recipients,
      subject: '🚨 Emergency Alert from School',
      type: 'alert',
      htmlBody: `<h2 style="color:#dc2626;">⚠️ Emergency Alert</h2><p>${message.replace(/\n/g, '<br/>')}</p><p>Please contact the school immediately.</p>`,
    });

  const sendCustomMessage = (recipients: string[], subject: string, htmlBody: string) =>
    sendEmail.mutateAsync({ recipients, subject, htmlBody, type: 'custom' });

  return {
    sendEmail,
    sendAttendanceNotification,
    sendHomeworkNotification,
    sendNoticeNotification,
    sendEmergencyAlert,
    sendCustomMessage,
    isLoading: sendEmail.isPending,
  };
}
