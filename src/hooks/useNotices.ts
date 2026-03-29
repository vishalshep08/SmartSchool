import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type NoticeType = 'general' | 'class' | 'emergency' | 'event';
export type TargetAudience = 'all' | 'teachers' | 'students' | 'class';
export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notice {
  id: string;
  title: string;
  content: string;
  notice_type: NoticeType;
  target_audience: TargetAudience;
  class_id: string | null;
  created_by: string;
  is_approved: boolean;
  approved_by: string | null;
  attachment_url: string | null;
  priority: NoticePriority;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  classes?: {
    id: string;
    name: string;
    section: string | null;
  };
  creator_profile?: {
    full_name: string;
    email: string;
  };
}

export interface CreateNoticeData {
  title: string;
  content: string;
  notice_type: NoticeType;
  target_audience: TargetAudience;
  class_id?: string;
  created_by: string;
  priority?: NoticePriority;
  expires_at?: string;
  attachment_url?: string;
}

export function useNotices() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  const { data: notices, isLoading, error, refetch } = useQuery({
    queryKey: ['notices', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select(`
          *,
          classes(id, name, section)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get creator profiles
      const creatorIds = data?.map(n => n.created_by).filter(Boolean) || [];
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', creatorIds);

        return data?.map(notice => ({
          ...notice,
          creator_profile: profiles?.find(p => p.user_id === notice.created_by)
        })) || [];
      }

      return data || [];
    },
    enabled: !!user,
  });

  const createNotice = useMutation({
    mutationFn: async (noticeData: CreateNoticeData) => {
      // Principal notices are auto-approved
      const isApproved = role === 'principal';
      
      const { data, error } = await supabase
        .from('notices')
        .insert({
          ...noticeData,
          is_approved: isApproved,
          approved_by: isApproved ? user?.id : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const approveNotice = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('notices')
        .update({ 
          is_approved: true, 
          approved_by: user?.id 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice approved!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteNotice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    notices: notices || [],
    isLoading,
    error,
    refetch,
    createNotice,
    approveNotice,
    deleteNotice,
  };
}
