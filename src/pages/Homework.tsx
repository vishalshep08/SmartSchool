import { useState, useRef } from 'react';
import { useHomework } from '@/hooks/useHomework';
import { useClasses } from '@/hooks/useStudents';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeworkFileUpload } from '@/hooks/useHomeworkFileUpload';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, BookOpen, Calendar, Paperclip, Users, Loader2,
  FileText, Trash2, Eye, X, Download, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateIndian } from '@/lib/dateUtils';
import { HomeworkDetailsDialog } from '@/components/homework/HomeworkDetailsDialog';
import { toast } from 'sonner';

export default function Homework() {
  const { user, role } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    class_id: '',
    due_date: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { homework, isLoading, createHomework, deleteHomework } = useHomework(selectedClass);
  const { classes } = useClasses();
  const { uploading, progress, uploadedFile, uploadFile, removeFile } = useHomeworkFileUpload();
  const { logActivity } = useLogActivity();

  const canManageHomework = role === 'teacher';
  const canViewOnly = role === 'principal';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHomework.mutateAsync({
        ...formData,
        assigned_by: null,
        file_url: uploadedFile?.file_url || null,
        file_name: uploadedFile?.file_name || null,
        file_size_bytes: uploadedFile?.file_size_bytes || null,
      } as any);

      if (uploadedFile) {
        logActivity.mutate({
          action_type: 'UPLOAD_HOMEWORK_FILE',
          description: `Teacher attached file to ${formData.subject} homework`,
          performed_by: user?.id,
          role: 'teacher',
        });
      }

      logActivity.mutate({
        action_type: 'ASSIGN_HOMEWORK',
        description: `Teacher assigned ${formData.subject} homework to class`,
        performed_by: user?.id,
        role: 'teacher',
      });

      setIsDialogOpen(false);
      setFormData({ title: '', description: '', subject: '', class_id: '', due_date: '' });
      removeFile();
    } catch (error) {
      // handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this homework?')) {
      await deleteHomework.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Homework</h1>
          <p className="text-muted-foreground mt-1">Assign and track homework submissions</p>
        </div>
        
        {canManageHomework && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" />
                Assign Homework
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">Assign New Homework</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateHomework} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Class *</Label>
                    <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.section && `- ${cls.section}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Input required placeholder="e.g., Mathematics" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input required placeholder="Homework title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the homework assignment..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1.5 min-h-24" />
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input required type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="mt-1.5" />
                </div>
                
                {/* File Upload */}
                <div>
                  <Label>Attachment (optional)</Label>
                  {uploadedFile ? (
                    <div className="mt-1.5 flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedFile.file_name}</p>
                        <p className="text-xs text-muted-foreground">{(uploadedFile.file_size_bytes / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={removeFile}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" onChange={handleFileSelect} />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        {uploading ? (
                          <div className="space-y-2">
                            <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                            <Progress value={progress} className="h-1.5 max-w-[200px] mx-auto" />
                            <p className="text-xs text-muted-foreground">{progress}% uploaded</p>
                          </div>
                        ) : (
                          <>
                            <Paperclip className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload</p>
                            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOCX up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="gradient" disabled={createHomework.isPending || uploading}>
                    {createHomework.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Assign Homework
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
        {canViewOnly && (
          <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">View Only Mode</div>
        )}
      </div>

      {/* Filter */}
      <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section && `- ${cls.section}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Homework Cards */}
      {homework.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-up">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading font-semibold text-foreground mb-2">No homework found</h3>
          <p className="text-muted-foreground text-sm">
            {canManageHomework ? 'Assign your first homework to get started.' : 'No homework has been assigned yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {homework.map((hw, index) => {
            const submissionCount = hw.submissions?.filter(s => s.status !== 'pending').length || 0;
            const totalStudents = hw.submissions?.length || 0;
            const submissionRate = totalStudents > 0 ? (submissionCount / totalStudents) * 100 : 0;
            const dueDate = new Date(hw.due_date);
            const isOverdue = dueDate < new Date();
            const isDueSoon = !isOverdue && dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
            
            return (
              <div key={hw.id} className="glass-card overflow-hidden opacity-0 animate-fade-up hover-lift" style={{ animationDelay: `${index * 100 + 200}ms` }}>
                <div className="p-6 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-foreground">{hw.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {hw.classes?.name} {hw.classes?.section && `- ${hw.classes.section}`}
                          </span>
                          <span className="text-xs text-muted-foreground">{hw.subject}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1',
                        isOverdue ? 'bg-destructive/10 text-destructive' : isDueSoon ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                      )}>
                        <Calendar className="w-3 h-3" />
                        {formatDateIndian(dueDate)}
                      </span>
                      {canManageHomework && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(hw.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {hw.description && <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{hw.description}</p>}
                  {(hw as any).file_url && (
                    <a href={(hw as any).file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline">
                      <Download className="w-3 h-3" />
                      {(hw as any).file_name || 'Download attachment'}
                    </a>
                  )}
                </div>
                <div className="p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{submissionCount} submitted</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{Math.round(submissionRate)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500" style={{ width: `${submissionRate}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">Created {formatDateIndian(new Date(hw.created_at))}</span>
                    <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => { setSelectedHomework(hw); setIsDetailsOpen(true); }}>
                      <Eye className="w-3 h-3" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-heading font-semibold text-foreground">Email Notifications Active</h3>
            <p className="text-sm text-muted-foreground mt-1">Parents are automatically notified via email when new homework is assigned.</p>
          </div>
        </div>
      </div>

      <HomeworkDetailsDialog homework={selectedHomework} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
    </div>
  );
}
