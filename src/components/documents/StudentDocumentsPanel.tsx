import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useStudentDocuments,
  DOCUMENT_TYPE_LABELS,
  ALL_DOCUMENT_TYPES,
  type StudentDocument,
  type DocumentType,
  type DocumentStatus,
} from '@/hooks/useStudentDocuments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ShieldCheck,
  ShieldX,
  Upload,
  Loader2,
  Filter,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentVerificationDialog } from './DocumentVerificationDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function StudentDocumentsPanel({ open, onOpenChange, studentId, studentName }: Props) {
  const { role, user } = useAuth();
  const { documents, isLoading, getDownloadUrl, deleteDocument } = useStudentDocuments(studentId);
  const isPrincipal = role === 'principal';

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [verifyDoc, setVerifyDoc] = useState<StudentDocument | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filtered = documents.filter((d) => {
    if (filterType !== 'all' && d.document_type !== filterType) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    return true;
  });

  const handleDownload = async (doc: StudentDocument) => {
    try {
      const url = await getDownloadUrl(doc.file_path);
      window.open(url, '_blank');
    } catch {
      // toast handled in hook
    }
  };

  const handlePreview = async (doc: StudentDocument) => {
    try {
      const url = await getDownloadUrl(doc.file_path);
      setPreviewUrl(url);
    } catch {
      // error handled
    }
  };

  const handleDelete = async (doc: StudentDocument) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
    await deleteDocument.mutateAsync(doc);
  };

  // Summary counts
  const totalTypes = ALL_DOCUMENT_TYPES.length;
  const uploadedTypes = new Set(documents.map((d) => d.document_type)).size;
  const verifiedCount = documents.filter((d) => d.status === 'verified').length;
  const pendingCount = documents.filter((d) => d.status === 'pending').length;
  const rejectedCount = documents.filter((d) => d.status === 'rejected').length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Documents — {studentName}</DialogTitle>
          </DialogHeader>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{uploadedTypes}/{totalTypes}</p>
              <p className="text-xs text-muted-foreground">Uploaded</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{verifiedCount}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>

          {/* Filters + Upload */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Doc type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ALL_DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>{DOCUMENT_TYPE_LABELS[dt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </Button>
            </div>
          </div>

          {/* Documents Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No documents found</p>
              <p className="text-sm">Upload documents to get started.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((doc) => {
                    const statusCfg = STATUS_CONFIG[doc.status as DocumentStatus];
                    const StatusIcon = statusCfg.icon;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType]}
                            </p>
                            {doc.academic_year && (
                              <p className="text-xs text-muted-foreground">Year: {doc.academic_year}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate max-w-[150px]">{doc.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                            statusCfg.className
                          )}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                          {doc.status === 'rejected' && doc.rejection_reason && (
                            <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={doc.rejection_reason}>
                              {doc.rejection_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {new Date(doc.uploaded_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)} title="Preview">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)} title="Download">
                              <Download className="w-4 h-4" />
                            </Button>
                            {isPrincipal && doc.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600"
                                onClick={() => setVerifyDoc(doc)}
                                title="Verify/Reject"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                            )}
                            {isPrincipal && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDelete(doc)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        studentId={studentId}
        studentName={studentName}
      />

      {/* Verification Dialog */}
      {verifyDoc && (
        <DocumentVerificationDialog
          open={!!verifyDoc}
          onOpenChange={(open) => !open && setVerifyDoc(null)}
          document={verifyDoc}
        />
      )}

      {/* Preview Dialog */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Document Preview</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {previewUrl.includes('.pdf') || previewUrl.includes('application/pdf') ? (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border" />
              ) : (
                <img src={previewUrl} alt="Document preview" className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
