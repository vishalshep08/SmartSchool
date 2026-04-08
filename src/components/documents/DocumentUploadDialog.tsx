import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useStudentDocuments,
  ALL_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  validateFile,
  type DocumentType,
} from '@/hooks/useStudentDocuments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function DocumentUploadDialog({ open, onOpenChange, studentId, studentName }: Props) {
  const { user } = useAuth();
  const { uploadDocument } = useStudentDocuments(studentId);
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [academicYear, setAcademicYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
    } else {
      setFileError(null);
      setFile(f);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleSubmit = async () => {
    if (!file || !documentType || !user?.id) return;
    await uploadDocument.mutateAsync({
      studentId,
      documentType,
      file,
      academicYear: documentType === 'marksheet' ? academicYear : undefined,
      userId: user.id,
    });
    // Reset
    setFile(null);
    setDocumentType('');
    setAcademicYear('');
    onOpenChange(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Upload Document</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Uploading for <span className="font-medium text-foreground">{studentName}</span>
        </p>

        <div className="space-y-4 mt-2">
          {/* Document Type */}
          <div>
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {ALL_DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {DOCUMENT_TYPE_LABELS[dt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Year (for marksheets) */}
          {documentType === 'marksheet' && (
            <div>
              <Label>Academic Year</Label>
              <Input
                placeholder="e.g. 2024-25"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="mt-1.5"
              />
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border',
              fileError && 'border-destructive/50'
            )}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setFile(null); setFileError(null); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">Drag & drop or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG — Max 5MB</p>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="mt-3 max-w-[200px] mx-auto"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </>
            )}
          </div>

          {fileError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {fileError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!file || !documentType || uploadDocument.isPending}
            >
              {uploadDocument.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
