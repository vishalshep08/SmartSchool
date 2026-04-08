import { useState } from 'react';
import { useIssues } from '@/hooks/useIssues';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, AlertCircle, Clock, CheckCircle, XCircle, MessageSquare, Laptop, Calendar, User, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateIndian } from '@/lib/dateUtils';
import type { Database } from '@/integrations/supabase/types';

type IssueType = Database['public']['Enums']['issue_type'];
type IssueStatus = Database['public']['Enums']['issue_status'];
type IssuePriority = Database['public']['Enums']['issue_priority'];

const typeConfig: Record<IssueType, { icon: React.ElementType; color: string }> = {
  classroom: { icon: MessageSquare, color: 'bg-primary/10 text-primary' },
  timetable: { icon: Calendar, color: 'bg-warning/10 text-warning' },
  leave_request: { icon: User, color: 'bg-success/10 text-success' },
  technical: { icon: Laptop, color: 'bg-destructive/10 text-destructive' },
};

const statusConfig: Record<IssueStatus, { icon: React.ElementType; color: string; label: string }> = {
  open: { icon: AlertCircle, color: 'bg-destructive/10 text-destructive', label: 'Open' },
  in_review: { icon: Clock, color: 'bg-warning/10 text-warning', label: 'In Review' },
  resolved: { icon: CheckCircle, color: 'bg-success/10 text-success', label: 'Resolved' },
  rejected: { icon: XCircle, color: 'bg-muted text-muted-foreground', label: 'Rejected' },
};

const priorityConfig: Record<IssuePriority, { color: string }> = {
  low: { color: 'bg-muted text-muted-foreground' },
  medium: { color: 'bg-warning/10 text-warning' },
  high: { color: 'bg-destructive/10 text-destructive' },
  urgent: { color: 'bg-destructive text-destructive-foreground' },
};

export function StaffIssues() {
  const { role } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '', description: '', type: '' as IssueType | '', priority: 'medium' as IssuePriority,
  });

  const { issues, isLoading, createIssue, acceptIssue, rejectIssue, resolveIssue } = useIssues(statusFilter);
  const isPrincipal = role === 'principal';
  const canRaiseIssue = role === 'teacher';

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) return;
    await createIssue.mutateAsync({ title: formData.title, description: formData.description, type: formData.type, priority: formData.priority });
    setIsDialogOpen(false);
    setFormData({ title: '', description: '', type: '', priority: 'medium' });
  };

  const stats = {
    open: issues.filter(i => i.status === 'open').length,
    in_review: issues.filter(i => i.status === 'in_review').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Issues Raised</h2>
          <p className="text-sm text-muted-foreground">Manage and resolve staff issues</p>
        </div>
        {canRaiseIssue && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Raise Issue</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Raise New Issue</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateIssue} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as IssueType })}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classroom">Classroom</SelectItem>
                        <SelectItem value="timetable">Timetable</SelectItem>
                        <SelectItem value="leave_request">Leave Request</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v as IssuePriority })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Title *</Label><Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Description *</Label><Textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1.5 min-h-32" /></div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createIssue.isPending}>{createIssue.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(stats).map(([status, count]) => {
          const config = statusConfig[status as IssueStatus];
          const Icon = config.icon;
          return (
            <div key={status} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{config.label}</p><p className="text-2xl font-bold">{count}</p></div>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.color)}><Icon className="w-5 h-5" /></div>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="all" onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_review">In Review</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {issues.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No issues found</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map(issue => {
            const typeConf = typeConfig[issue.type];
            const statusConf = statusConfig[issue.status];
            const priorityConf = priorityConfig[issue.priority];
            const TypeIcon = typeConf.icon;
            const StatusIcon = statusConf.icon;
            return (
              <div key={issue.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', typeConf.color)}><TypeIcon className="w-6 h-6" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold">{issue.title}</h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', priorityConf.color)}>{issue.priority}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1', statusConf.color)}><StatusIcon className="w-3 h-3" />{statusConf.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
                    {issue.resolution_notes && (
                      <div className="p-3 rounded-lg bg-success/5 border border-success/20 mb-3">
                        <p className="text-sm text-success"><strong>Resolution:</strong> {issue.resolution_notes}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Created: {formatDateIndian(new Date(issue.created_at))}</p>
                  </div>
                  {isPrincipal && issue.status === 'open' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => rejectIssue.mutateAsync({ id: issue.id, resolution_notes: 'Rejected' })}>Reject</Button>
                      <Button size="sm" onClick={() => acceptIssue.mutateAsync(issue.id)}>Accept</Button>
                    </div>
                  )}
                  {isPrincipal && issue.status === 'in_review' && (
                    <Button size="sm" onClick={() => resolveIssue.mutateAsync({ id: issue.id, resolution_notes: 'Resolved' })}>Resolve</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
