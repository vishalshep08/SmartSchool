import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type MaterialType = 'lecture_link' | 'notes' | 'syllabus' | 'assignment' | 'other';

export interface StudyMaterial {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  topic: string;
  material_type: MaterialType;
  title: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  lecture_url?: string | null;
  material_date: string;
  created_at: string;
  updated_at: string;
  classes?: { name: string; section: string } | null;
  teachers?: { full_name: string } | null;
}

export interface StudyMaterialInsert {
  teacher_id: string;
  class_id: string;
  subject: string;
  topic: string;
  material_type: MaterialType;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  lecture_url?: string;
  material_date: string;
}

const BUCKET = 'study-materials';

// ─── Upload a file to storage and return its public URL ────────────────────────
export async function uploadMaterialFile(file: File, teacherId: string): Promise<{
  url: string;
  name: string;
  size: number;
}> {
  const ext = file.name.split('.').pop();
  const path = `${teacherId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, name: file.name, size: file.size };
}

// ─── Delete a file from storage ───────────────────────────────────────────────
export async function deleteMaterialFile(fileUrl: string): Promise<void> {
  try {
    // Extract path after /study-materials/
    const marker = `/${BUCKET}/`;
    const idx = fileUrl.indexOf(marker);
    if (idx === -1) return;
    const path = fileUrl.slice(idx + marker.length);
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.warn('Could not delete file from storage:', e);
  }
}

// ─── Teacher hook ─────────────────────────────────────────────────────────────
export function useStudyMaterials(classId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Single query to employees — this is where subjects_assigned, classes_assigned live
  // and we use employees.id as the teacher_id FK in study_materials
  const { data: teacher } = useQuery({
    queryKey: ['teacher-employee-record', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from('employees')
        .select('id, subjects_assigned, classes_assigned')
        .eq('user_id', user.id)
        .maybeSingle();
      return data as { id: string; subjects_assigned: string[]; classes_assigned: string[] } | null;
    },
    enabled: !!user?.id,
  });

  // Fetch materials uploaded by this teacher (optionally filtered by class)
  const { data: materials = [], isLoading, refetch } = useQuery({
    queryKey: ['study-materials', teacher?.id, classId],
    queryFn: async () => {
      if (!teacher?.id) return [];
      let q = (supabase as any)
        .from('study_materials')
        .select('*, classes(name, section)')
        .eq('teacher_id', teacher.id)
        .order('material_date', { ascending: false });

      if (classId && classId !== 'all') {
        q = q.eq('class_id', classId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as StudyMaterial[];
    },
    enabled: !!teacher?.id,
  });

  const createMaterial = useMutation({
    mutationFn: async (payload: Omit<StudyMaterialInsert, 'teacher_id'>) => {
      if (!teacher?.id) throw new Error('Teacher record not found');
      const { data, error } = await (supabase as any)
        .from('study_materials')
        .insert({ ...payload, teacher_id: teacher.id })
        .select()
        .single();
      if (error) throw error;
      return data as StudyMaterial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-materials'] });
      toast.success('Study material uploaded successfully!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudyMaterialInsert> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('study_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as StudyMaterial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-materials'] });
      toast.success('Material updated!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (material: StudyMaterial) => {
      if (material.file_url) await deleteMaterialFile(material.file_url);
      const { error } = await (supabase as any)
        .from('study_materials')
        .delete()
        .eq('id', material.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-materials'] });
      toast.success('Material deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    teacher,
    materials,
    isLoading,
    refetch,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  };
}

// ─── Parent hook ──────────────────────────────────────────────────────────────
export function useParentStudyMaterials(classId?: string) {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['study-materials-parent', classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await (supabase as any)
        .from('study_materials')
        .select('*, classes(name, section), employees(full_name)')
        .eq('class_id', classId)
        .order('material_date', { ascending: false });
      if (error) throw error;
      return (data || []) as StudyMaterial[];
    },
    enabled: !!classId,
  });

  return { materials, isLoading };
}
