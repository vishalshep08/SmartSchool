import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useParentData() {
  const { user } = useAuth();

  const { data: parentRecord, isLoading: isLoadingParent } = useQuery({
    queryKey: ['parent-record', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: linkedStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['parent-students', parentRecord?.id],
    queryFn: async () => {
      if (!parentRecord?.id) return [];
      const { data, error } = await supabase
        .from('parent_student_link')
        .select('student_id, students(*, classes(*))')
        .eq('parent_id', parentRecord.id);
      if (error) throw error;
      return data?.map((link: any) => link.students).filter(Boolean) || [];
    },
    enabled: !!parentRecord?.id,
  });

  return {
    parentRecord,
    linkedStudents: linkedStudents || [],
    isLoading: isLoadingParent || isLoadingStudents,
  };
}
