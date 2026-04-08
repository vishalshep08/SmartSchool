import { useState, useMemo } from 'react';
import { useParentData } from '@/hooks/useParentData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/dialog';
import { BookOpen, Paperclip, Download, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { formatRelativeDate } from '@/lib/dateUtils';

const subjectColors: Record<string, string> = {
  Mathematics: 'bg-blue-100 text-blue-700',
  Maths: 'bg-blue-100 text-blue-700',
  Science: 'bg-green-100 text-green-700',
  English: 'bg-purple-100 text-purple-700',
  Hindi: 'bg-orange-100 text-orange-700',
  History: 'bg-amber-100 text-amber-700',
  Geography: 'bg-teal-100 text-teal-700',
};

function getSubjectColor(subject: string) {
  return subjectColors[subject] || 'bg-primary/10 text-primary';
}

function getDueLabel(dueDate: string) {
  const d = new Date(dueDate + 'T00:00:00');
  if (isPast(d) && !isToday(d)) return { label: 'Overdue', cls: 'bg-destructive/10 text-destructive' };
  if (isToday(d)) return { label: 'Due Today', cls: 'bg-destructive/10 text-destructive' };
  if (isTomorrow(d)) return { label: 'Due Tomorrow', cls: 'bg-warning/10 text-warning' };
  return { label: `Due ${format(d, 'd MMM')}`, cls: 'bg-muted text-muted-foreground' };
}

export default function ParentHomework() {
  const { linkedStudents, parentRecord, isLoading: loadingParent } = useParentData();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const queryClient = useQueryClient();

  const selectedChild = linkedStudents[selectedChildIndex] || null;
  const classId = selectedChild?.class_id;

  const { data: homeworkList = [], isLoading: loadingHw } = useQuery({
    queryKey: ['parent-homework', classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await supabase
        .from('homework')
        .select('*, classes(name, section)')
        .eq('class_id', classId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
  });

  const { data: readStatuses = [] } = useQuery({
    queryKey: ['parent-read-statuses', parentRecord?.id],
    queryFn: async () => {
      if (!parentRecord?.id) return [];
      const { data, error } = await supabase
        .from('homework_read_status')
        .select('homework_id')
        .eq('parent_id', parentRecord.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!parentRecord?.id,
  });

  const readIds = useMemo(() => new Set(readStatuses.map(r => r.homework_id)), [readStatuses]);

  const markAsRead = useMutation({
    mutationFn: async (homeworkId: string) => {
      if (!parentRecord?.id || readIds.has(homeworkId)) return;
      const { error } = await supabase
        .from('homework_read_status')
        .upsert({ homework_id: homeworkId, parent_id: parentRecord.id }, { onConflict: 'homework_id,parent_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-read-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['parent-unread-homework'] });
    },
  });

  // Subjects list
  const subjects = useMemo(() => [...new Set(homeworkList.map((h: any) => h.subject))], [homeworkList]);

  // Filter
  const filtered = useMemo(() => {
    let list = [...homeworkList];
    if (subjectFilter !== 'all') list = list.filter((h: any) => h.subject === subjectFilter);
    if (statusFilter === 'unread') list = list.filter((h: any) => !readIds.has(h.id));
    if (statusFilter === 'read') list = list.filter((h: any) => readIds.has(h.id));
    const now = new Date();
    if (dateFilter === 'today') {
      list = list.filter((h: any) => isToday(new Date(h.due_date + 'T00:00:00')));
    } else if (dateFilter === 'week') {
      const ws = startOfWeek(now, { weekStartsOn: 1 });
      const we = endOfWeek(now, { weekStartsOn: 1 });
      list = list.filter((h: any) => {
        const d = new Date(h.due_date + 'T00:00:00');
        return d >= ws && d <= we;
      });
    } else if (dateFilter === 'month') {
      const ms = startOfMonth(now);
      const me = endOfMonth(now);
      list = list.filter((h: any) => {
        const d = new Date(h.due_date + 'T00:00:00');
        return d >= ms && d <= me;
      });
    }
    return list;
  }, [homeworkList, subjectFilter, dateFilter, statusFilter, readIds]);

  const openDetail = (hw: any) => {
    setSelectedHw(hw);
    markAsRead.mutate(hw.id);
  };

  if (loadingParent) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Homework {selectedChild ? `— ${selectedChild.full_name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">View homework assigned to your child's class</p>
      </div>

      {linkedStudents.length > 1 && (
        <Tabs value={selectedChildIndex.toString()} onValueChange={v => setSelectedChildIndex(parseInt(v))}>
          <TabsList>
            {linkedStudents.map((child: any, idx: number) => (
              <TabsTrigger key={child.id} value={idx.toString()}>{child.full_name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Date" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Homework List */}
      {loadingHw ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {homeworkList.length === 0
                ? 'No homework has been posted yet. Check back after school hours.'
                : 'No homework found. Try changing the filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((hw: any) => {
            const due = getDueLabel(hw.due_date);
            const isUnread = !readIds.has(hw.id);
            return (
              <Card
                key={hw.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(hw)}
              >
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getSubjectColor(hw.subject)} variant="secondary">{hw.subject}</Badge>
                        <Badge className={due.cls} variant="secondary">{due.label}</Badge>
                        {isUnread && <Badge className="bg-primary text-primary-foreground">New</Badge>}
                        {hw.file_url && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="w-3 h-3" /> 1 file
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mt-2">{hw.title}</h3>
                      {hw.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{hw.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Posted {formatRelativeDate(hw.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedHw} onOpenChange={(open) => { if (!open) setSelectedHw(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{selectedHw?.title}</DialogTitle>
          </DialogHeader>
          {selectedHw && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getSubjectColor(selectedHw.subject)} variant="secondary">{selectedHw.subject}</Badge>
                <Badge className={getDueLabel(selectedHw.due_date).cls} variant="secondary">
                  {getDueLabel(selectedHw.due_date).label}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Due: {format(new Date(selectedHw.due_date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}</p>
                <p>Posted: {formatRelativeDate(selectedHw.created_at)}</p>
              </div>
              {selectedHw.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Instructions</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedHw.description}</p>
                </div>
              )}
              {selectedHw.file_url && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Attachments</h4>
                  <a
                    href={selectedHw.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4 text-primary" />
                    {selectedHw.file_name || 'Download attachment'}
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
