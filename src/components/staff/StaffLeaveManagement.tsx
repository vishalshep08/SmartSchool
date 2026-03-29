import { useState, useMemo } from 'react';
import { useLeaves, LeaveType, LeaveStatus } from '@/hooks/useLeaves';
import { useTeachers } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateIndian } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Check, X, Calendar, Clock, Loader2 } from 'lucide-react';

const leaveTypes: { value: LeaveType; label: string }[] = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'other', label: 'Other' },
];

const statusColors: Record<LeaveStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export function StaffLeaveManagement() {
  const { role, user } = useAuth();
  const { leaves, isLoading, createLeave, updateLeaveStatus, cancelLeave, refetch } = useLeaves();
  const { teachers } = useTeachers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useRealtimeSubscription({ table: 'teacher_leaves', onChange: refetch });

  const currentTeacher = teachers.find(t => t.user_id === user?.id);

  const [formData, setFormData] = useState<{
    leave_type: LeaveType; start_date: string; end_date: string; reason: string;
  }>({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });

  const filteredLeaves = useMemo(() => {
    let result = role === 'teacher' && currentTeacher
      ? leaves.filter(l => l.teacher_id === currentTeacher.id)
      : leaves;
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter(l => l.leave_type === typeFilter);
    return result;
  }, [leaves, role, currentTeacher, statusFilter, typeFilter]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitLeave = async () => {
    try {
      if (!formData.leave_type) return toast.error('Leave type is required');
      if (!formData.start_date) return toast.error('Start date is required');
      if (!formData.end_date) return toast.error('End date is required');
      
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) return toast.error('Start date cannot be in the past');
      if (endDate < startDate) return toast.error('End date must be on or after start date');
      if (!formData.reason || formData.reason.length < 10) return toast.error('Reason is required (minimum 10 characters)');

      setIsSubmitting(true);

      // Step 1: Get teacher record id from teachers table
      const { data: teacherRecord, error: teacherErr } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user!.id) // match by auth uid
        .single();

      if (teacherErr || !teacherRecord) {
        console.error('Teacher record not found:', teacherErr);
        toast.error('Teacher record not found. Contact administrator.');
        return;
      }

      await createLeave.mutateAsync({
        teacher_id: teacherRecord.id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
      });

      setIsDialogOpen(false);
      setFormData({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
      toast.success('Leave request submitted successfully');
    } catch (err: any) {
      console.error('[LEAVE] Unexpected error:', err);
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Leave Management</h2>
          <p className="text-sm text-muted-foreground">Review and manage staff leave requests</p>
        </div>
        {role === 'teacher' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Apply Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Leave Type</Label>
                  <Select value={formData.leave_type} onValueChange={(v: LeaveType) => setFormData(p => ({ ...p, leave_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{leaveTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} /></div>
                </div>
                <div><Label>Reason</Label><Textarea value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Provide details (min 10 characters)" /></div>
                <Button onClick={handleSubmitLeave} className="w-full" disabled={isSubmitting || !formData.start_date || !formData.end_date || formData.reason.length < 10}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-warning" /><span className="text-2xl font-bold">{stats.pending}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Check className="h-5 w-5 text-success" /><span className="text-2xl font-bold">{stats.approved}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><X className="h-5 w-5 text-destructive" /><span className="text-2xl font-bold">{stats.rejected}</span></div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Leave Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {leaveTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {role === 'principal' && <TableHead>Employee</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaves.length === 0 ? (
              <TableRow><TableCell colSpan={role === 'principal' ? 7 : 6} className="text-center py-8 text-muted-foreground">No leave requests found</TableCell></TableRow>
            ) : filteredLeaves.map(leave => (
              <TableRow key={leave.id}>
                {role === 'principal' && <TableCell className="font-medium">{(leave as any).profiles?.full_name || 'Unknown'}</TableCell>}
                <TableCell className="capitalize">{leave.leave_type}</TableCell>
                <TableCell>{formatDateIndian(new Date(leave.start_date))}</TableCell>
                <TableCell>{formatDateIndian(new Date(leave.end_date))}</TableCell>
                <TableCell className="max-w-[200px] truncate">{leave.reason}</TableCell>
                <TableCell><Badge className={statusColors[leave.status as LeaveStatus]}>{leave.status}</Badge></TableCell>
                <TableCell>
                  {leave.status === 'pending' && (
                    <div className="flex gap-2">
                      {role === 'principal' ? (
                        <>
                          <Button size="sm" variant="outline" className="text-success" onClick={() => updateLeaveStatus.mutateAsync({ id: leave.id, status: 'approved' })}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateLeaveStatus.mutateAsync({ id: leave.id, status: 'rejected' })}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => cancelLeave.mutateAsync(leave.id)}>Cancel</Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
