import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export interface TeacherDocumentRow {
  id: string;
  teacher_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  uploaded_at: string;
}

export interface TeacherInfo {
  teacher_id: string;
  full_name: string;
}

export function useTeacherDocuments() {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    table: 'teacher_documents',
    onChange: () => queryClient.invalidateQueries({ queryKey: ['teacher-documents-list'] }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-documents-list'],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from('teacher_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      if (error) throw error;

      // Get teacher names via profiles
      const teacherIds = [...new Set(docs.map(d => d.teacher_id))];
      let teacherInfos: TeacherInfo[] = [];

      if (teacherIds.length > 0) {
        const { data: teachers } = await (supabase as any)
          .from('employees')
          .select('id, user_id')
          .in('id', teacherIds);

        if (teachers && teachers.length > 0) {
          const userIds = teachers.map(t => t.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);

          teacherInfos = teachers.map(t => ({
            teacher_id: t.id,
            full_name: profiles?.find(p => p.user_id === t.user_id)?.full_name || 'Unknown',
          }));
        }
      }

      return { docs: docs as TeacherDocumentRow[], teacherInfos };
    },
  });

  const deleteDocument = async (docId: string, fileUrl: string) => {
    try {
      // Extract path from URL for storage deletion
      const urlParts = fileUrl.split('/teacher-documents/');
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1].split('?')[0]);
        await supabase.storage.from('teacher-documents').remove([storagePath]);
      }
      const { error } = await supabase.from('teacher_documents').delete().eq('id', docId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['teacher-documents-list'] });
      toast.success('Document deleted');
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    }
  };

  return {
    documents: data?.docs || [],
    teachers: data?.teacherInfos || [],
    isLoading,
    deleteDocument,
  };
}
