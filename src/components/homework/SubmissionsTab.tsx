import { useState } from 'react';
import { useHomeworkSubmissions } from '@/hooks/useHomeworkSubmissions';
import { useAuth } from '@/contexts/AuthContext';
import { StudentAvatar } from '@/components/common/StudentAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Paperclip,
  Loader2,
  Save,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SubmissionsTabProps {
  homeworkId: string;
}

export function SubmissionsTab({ homeworkId }: SubmissionsTabProps) {
  const { user } = useAuth();
  const {
    submissions,
    submitted,
    pending,
    reviewed,
    isLoading,
    markAsReviewed,
    saveGrade,
  } = useHomeworkSubmissions(homeworkId);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingGrade, setEditingGrade] = useState<Record<string, { grade: string; remarks: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const lateSubmissions = submissions.filter(s => s.status === 'late');
  const submittedCount = submitted.length;
  const pendingCount = pending.length;
  const lateCount = lateSubmissions.length;
  const totalCount = submissions.length;
  const submissionRate = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

  const getFilteredSubmissions = () => {
    let filtered = submissions;
    if (filter === 'submitted') filtered = submitted.filter(s => s.status !== 'late');
    else if (filter === 'pending') filtered = pending;
    else if (filter === 'late') filtered = lateSubmissions;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.students?.full_name?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const filteredSubmissions = getFilteredSubmissions();
  const submittedFiltered = filteredSubmissions.filter(s => s.status !== 'pending');
  const pendingFiltered = filteredSubmissions.filter(s => s.status === 'pending');

  const handleSaveGrade = async (submissionId: string) => {
    const edit = editingGrade[submissionId];
    if (!edit || !user?.id) return;
    setSavingId(submissionId);
    try {
      await saveGrade.mutateAsync({
        id: submissionId,
        grade: edit.grade,
        remarks: edit.remarks,
        reviewed_by: user.id,
      });
      setEditingGrade(prev => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkReviewed = async (submissionId: string) => {
    if (!user?.id) return;
    setReviewingId(submissionId);
    try {
      await markAsReviewed.mutateAsync({ id: submissionId, reviewed_by: user.id });
    } finally {
      setReviewingId(null);
    }
  };

  const getGradeState = (sub: any) => {
    return editingGrade[sub.id] || { grade: sub.grade || '', remarks: sub.remarks || '' };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-success/10 text-center">
          <p className="text-lg font-bold text-success">{submittedCount}</p>
          <p className="text-xs text-muted-foreground">Submitted</p>
        </div>
        <div className="p-3 rounded-lg bg-warning/10 text-center">
          <p className="text-lg font-bold text-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10 text-center">
          <p className="text-lg font-bold text-destructive">{lateCount}</p>
          <p className="text-xs text-muted-foreground">Late</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 text-center">
          <p className="text-lg font-bold text-primary">{submissionRate}%</p>
          <p className="text-xs text-muted-foreground">Rate</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="late">Late</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section A: Submitted */}
      {submittedFiltered.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            Submitted ({submittedFiltered.length})
          </h4>
          {submittedFiltered.map(sub => {
            const gradeState = getGradeState(sub);
            const isGraded = sub.status === 'graded';
            return (
              <div key={sub.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={sub.students?.full_name || 'Student'} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{sub.students?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.submitted_at ? formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    sub.status === 'late' ? 'border-warning text-warning' :
                    isGraded ? 'border-success text-success' :
                    'border-primary text-primary'
                  )}>
                    {sub.status === 'late' ? 'Late' : isGraded ? '✓ Reviewed' : 'Submitted'}
                  </Badge>
                </div>

                {sub.submission_text && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {sub.submission_text.length > 120
                      ? sub.submission_text.slice(0, 120) + '...'
                      : sub.submission_text}
                  </p>
                )}

                {sub.submission_url && (
                  <a href={sub.submission_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Paperclip className="w-3 h-3" />
                    📎 {sub.attachment_name || 'Submitted File'}
                  </a>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Grade</label>
                    <Input
                      placeholder="A+, B, 90..."
                      value={gradeState.grade}
                      onChange={e => setEditingGrade(prev => ({
                        ...prev,
                        [sub.id]: { ...gradeState, grade: e.target.value }
                      }))}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Remarks</label>
                    <Input
                      placeholder="Remarks..."
                      value={gradeState.remarks}
                      onChange={e => setEditingGrade(prev => ({
                        ...prev,
                        [sub.id]: { ...gradeState, remarks: e.target.value }
                      }))}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isGraded && (
                    <Button size="sm" variant="outline" onClick={() => handleMarkReviewed(sub.id)}
                      disabled={reviewingId === sub.id}>
                      {reviewingId === sub.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                      Mark as Reviewed
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleSaveGrade(sub.id)}
                    disabled={savingId === sub.id}>
                    {savingId === sub.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                    Save
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section B: Pending */}
      {pendingFiltered.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            Pending ({pendingFiltered.length})
          </h4>
          {pendingFiltered.map(sub => (
            <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <StudentAvatar name={sub.students?.full_name || 'Student'} size="sm" />
                <p className="text-sm font-medium text-foreground">{sub.students?.full_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">No submission yet</span>
                <Badge variant="outline" className="border-destructive text-destructive">Pending</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredSubmissions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No submissions found.</p>
      )}
    </div>
  );
}
