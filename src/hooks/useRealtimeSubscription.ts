import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName =
  | 'student_attendance'
  | 'teacher_attendance'
  | 'homework'
  | 'homework_submissions'
  | 'issues'
  | 'notifications'
  | 'events'
  | 'teachers'
  | 'students'
  | 'classes'
  | 'timetable'
  | 'salary_records'
  | 'profiles'
  | 'user_roles'
  | 'teacher_leaves'
  | 'student_remarks'
  | 'notices'
  | 'student_documents'
  | 'activity_logs'
  | 'email_logs'
  | 'teacher_documents';

interface UseRealtimeSubscriptionOptions {
  table: TableName;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onChange?: () => void;
}

export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  onChange,
}: UseRealtimeSubscriptionOptions) {
  useEffect(() => {
    const channelName = `realtime-${table}-${Date.now()}`;

    const channelConfig: {
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`Realtime ${table} change detected:`, payload.eventType);
          onChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, onChange]);
}
