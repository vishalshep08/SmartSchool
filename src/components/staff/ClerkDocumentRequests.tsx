import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStaff } from '@/hooks/useStaff';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Send, ArrowRight, Clock, CheckCircle2, AlertCircle, Loader2, User, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  submitted:        { label: 'Submitted',        color: 'bg-muted text-muted-foreground' },
  clerk_review:     { label: 'Under Review',     color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  principal_review: { label: 'With Principal',   color: 'bg-orange-100 text-orange-800 border-orange-300' },
  clerk_issuing:    { label: 'Being Prepared',   color: 'bg-blue-100 text-blue-800 border-blue-300' },
  ready:            { label: 'Ready to Download', color: 'bg-green-100 text-green-800 border-green-300' },
  downloaded:       { label: 'Downloaded',       color: 'bg-teal-100 text-teal-800 border-teal-300' },
};

interface DocRequest {
  id: string;
  document_type: string;
  purpose: string;
  other_description: string | null;
  current_stage: string;
  status: string;
  requested_at: string;
  clerk_note: string | null;
  students?: { full_name: string; admission_number: string; class_id: string | null; classes?: { name: string; section?: string | null } | null } | null;
  parents?: { name: string; contact_number: string | null } | null;
}

export function ClerkDocumentRequests() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const queryClient = useQueryClient();

  const [forwardDialog, setForwardDialog] = useState<DocRequest | null>(null);
  const [clerkNote, setClerkNote] = useState('');
  const [issueDialog, setIssueDialog] = useState<DocRequest | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Find current employee record for user
  const currentEmployee = staff.find(s => s.user_id === user?.id);

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ['clerk-doc-requests-pending', currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const selectQuery: string = '*, students:student_id (full_name, admission_number, class_id, classes:class_id (name, section)), parents:parent_id (name, contact_number)';
      const { data, error } = await supabase
        .from('document_requests')
        .select(selectQuery)
        .eq('assigned_clerk_id', currentEmployee.id)
        .eq('current_stage', 'clerk_review')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DocRequest[];
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: issueRequests = [], isLoading: loadingIssue } = useQuery({
    queryKey: ['clerk-doc-requests-issue', currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const selectQuery: string = '*, students:student_id (full_name, admission_number, class_id, classes:class_id (name, section)), parents:parent_id (name, contact_number)';
      const { data, error } = await supabase
        .from('document_requests')
        .select(selectQuery)
        .eq('assigned_clerk_id', currentEmployee.id)
        .eq('current_stage', 'clerk_issuing')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DocRequest[];
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: allRequests = [], isLoading: loadingAll } = useQuery({
    queryKey: ['clerk-doc-requests-all', currentEmployee?.id, stageFilter],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const selectQuery: string = '*, students:student_id (full_name, admission_number, class_id, classes:class_id (name, section)), parents:parent_id (name, contact_number)';
      let q = supabase
        .from('document_requests')
        .select(selectQuery)
        .eq('assigned_clerk_id', currentEmployee.id)
        .order('requested_at', { ascending: false });
      if (stageFilter !== 'all') q = q.eq('current_stage', stageFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DocRequest[];
    },
    enabled: !!currentEmployee?.id,
  });

  const forwardToPrincipal = useMutation({
    mutationFn: async (req: DocRequest) => {
      if (!currentEmployee?.id || !user?.id) throw new Error('Not authenticated');

      // Find principal user_id to notify
      const { data: principalRole } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'principal')
        .maybeSingle();

      const { error } = await supabase
        .from('document_requests')
        .update({
          current_stage: 'principal_review',
          forwarded_to_principal_at: new Date().toISOString(),
          forwarded_by_clerk_id: currentEmployee.id,
          clerk_note: clerkNote.trim() || null,
        })
        .eq('id', req.id);
      if (error) throw error;

      // Insert history row
      await supabase.from('document_request_history').insert({
        document_request_id: req.id,
        stage_from: 'clerk_review',
        stage_to: 'principal_review',
        action_taken_by_user_id: user.id,
        action_taken_by_name: currentEmployee.full_name || 'Clerk',
        action_taken_by_role: 'clerk',
        note: clerkNote.trim() || null,
      });

      // Notify principal
      if (principalRole?.user_id) {
        await supabase.from('notifications').insert({
          user_id: principalRole.user_id,
          title: 'Document Needs Your Signature',
          message: `${req.document_type} request for ${(req as any).students?.full_name || 'a student'} is pending your review and signature.`,
          type: 'document_request',
        });
      }
    },
    onSuccess: () => {
      toast.success('Request forwarded to Principal successfully');
      setForwardDialog(null);
      setClerkNote('');
      queryClient.invalidateQueries({ queryKey: ['clerk-doc-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['clerk-doc-requests-all'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendToParent = useMutation({
    mutationFn: async (req: DocRequest) => {
      if (!currentEmployee?.id || !user?.id) throw new Error('Not authenticated');
      if (!documentUrl.trim()) throw new Error('Document URL is required');

      // Find parent user_id to notify
      const { data: parentData } = await supabase
        .from('parents')
        .select('user_id')
        .eq('id', (req as any).parent_id as string)
        .maybeSingle();

      const { error } = await supabase
        .from('document_requests')
        .update({
          current_stage: 'ready',
          status: 'ready',
          document_url: documentUrl.trim(),
          issued_by_clerk_id: currentEmployee.id,
          issued_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) throw error;

      // Insert history
      await supabase.from('document_request_history').insert({
        document_request_id: req.id,
        stage_from: 'clerk_issuing',
        stage_to: 'ready',
        action_taken_by_user_id: user.id,
        action_taken_by_name: currentEmployee.full_name || 'Clerk',
        action_taken_by_role: 'clerk',
        note: 'Document issued and sent to parent',
      });

      // Notify parent
      if (parentData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: parentData.user_id,
          title: 'Document Ready to Download',
          message: `Your ${req.document_type} for ${(req as any).students?.full_name || 'your child'} is ready. You can download it from your dashboard.`,
          type: 'document_request',
        });
      }
    },
    onSuccess: () => {
      toast.success('Document sent to parent successfully');
      setIssueDialog(null);
      setDocumentUrl('');
      queryClient.invalidateQueries({ queryKey: ['clerk-doc-requests-issue'] });
      queryClient.invalidateQueries({ queryKey: ['clerk-doc-requests-all'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentEmployee) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No employee record found for your account.</p>
        </CardContent>
      </Card>
    );
  }

  const isClerk =
    currentEmployee.employee_type?.toLowerCase() === 'non-teaching' &&
    currentEmployee.department?.toLowerCase() === 'administration' &&
    currentEmployee.designation?.toLowerCase() === 'clerk';

  if (!isClerk) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Document Requests</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Review, forward, and issue requested documents</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending Review
            {pendingRequests.length > 0 && (
              <Badge className="h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="issuing" className="gap-2">
            Ready to Issue
            {issueRequests.length > 0 && (
              <Badge className="h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-blue-600 text-white">
                {issueRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        {/* Pending Review Tab */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {loadingPending ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-40" />)}</div>
          ) : pendingRequests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No pending requests. All caught up!</p>
            </CardContent></Card>
          ) : (
            pendingRequests.map(req => <RequestCard key={req.id} req={req} onForward={() => { setForwardDialog(req); setClerkNote(''); }} />)
          )}
        </TabsContent>

        {/* Ready to Issue Tab */}
        <TabsContent value="issuing" className="space-y-4 mt-4">
          {loadingIssue ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-40" />)}</div>
          ) : issueRequests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No requests ready to issue right now.</p>
            </CardContent></Card>
          ) : (
            issueRequests.map(req => (
              <IssueCard key={req.id} req={req} onIssue={() => { setIssueDialog(req); setDocumentUrl(''); }} />
            ))
          )}
        </TabsContent>

        {/* All Requests Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(STAGE_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loadingAll ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
          ) : allRequests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No requests found.</CardContent></Card>
          ) : (
            allRequests.map(req => <RequestCard key={req.id} req={req} compact />)
          )}
        </TabsContent>
      </Tabs>

      {/* Forward to Principal Dialog */}
      <Dialog open={!!forwardDialog} onOpenChange={open => !open && setForwardDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Forward to Principal
            </DialogTitle>
            <DialogDescription>
              Review the request details and add an optional note for the Principal.
            </DialogDescription>
          </DialogHeader>
          {forwardDialog && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                <p><span className="font-medium">Student:</span> {(forwardDialog as any).students?.full_name}</p>
                <p><span className="font-medium">Class:</span> {(forwardDialog as any).students?.classes?.name} {(forwardDialog as any).students?.classes?.section && `- ${(forwardDialog as any).students?.classes?.section}`}</p>
                <p><span className="font-medium">Document Type:</span> {forwardDialog.document_type}</p>
                <p><span className="font-medium">Purpose:</span> {forwardDialog.purpose}</p>
                <p><span className="font-medium">Requested:</span> {format(new Date(forwardDialog.requested_at), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <Label>Note for Principal (optional)</Label>
                <Textarea
                  value={clerkNote}
                  onChange={e => setClerkNote(e.target.value)}
                  placeholder="Add any additional context for the Principal..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardDialog(null)}>Cancel</Button>
            <Button
              onClick={() => forwardDialog && forwardToPrincipal.mutate(forwardDialog)}
              disabled={forwardToPrincipal.isPending}
            >
              {forwardToPrincipal.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Forward to Principal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Document Dialog */}
      <Dialog open={!!issueDialog} onOpenChange={open => !open && setIssueDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Issue Document to Parent
            </DialogTitle>
            <DialogDescription>
              Add the document URL/link and confirm to send to the parent.
            </DialogDescription>
          </DialogHeader>
          {issueDialog && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                <p><span className="font-medium">Student:</span> {(issueDialog as any).students?.full_name}</p>
                <p><span className="font-medium">Document:</span> {issueDialog.document_type}</p>
                {(issueDialog as any).principal_signed_at && (
                  <p className="text-green-700 font-medium">✓ Signed by Principal on {format(new Date((issueDialog as any).principal_signed_at), 'dd MMM yyyy')}</p>
                )}
                {(issueDialog as any).principal_note && (
                  <p><span className="font-medium">Principal's note:</span> {(issueDialog as any).principal_note}</p>
                )}
              </div>
              <div>
                <Label>Document URL / Link <span className="text-destructive">*</span></Label>
                <Textarea
                  value={documentUrl}
                  onChange={e => setDocumentUrl(e.target.value)}
                  placeholder="Paste the final document URL or storage link here..."
                  rows={2}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Upload the signed document to storage and paste the link here.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialog(null)}>Cancel</Button>
            <Button
              onClick={() => issueDialog && sendToParent.mutate(issueDialog)}
              disabled={sendToParent.isPending || !documentUrl.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendToParent.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send to Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ req, onForward, compact }: { req: DocRequest; onForward?: () => void; compact?: boolean }) {
  const stage = STAGE_LABELS[req.current_stage] || STAGE_LABELS.submitted;
  const student = (req as any).students;
  const parent = (req as any).parents;

  return (
    <Card className="border border-border/60">
      <CardContent className={cn('pt-4', compact && 'pb-4')}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground">{req.document_type}</span>
              <Badge className={cn('text-xs border', stage.color)}>{stage.label}</Badge>
            </div>
            {student && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{student.full_name}</span>
                {student.classes && <span>— {student.classes.name}{student.classes.section ? ` ${student.classes.section}` : ''}</span>}
                <span>• #{student.admission_number}</span>
              </div>
            )}
            {parent && !compact && (
              <p className="text-xs text-muted-foreground">Parent: {parent.name} {parent.contact_number && `• ${parent.contact_number}`}</p>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2">{req.purpose}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Requested: {format(new Date(req.requested_at), 'dd MMM yyyy')}
            </div>
          </div>
          {onForward && (
            <Button onClick={onForward} size="sm" className="shrink-0">
              <ArrowRight className="h-4 w-4 mr-1.5" />
              Forward to Principal
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IssueCard({ req, onIssue }: { req: DocRequest; onIssue: () => void }) {
  const student = (req as any).students;

  return (
    <Card className="border border-blue-200 bg-blue-50/30">
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-foreground">{req.document_type}</span>
              <Badge className="text-xs border bg-blue-100 text-blue-800 border-blue-300">Ready to Issue</Badge>
            </div>
            {student && (
              <div className="flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{student.full_name}</span>
                {student.classes && <span className="text-muted-foreground">— {student.classes.name}{student.classes.section ? ` ${student.classes.section}` : ''}</span>}
              </div>
            )}
            {(req as any).principal_signed_at && (
              <p className="text-xs text-green-700 font-medium">
                ✓ Signed by Principal on {format(new Date((req as any).principal_signed_at), 'dd MMM yyyy')}
              </p>
            )}
            {(req as any).principal_note && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Principal's note:</span> {(req as any).principal_note}
              </p>
            )}
          </div>
          <Button onClick={onIssue} size="sm" className="shrink-0 bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-1.5" />
            Generate & Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
