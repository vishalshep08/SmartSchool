import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeacherDocument {
  id: string;
  teacher_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  uploaded_at: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export type DocType = 'id_proof' | 'qualification_certificate' | 'experience_certificate' | 'profile_photo';

export const REQUIRED_DOCS: DocType[] = ['id_proof', 'qualification_certificate', 'profile_photo'];
export const OPTIONAL_DOCS: DocType[] = ['experience_certificate'];
export const ALL_DOCS = [...REQUIRED_DOCS, ...OPTIONAL_DOCS];

export const DOC_LABELS: Record<DocType, string> = {
  id_proof: 'Government-issued ID',
  qualification_certificate: 'Qualification Certificate',
  experience_certificate: 'Experience Certificate',
  profile_photo: 'Profile Photo',
};

export function useTeacherDocumentUpload() {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { file_name: string; file_url: string; file_size_bytes: number }>>({});

  useEffect(() => {
    const activeDocs = Object.keys(uploading).filter(k => uploading[k]);
    if (activeDocs.length === 0) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = { ...prev };
        let allDone = true;
        
        activeDocs.forEach(docType => {
          const current = next[docType] || 0;
          if (current < 90) {
            next[docType] = current + 10;
            allDone = false;
          }
        });

        if (allDone) clearInterval(progressInterval);
        return next;
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, [uploading]);

  const validateFile = (file: File, docType: DocType): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PDF, JPG, and PNG files are accepted.';
    }
    if (file.size > MAX_SIZE) {
      return 'File size must be less than 5 MB.';
    }
    if (docType === 'profile_photo' && !file.type.startsWith('image/')) {
      return 'Profile photo must be an image (JPG or PNG).';
    }
    return null;
  };

  const uploadFile = async (file: File, docType: DocType, teacherId: string) => {
    const validationError = validateFile(file, docType);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    setUploading(prev => ({ ...prev, [docType]: true }));
    setProgress(prev => ({ ...prev, [docType]: 0 }));

    try {
      const filePath = `${teacherId}/${docType}/${Date.now()}_${file.name}`;

      const { data, error } = await supabase.storage
        .from('teacher-documents')
        .upload(filePath, file);

      if (error) throw error;

      // Get signed URL for private bucket
      const { data: signedData } = await supabase.storage
        .from('teacher-documents')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = signedData?.signedUrl || data.path;

      setProgress(prev => ({ ...prev, [docType]: 100 }));
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: { file_name: file.name, file_url: fileUrl, file_size_bytes: file.size },
      }));

      return { file_name: file.name, file_url: fileUrl, file_size_bytes: file.size };
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const removeFile = async (docType: DocType) => {
    setUploadedDocs(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
    setProgress(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

  const saveDocuments = async (teacherId: string) => {
    const docs = Object.entries(uploadedDocs).map(([docType, info]) => ({
      teacher_id: teacherId,
      document_type: docType,
      file_name: info.file_name,
      file_url: info.file_url,
      file_size_bytes: info.file_size_bytes,
    }));

    if (docs.length === 0) return;

    const { error } = await supabase.from('teacher_documents').insert(docs);
    if (error) throw error;
  };

  const requiredComplete = REQUIRED_DOCS.every(doc => uploadedDocs[doc]);
  const uploadedCount = Object.keys(uploadedDocs).length;

  return {
    uploading,
    progress,
    uploadedDocs,
    uploadFile,
    removeFile,
    saveDocuments,
    requiredComplete,
    uploadedCount,
    validateFile,
  };
}
