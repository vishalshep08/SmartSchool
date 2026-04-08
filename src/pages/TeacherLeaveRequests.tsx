import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeachers } from '@/hooks/useTeachers';
import { useTeacherClassAssignments } from '@/hooks/useTeacherPermissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CalendarClock, CheckCircle, XCircle } from 'lucide-react';
import { formatDateIndian } from '@/lib/dateUtils';

interface StudentLeaveRequest {
  id: string;
  student_id: string;
  class_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  teacher_note: string | null;
  reviewed_by_teacher_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  students: {
    full_name: string;
    roll_number: string;
    admission_number: string;
    profile_photo_url: string | null;
  };
}

export default function TeacherLeaveRequests() {
  const { user } = useAuth();
  const { teachers } = useTeachers();
  const currentTeacher = teachers.find(t => t.user_id === user?.id);
  const { assignments } = useTeacherClassAssignments(currentTeacher?.id);
  
  const classTeacherAssignment = assignments.find(a => a.is_class_teacher === true);
  const classId = classTeacherAssignment?.class_id;

  const [requests, setRequests] = useState<StudentLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject', request: StudentLeaveRequest } | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!classId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('student_leave_requests')
        .select(`
          *,
          students (
            full_name,
            roll_number,
            admission_number,
            profile_photo_url
          )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [classId]);

  const handleAction = async () => {
    if (!actionDialog || !currentTeacher) return;
    const { type, request } = actionDialog;

    if (type === 'reject' && !note.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const newStatus = type === 'approve' ? 'approved' : 'rejected';
      
      const { error: updateError } = await supabase
        .from('student_leave_requests')
        .update({
          status: newStatus,
          teacher_note: note.trim() || null,
          reviewed_by_teacher_id: currentTeacher.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      if (newStatus === 'approved') {
        const fromDate = new Date(request.from_date);
        const toDate = new Date(request.to_date);
        const dates = [];
        let curr = new Date(fromDate);
        while (curr <= toDate) {
          if (curr.getDay() !== 0) {
            dates.push(new Date(curr).toISOString().split('T')[0]);
          }
          curr.setDate(curr.getDate() + 1);
        }

        const attendanceData = dates.map(date => ({
          student_id: request.student_id,
          class_id: request.class_id,
          date: date,
          status: 'leave',
          marked_by: user?.id,
          academic_year_id: null // Assuming handle automatically or logic elsewhere. Using empty for now as it needs a year, wait let's just use RPC or simple upsert.
        }));
        
        // Find academic year
        const { data: activeYear } = await (supabase as any).from('academic_years').select('id').eq('is_active', true).single();
        if (activeYear) {
          attendanceData.forEach(d => (d.academic_year_id as any) = activeYear.id);
          await (supabase as any).from('student_attendance').upsert(attendanceData, { onConflict: 'student_id, class_id, date' });
        }
      }

      await fetchRequests();
      toast.success(`Leave request ${newStatus}`);
      setActionDialog(null);
      setNote('');
    } catch (error: any) {
      console.error('Error updating leave request:', error);
      toast.error('Failed to process action');
    } finally {
      setSubmitting(false);
    }
  };

  if (!classTeacherAssignment) {
    return (
      <div className="p-8 text-center bg-muted/30 rounded-lg border">
        <h2 className="text-xl font-semibold mb-2">Not a Class Teacher</h2>
        <p className="text-muted-foreground">You do not have a class assigned. Only Class Teachers can manage student leave requests.</p>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Student Leave Requests</h1>
          <p className="text-muted-foreground mt-1">Manage leave requests from parents for your class.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2">{pendingRequests.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
             <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-lg border border-dashed">
              <CalendarClock className="w-12 h-12 text-muted-foreground mb-3 mx-auto opacity-50" />
              <p className="font-medium">No pending requests</p>
              <p className="text-sm text-muted-foreground mt-1">All caught up!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} onAction={(type) => { setActionDialog({ type, request }); setNote(''); }} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {loading ? (
             <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-lg border border-dashed">
              <p className="font-medium text-muted-foreground">No leave requests found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map(request => (
                <RequestCard key={request.id} request={request} showStatus />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog && `For ${actionDialog.request.students?.full_name} (${formatDateIndian(new Date(actionDialog.request.from_date))} to ${formatDateIndian(new Date(actionDialog.request.to_date))})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm bg-muted/50 p-3 rounded-lg border border-border">
              <p className="font-medium text-foreground mb-1">Reason provided by parent:</p>
              <p className="text-muted-foreground">{actionDialog?.request.reason}</p>
            </div>
            <div className="space-y-2">
              <Label>
                {actionDialog?.type === 'approve' ? 'Add a note for the parent (optional)' : 'Reason for rejection (required)'}
              </Label>
              <Textarea
                placeholder={actionDialog?.type === 'approve' ? "Optional: Wishing a speedy recovery, etc." : "Required: Why is this leave rejected?"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog?.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={submitting || (actionDialog?.type === 'reject' && !note.trim())}
              className="gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {actionDialog?.type === 'approve' ? 'Approve Leave' : 'Reject Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ request, onAction, showStatus }: { request: StudentLeaveRequest, onAction?: (type: 'approve' | 'reject') => void, showStatus?: boolean }) {
  const from = new Date(request.from_date);
  const to = new Date(request.to_date);
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;

  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  if (request.status === 'approved') badgeVariant = "default";
  else if (request.status === 'rejected') badgeVariant = "destructive";
  else if (request.status === 'pending') badgeVariant = "secondary";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold overflow-hidden">
            {request.students?.profile_photo_url ? (
               <img src={request.students.profile_photo_url} alt={request.students.full_name} className="w-full h-full object-cover" />
            ) : request.students?.full_name?.charAt(0)}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{request.students?.full_name}</h3>
                <p className="text-sm text-muted-foreground">Roll No: {request.students?.roll_number} • {request.students?.admission_number}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {showStatus && <Badge variant={badgeVariant} className={request.status === 'approved' ? 'bg-green-100 text-green-700' : ''}>{request.status.toUpperCase()}</Badge>}
                <Badge variant="outline">{request.leave_type}</Badge>
              </div>
            </div>
            
            <div className="py-2">
              <div className="text-sm bg-muted/40 p-3 rounded-lg border border-border inline-block w-full">
                 <p className="font-medium text-foreground mb-1">
                   {formatDateIndian(from)} <ArrowRight className="inline w-3 h-3 mx-1" /> {formatDateIndian(to)} 
                   <span className="text-muted-foreground font-normal ml-2">({days} day{days > 1 ? 's' : ''})</span>
                 </p>
                 <p className="text-muted-foreground">{request.reason}</p>
              </div>
            </div>

            {request.teacher_note && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm border-l-2 border-primary mt-2">
                <span className="font-medium text-muted-foreground mr-2">Your Note:</span>
                {request.teacher_note}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">Submitted: {new Date(request.created_at).toLocaleString()}</p>
          </div>
          
          {request.status === 'pending' && onAction && (
             <div className="flex md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
               <Button variant="default" className="flex-1 md:w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => onAction('approve')}>
                 <CheckCircle className="w-4 h-4 mr-2" /> Approve
               </Button>
               <Button variant="destructive" className="flex-1 md:w-full" onClick={() => onAction('reject')}>
                 <XCircle className="w-4 h-4 mr-2" /> Reject
               </Button>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  );
}
