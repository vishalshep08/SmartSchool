import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentDocuments, DOCUMENT_TYPE_LABELS, type StudentDocument, type DocumentType } from '@/hooks/useStudentDocuments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: StudentDocument;
}

export function DocumentVerificationDialog({ open, onOpenChange, document }: Props) {
  const { user } = useAuth();
  const { verifyDocument, rejectDocument, getDownloadUrl } = useStudentDocuments(document.student_id);
  const [rejectionReason, setRejectionReason] = useState('');
  const [mode, setMode] = useState<'choose' | 'reject'>('choose');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!user?.id) return;
    await verifyDocument.mutateAsync({ docId: document.id, userId: user.id });
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!user?.id || !rejectionReason.trim()) return;
    await rejectDocument.mutateAsync({
      docId: document.id,
      userId: user.id,
      reason: rejectionReason.trim(),
    });
    onOpenChange(false);
  };

  const handlePreview = async () => {
    try {
      const url = await getDownloadUrl(document.file_path);
      setPreviewUrl(url);
    } catch {
      // handled
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Verify Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Document Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {DOCUMENT_TYPE_LABELS[document.document_type as DocumentType]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{document.file_name}</p>
            {document.academic_year && (
              <p className="text-sm text-muted-foreground">Academic Year: {document.academic_year}</p>
            )}
            <Button variant="outline" size="sm" onClick={handlePreview}>
              Preview Document
            </Button>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="rounded-lg border overflow-hidden">
              {document.file_mime_type === 'application/pdf' ? (
                <iframe src={previewUrl} className="w-full h-64" />
              ) : (
                <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto" />
              )}
            </div>
          )}

          {mode === 'choose' ? (
            <div className="flex gap-3">
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleVerify}
                disabled={verifyDocument.isPending}
              >
                {verifyDocument.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Verify
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => setMode('reject')}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1.5"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setMode('choose')}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || rejectDocument.isPending}
                >
                  {rejectDocument.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
