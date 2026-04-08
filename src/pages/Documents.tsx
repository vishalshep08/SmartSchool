import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/hooks/useStudents';
import {
  useAllDocuments,
  DOCUMENT_TYPE_LABELS,
  ALL_DOCUMENT_TYPES,
  type DocumentType,
  type DocumentStatus,
} from '@/hooks/useStudentDocuments';
import { useTeacherDocuments } from '@/hooks/useTeacherDocumentsList';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Eye,
  ShieldCheck,
  Trash2,
  Loader2,
  FolderOpen,
  Users,
  GraduationCap,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentVerificationDialog } from '@/components/documents/DocumentVerificationDialog';
import { StudentDocumentsPanel } from '@/components/documents/StudentDocumentsPanel';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  verified: { label: 'Verified', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const TEACHER_DOC_LABELS: Record<string, string> = {
  id_proof: 'ID Proof',
  qualification_certificate: 'Qualification Certificate',
  experience_certificate: 'Experience Certificate',
  profile_photo: 'Profile Photo',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const { role } = useAuth();
  const isPrincipal = role === 'principal';

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl font-bold text-foreground">Document Management</h1>
        <p className="text-muted-foreground mt-1">Search and manage student and teacher documents</p>
      </div>

      <Tabs defaultValue="student" className="space-y-4">
        <TabsList>
          <TabsTrigger value="student" className="gap-2"><GraduationCap className="w-4 h-4" />Student Documents</TabsTrigger>
          <TabsTrigger value="teacher" className="gap-2"><Users className="w-4 h-4" />Teacher Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="student">
          <StudentDocumentsSection isPrincipal={isPrincipal} />
        </TabsContent>
        <TabsContent value="teacher">
          <TeacherDocumentsSection isPrincipal={isPrincipal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Student Documents Section ────────────────────────────────────
function StudentDocumentsSection({ isPrincipal }: { isPrincipal: boolean }) {
  const { classes } = useClasses();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [verifyDoc, setVerifyDoc] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  const { data: documents, isLoading } = useAllDocuments({
    status: statusFilter !== 'all' ? (statusFilter as DocumentStatus) : undefined,
    documentType: typeFilter !== 'all' ? (typeFilter as DocumentType) : undefined,
    classId: classFilter !== 'all' ? classFilter : undefined,
    search: search || undefined,
  });

  const handleDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from('student-documents').createSignedUrl(filePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch { toast.error('Failed to generate download link'); }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    try {
      await supabase.storage.from('student-documents').remove([doc.file_path]);
      await supabase.from('student_documents').delete().eq('id', doc.id);
      toast.success('Document deleted');
    } catch { toast.error('Delete failed'); }
  };

  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setClassFilter('all'); };
  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || classFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by student name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Document type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ALL_DOCUMENT_TYPES.map(dt => (<SelectItem key={dt} value={dt}>{DOCUMENT_TYPE_LABELS[dt]}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {isPrincipal && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls: any) => (<SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section && `- ${cls.section}`}</SelectItem>))}
              </SelectContent>
            </Select>
          )}
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Filters</Button>}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !documents || documents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No documents found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc: any) => {
                const statusCfg = STATUS_CONFIG[doc.status as DocumentStatus];
                const StatusIcon = statusCfg.icon;
                const student = doc.students;
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <button className="text-left hover:underline" onClick={() => setSelectedStudent({ id: doc.student_id, name: student?.full_name || '' })}>
                        <p className="font-medium text-sm">{student?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{student?.admission_number}</p>
                      </button>
                    </TableCell>
                    <TableCell>
                      {student?.classes ? <span className="text-sm">{student.classes.name} {student.classes.section && `- ${student.classes.section}`}</span> : <span className="text-xs text-muted-foreground">N/A</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType]}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{doc.file_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', statusCfg.className)}>
                        <StatusIcon className="w-3.5 h-3.5" />{statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc.file_path)}><Download className="w-4 h-4" /></Button>
                        {isPrincipal && doc.status === 'pending' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => setVerifyDoc(doc)}><ShieldCheck className="w-4 h-4" /></Button>
                        )}
                        {isPrincipal && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc)}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {documents && documents.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Showing <span className="font-medium text-foreground">{documents.length}</span> documents</p>
        </div>
      )}

      {verifyDoc && <DocumentVerificationDialog open={!!verifyDoc} onOpenChange={open => !open && setVerifyDoc(null)} document={verifyDoc} />}
      {selectedStudent && <StudentDocumentsPanel open={!!selectedStudent} onOpenChange={open => !open && setSelectedStudent(null)} studentId={selectedStudent.id} studentName={selectedStudent.name} />}
    </div>
  );
}

// ─── Teacher Documents Section ────────────────────────────────────
function TeacherDocumentsSection({ isPrincipal }: { isPrincipal: boolean }) {
  const { documents, teachers, isLoading, deleteDocument } = useTeacherDocuments();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const filtered = documents.filter(doc => {
    if (typeFilter !== 'all' && doc.document_type !== typeFilter) return false;
    if (teacherFilter !== 'all' && doc.teacher_id !== teacherFilter) return false;
    if (search && !doc.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getTeacherName = (teacherId: string) => {
    const t = teachers.find(t => t.teacher_id === teacherId);
    return t?.full_name || 'Unknown';
  };

  const handlePreview = (doc: any) => {
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc.file_name);
    if (isImage) {
      setPreviewDoc(doc);
    } else {
      window.open(doc.file_url, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteDocument(deleteConfirm.id, deleteConfirm.file_url);
    setDeleteConfirm(null);
  };

  const getFileIcon = (fileName: string) => {
    if (/\.(jpg|jpeg|png|webp)$/i.test(fileName)) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (/\.pdf$/i.test(fileName)) return <File className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by file name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Teachers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map(t => (<SelectItem key={t.teacher_id} value={t.teacher_id}>{t.full_name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TEACHER_DOC_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No teacher documents found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell><p className="font-medium text-sm">{getTeacherName(doc.teacher_id)}</p></TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TEACHER_DOC_LABELS[doc.document_type] || doc.document_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.file_name)}
                      <span className="text-sm truncate max-w-[150px]">{doc.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{formatFileSize(doc.file_size_bytes)}</span></TableCell>
                  <TableCell>
                    <p className="text-sm">{new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.file_url, '_blank')}><Download className="w-4 h-4" /></Button>
                      {isPrincipal && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(doc)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> documents</p>
        </div>
      )}

      {/* Preview Dialog */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={open => !open && setPreviewDoc(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>{previewDoc.file_name}</DialogTitle></DialogHeader>
            <div className="flex justify-center">
              <img src={previewDoc.file_url} alt={previewDoc.file_name} className="max-h-[60vh] object-contain rounded-lg" />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Document</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">"{deleteConfirm.file_name}"</span>? This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
