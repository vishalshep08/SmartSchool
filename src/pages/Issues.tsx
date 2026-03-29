import { useState } from 'react';
import { useIssues } from '@/hooks/useIssues';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Laptop,
  Calendar,
  User,
  Loader2
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

export default function Issues() {
  const { role } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '' as IssueType | '',
    priority: 'medium' as IssuePriority,
  });

  const { 
    issues, 
    isLoading, 
    createIssue, 
    acceptIssue, 
    rejectIssue, 
    resolveIssue 
  } = useIssues(statusFilter);

  const isPrincipal = role === 'principal';
  const canRaiseIssue = role === 'teacher';

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) return;
    
    await createIssue.mutateAsync({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      priority: formData.priority,
    });
    setIsDialogOpen(false);
    setFormData({
      title: '',
      description: '',
      type: '',
      priority: 'medium',
    });
  };

  const handleAccept = async (id: string) => {
    await acceptIssue.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    await rejectIssue.mutateAsync({ id, resolution_notes: 'Rejected by principal.' });
  };

  const handleResolve = async (id: string) => {
    await resolveIssue.mutateAsync({ id, resolution_notes: 'Issue has been resolved.' });
  };

  const stats = {
    open: issues.filter(i => i.status === 'open').length,
    in_review: issues.filter(i => i.status === 'in_review').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
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
          <h1 className="font-display text-3xl font-bold text-foreground">Issues & Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage and resolve staff issues</p>
        </div>
        
        {canRaiseIssue && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" />
                Raise Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Raise New Issue</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateIssue} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(v) => setFormData({ ...formData, type: v as IssueType })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classroom">Classroom Issue</SelectItem>
                        <SelectItem value="timetable">Timetable Issue</SelectItem>
                        <SelectItem value="leave_request">Leave Request</SelectItem>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(v) => setFormData({ ...formData, priority: v as IssuePriority })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Title *</Label>
                  <Input 
                    required
                    placeholder="Brief title for the issue" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1.5" 
                  />
                </div>
                
                <div>
                  <Label>Description *</Label>
                  <Textarea 
                    required
                    placeholder="Describe the issue in detail..." 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1.5 min-h-32"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" disabled={createIssue.isPending}>
                    {createIssue.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Issue
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(stats).map(([status, count], index) => {
          const config = statusConfig[status as IssueStatus];
          const Icon = config.icon;
          
          return (
            <div 
              key={status}
              className="glass-card p-4 opacity-0 animate-fade-up"
              style={{ animationDelay: `${index * 50 + 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1">{count}</p>
                </div>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" onValueChange={setStatusFilter} className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_review">In Review</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-up">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No issues found</h3>
          <p className="text-muted-foreground text-sm">
            {statusFilter !== 'all' ? 'No issues with this status.' : 'No issues have been raised yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue, index) => {
            const typeConf = typeConfig[issue.type];
            const statusConf = statusConfig[issue.status];
            const priorityConf = priorityConfig[issue.priority];
            const TypeIcon = typeConf.icon;
            const StatusIcon = statusConf.icon;
            
            return (
              <div 
                key={issue.id}
                className="glass-card p-6 opacity-0 animate-fade-up hover-lift"
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', typeConf.color)}>
                    <TypeIcon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-display font-semibold text-foreground">{issue.title}</h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', priorityConf.color)}>
                        {issue.priority}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1', statusConf.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
                    
                    {issue.resolution_notes && (
                      <div className="p-3 rounded-lg bg-success/5 border border-success/20 mb-3">
                        <p className="text-sm text-success">
                          <strong>Resolution:</strong> {issue.resolution_notes}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {formatDateIndian(new Date(issue.created_at))}</span>
                      {issue.updated_at !== issue.created_at && (
                        <span>Updated: {formatDateIndian(new Date(issue.updated_at))}</span>
                      )}
                    </div>
                  </div>
                  
                  {isPrincipal && issue.status === 'open' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReject(issue.id)}
                        disabled={rejectIssue.isPending}
                      >
                        Reject
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleAccept(issue.id)}
                        disabled={acceptIssue.isPending}
                      >
                        Accept
                      </Button>
                    </div>
                  )}
                  {isPrincipal && issue.status === 'in_review' && (
                    <Button 
                      size="sm" 
                      variant="success"
                      onClick={() => handleResolve(issue.id)}
                      disabled={resolveIssue.isPending}
                    >
                      Resolve
                    </Button>
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
