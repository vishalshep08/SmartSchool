import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function useHomeworkFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{
    file_url: string;
    file_name: string;
    file_size_bytes: number;
  } | null>(null);

  useEffect(() => {
    if (!uploading) return;
    
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) { 
          clearInterval(progressInterval); 
          return 90; 
        }
        return p + 10;
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, [uploading]);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Only PDF, JPG, PNG, and DOCX files are accepted.';
    }
    if (file.size > MAX_SIZE) {
      return 'File size must be less than 10 MB.';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      const filePath = `homework/${Date.now()}_${file.name}`;

      const { data, error } = await supabase.storage
        .from('homework-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('homework-files')
        .getPublicUrl(data.path);

      setProgress(100);
      const result = {
        file_url: publicData.publicUrl,
        file_name: file.name,
        file_size_bytes: file.size,
      };
      setUploadedFile(result);
      return result;
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setProgress(0);
  };

  return { uploading, progress, uploadedFile, uploadFile, removeFile, validateFile };
}
