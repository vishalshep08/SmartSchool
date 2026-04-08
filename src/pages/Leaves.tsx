import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaves, LeaveType, LeaveStatus, CreateLeaveData } from '@/hooks/useLeaves';
import { useTeachers } from '@/hooks/useTeachers';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { formatDateIndian } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Plus,
  Check,
  X,
  Calendar,
  Clock,
  Loader2
} from 'lucide-react';

const leaveTypes: { value: LeaveType; label: string }[] = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'other', label: 'Other' },
];

const statusColors: Record<LeaveStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function Leaves() {
  const { role, user } = useAuth();
  const { leaves, isLoading, createLeave, updateLeaveStatus, cancelLeave, refetch } = useLeaves();
  const { teachers } = useTeachers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Realtime subscription
  useRealtimeSubscription({
    table: 'teacher_leaves',
    onChange: refetch,
  });

  // Get current teacher's ID for teacher role
  const currentTeacher = teachers.find(t => t.user_id === user?.id);

  const [formData, setFormData] = useState<{
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason: string;
  }>({
    leave_type: 'casual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const handleSubmitLeave = async () => {
    if (!currentTeacher) return;

    const leaveData: CreateLeaveData = {
      teacher_id: currentTeacher.id,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason,
    };

    await createLeave.mutateAsync(leaveData);
    setIsDialogOpen(false);
    setFormData({
      leave_type: 'casual',
      start_date: '',
      end_date: '',
      reason: '',
    });
  };

  const handleApprove = async (id: string) => {
    await updateLeaveStatus.mutateAsync({ id, status: 'approved', approval_notes: approvalNotes });
    setSelectedLeave(null);
    setApprovalNotes('');
  };

  const handleReject = async (id: string) => {
    await updateLeaveStatus.mutateAsync({ id, status: 'rejected', approval_notes: approvalNotes });
    setSelectedLeave(null);
    setApprovalNotes('');
  };

  const handleCancel = async (id: string) => {
    await cancelLeave.mutateAsync(id);
  };

  // Filter leaves based on role
  const filteredLeaves = role === 'teacher' && currentTeacher
    ? leaves.filter(l => l.teacher_id === currentTeacher.id)
    : leaves;

  // Stats
  const pendingCount = filteredLeaves.filter(l => l.status === 'pending').length;
  const approvedCount = filteredLeaves.filter(l => l.status === 'approved').length;
  const rejectedCount = filteredLeaves.filter(l => l.status === 'rejected').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {role === 'principal' ? 'Leave Management' : 'My Leaves'}
          </h1>
          <p className="text-muted-foreground">
            {role === 'principal'
              ? 'Review and manage teacher leave requests'
              : 'Apply for and track your leave requests'
            }
          </p>
        </div>

        {role === 'teacher' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Apply Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Leave Type</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value: LeaveType) =>
                      setFormData(prev => ({ ...prev, leave_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Reason</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain your reason for leave..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmitLeave}
                  className="w-full"
                  disabled={!formData.start_date || !formData.end_date || !formData.reason}
                >
                  Submit Leave Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{approvedCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{rejectedCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaves Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {role === 'principal' && <TableHead>Teacher</TableHead>}
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
                <TableRow>
                  <TableCell
                    colSpan={role === 'principal' ? 7 : 6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map(leave => (
                  <TableRow key={leave.id}>
                    {role === 'principal' && (
                      <TableCell className="font-medium">
                        {(leave as any).profiles?.full_name || 'Unknown'}
                      </TableCell>
                    )}
                    <TableCell className="capitalize">{leave.leave_type}</TableCell>
                    <TableCell>{formatDateIndian(new Date(leave.start_date))}</TableCell>
                    <TableCell>{formatDateIndian(new Date(leave.end_date))}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{leave.reason}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[leave.status as LeaveStatus]}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          {role === 'principal' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(leave.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleReject(leave.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(leave.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
