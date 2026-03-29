import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminActionLogger } from './useAdminActionLogger';

export interface Announcement {
    id: string;
    title: string;
    content: string;
    target_audience: string[];
    target_class_ids: string[] | null;
    posted_by_user_id: string | null;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
    profiles?: { full_name: string } | null;
    is_read?: boolean;
}

export function useAnnouncements() {
    const queryClient = useQueryClient();
    const { user, role } = useAuth();
    const { logAction } = useAdminActionLogger();

    const { data, isLoading, error } = useQuery({
        queryKey: ['announcements'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Announcement[];
        },
    });

    const createAnnouncement = useMutation({
        mutationFn: async (input: {
            title: string;
            content: string;
            target_audience: string[];
            target_class_ids?: string[];
            expires_at?: string;
        }) => {
            const { data, error } = await (supabase as any)
                .from('announcements')
                .insert({
                    ...input,
                    posted_by_user_id: user?.id,
                    target_class_ids: input.target_class_ids || null,
                    expires_at: input.expires_at || null,
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            logAction({ actionType: 'CREATE', module: 'Announcements', recordAffected: 'New announcement posted' });
            toast.success('Announcement posted');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateAnnouncement = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Announcement> & { id: string }) => {
            const { data, error } = await (supabase as any)
                .from('announcements')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            toast.success('Announcement updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteAnnouncement = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('announcements')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            toast.success('Announcement deleted');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const toggleActive = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await (supabase as any)
                .from('announcements')
                .update({ is_active })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            toast.success('Announcement status updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return {
        announcements: data || [],
        isLoading,
        error,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        toggleActive,
    };
}

/** Get active announcements visible to the current user's role */
export function useActiveAnnouncements() {
    const { user, role } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['active-announcements', role],
        queryFn: async () => {
            const now = new Date().toISOString();
            const { data: announcements, error } = await (supabase as any)
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .or(`expires_at.is.null,expires_at.gt.${now}`)
                .order('created_at', { ascending: false })
                .limit(5);
            if (error) throw error;

            // Filter by target_audience matching current role
            const roleMap: Record<string, string> = {
                principal: 'Admin',
                teacher: 'Teachers',
                parent: 'Parents',
                staff: 'Non-Teaching Staff',
                super_admin: 'Admin',
            };
            const userAudience = roleMap[role || ''] || '';

            const filtered = (announcements as Announcement[]).filter(a =>
                a.target_audience.includes('All') || a.target_audience.includes(userAudience)
            );

            // Check read status
            if (user?.id && filtered.length > 0) {
                const ids = filtered.map(a => a.id);
                const { data: reads } = await (supabase as any)
                    .from('announcement_reads')
                    .select('announcement_id')
                    .eq('user_id', user.id)
                    .in('announcement_id', ids);

                const readIds = new Set((reads || []).map((r: any) => r.announcement_id));
                return filtered.map(a => ({ ...a, is_read: readIds.has(a.id) }));
            }

            return filtered.map(a => ({ ...a, is_read: false }));
        },
        staleTime: 30000,
    });

    const markAsRead = useMutation({
        mutationFn: async (announcementId: string) => {
            if (!user?.id) return;
            const { error } = await (supabase as any)
                .from('announcement_reads')
                .upsert(
                    { announcement_id: announcementId, user_id: user.id },
                    { onConflict: 'announcement_id,user_id' }
                );
            if (error) throw error;
        },
        onSuccess: () => {
            // Silently update cache
        },
    });

    return {
        announcements: (data || []) as Announcement[],
        isLoading,
        markAsRead,
        unreadCount: (data || []).filter((a: Announcement) => !a.is_read).length,
    };
}
