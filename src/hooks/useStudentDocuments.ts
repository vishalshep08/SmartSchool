import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

export type StudentDocument = Tables<'student_documents'>;
export type DocumentType = Enums<'document_type'>;
export type DocumentStatus = Enums<'document_status'>;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhaar_card: 'Aadhaar Card',
  birth_certificate: 'Birth Certificate',
  transfer_certificate: 'Transfer Certificate',
  bonafide_certificate: 'Bonafide Certificate',
  marksheet: 'Marksheet',
  caste_certificate: 'Caste Certificate',
  income_certificate: 'Income Certificate',
  passport_photo: 'Passport Photo',
};

export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'aadhaar_card',
  'birth_certificate',
  'transfer_certificate',
  'bonafide_certificate',
  'marksheet',
  'caste_certificate',
  'income_certificate',
  'passport_photo',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Only PDF, JPG, and PNG are allowed.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds 5MB limit.';
  }
  return null;
}

export function useStudentDocuments(studentId?: string) {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    table: 'student_documents',
    filter: studentId ? `student_id=eq.${studentId}` : undefined,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents', studentId] });
    },
  });

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['student-documents', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StudentDocument[];
    },
    enabled: !!studentId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      studentId,
      documentType,
      file,
      academicYear,
      userId,
    }: {
      studentId: string;
      documentType: DocumentType;
      file: File;
      academicYear?: string;
      userId: string;
    }) => {
      const validationError = validateFile(file);
      if (validationError) throw new Error(validationError);

      // Generate unique file path
      const ext = file.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${studentId}/${documentType}/${uniqueName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      // Insert record
      const { data, error: insertError } = await supabase
        .from('student_documents')
        .insert({
          student_id: studentId,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_mime_type: file.type,
          uploaded_by: userId,
          academic_year: academicYear || null,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents'] });
      toast.success('Document uploaded successfully!');
    },
    onError: (err: Error) => {
      toast.error('Upload failed', { description: err.message });
    },
  });

  const verifyDocument = useMutation({
    mutationFn: async ({ docId, userId }: { docId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('student_documents')
        .update({
          status: 'verified' as DocumentStatus,
          verified_by: userId,
          verified_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', docId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents'] });
      toast.success('Document verified!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectDocument = useMutation({
    mutationFn: async ({
      docId,
      userId,
      reason,
    }: {
      docId: string;
      userId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('student_documents')
        .update({
          status: 'rejected' as DocumentStatus,
          verified_by: userId,
          verified_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', docId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents'] });
      toast.success('Document rejected.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: StudentDocument) => {
      // Delete from storage
      await supabase.storage.from('student-documents').remove([doc.file_path]);
      // Delete record
      const { error } = await supabase
        .from('student_documents')
        .delete()
        .eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents'] });
      toast.success('Document deleted.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(filePath, 3600); // 1 hour
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    documents: documents || [],
    isLoading,
    error,
    uploadDocument,
    verifyDocument,
    rejectDocument,
    deleteDocument,
    getDownloadUrl,
  };
}

// Hook for admin to search all documents across students
export function useAllDocuments(filters?: {
  status?: DocumentStatus;
  documentType?: DocumentType;
  classId?: string;
  search?: string;
}) {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    table: 'student_documents',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['all-documents', filters] });
    },
  });

  return useQuery({
    queryKey: ['all-documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('student_documents')
        .select('*, students!inner(full_name, admission_number, class_id, classes(name, section))')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.documentType) {
        query = query.eq('document_type', filters.documentType);
      }
      if (filters?.classId) {
        query = query.eq('students.class_id', filters.classId);
      }
      if (filters?.search) {
        query = query.ilike('students.full_name', `%${filters.search}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data;
    },
  });
}
