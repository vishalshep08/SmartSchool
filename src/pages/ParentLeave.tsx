import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParentData } from '@/hooks/useParentData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarOff, Send, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function ParentLeave() {
  const { linkedStudents, parentRecord, isLoading: loadingParent } = useParentData();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const selectedChild = linkedStudents[selectedChildIndex] || null;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    from_date: '',
    to_date: '',
    leave_type: '',
    reason: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch leave requests for selected child
  const { data: leaveRequests = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['parent-student-leaves', selectedChild?.id],
    queryFn: async () => {
      if (!selectedChild?.id || !parentRecord?.id) return [];
      const { data, error } = await supabase
        .from('student_leave_requests')
        .select('*')
        .eq('student_id', selectedChild.id)
        .eq('parent_id', parentRecord.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedChild?.id && !!parentRecord?.id,
  });

  // Submit leave mutation
  const submitLeave = useMutation({
    mutationFn: async () => {
      if (!selectedChild?.id || !parentRecord?.id || !selectedChild.class_id) throw new Error('Missing data');
      const { error } = await supabase.from('student_leave_requests').insert({
        student_id: selectedChild.id,
        parent_id: parentRecord.id,
        class_id: selectedChild.class_id,
        from_date: form.from_date,
        to_date: form.to_date,
        leave_type: form.leave_type,
        reason: form.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Leave request submitted successfully. Pending Class Teacher approval.');
      setForm({ from_date: '', to_date: '', leave_type: '', reason: '' });
      setFormErrors({});
      queryClient.invalidateQueries({ queryKey: ['parent-student-leaves'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Cancel leave mutation
  const cancelLeave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Leave request cancelled.');
      queryClient.invalidateQueries({ queryKey: ['parent-student-leaves'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validate = () => {
    const errors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];
    if (!form.from_date) errors.from_date = 'From date is required';
    else if (form.from_date < today) errors.from_date = 'Leave cannot be applied for a past date';
    if (!form.to_date) errors.to_date = 'To date is required';
    else if (form.to_date < form.from_date) errors.to_date = 'End date must be on or after the start date';
    if (!form.leave_type) errors.leave_type = 'Please select a leave type';
    if (!form.reason || form.reason.trim().length < 10) errors.reason = 'Please provide a reason (minimum 10 characters)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) submitLeave.mutate();
  };

  if (loadingParent) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Leave — {selectedChild?.full_name || 'Select Child'}
      </h1>

      {linkedStudents.length > 1 && (
        <Tabs value={selectedChildIndex.toString()} onValueChange={v => setSelectedChildIndex(parseInt(v))}>
          <TabsList>
            {linkedStudents.map((child: any, idx: number) => (
              <TabsTrigger key={child.id} value={idx.toString()}>{child.full_name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {selectedChild ? (
        <Tabs defaultValue="apply">
          <TabsList>
            <TabsTrigger value="apply">Apply for Leave</TabsTrigger>
            <TabsTrigger value="history">Leave History</TabsTrigger>
          </TabsList>

          <TabsContent value="apply">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarOff className="h-5 w-5 text-primary" />
                  Apply for Leave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>From Date *</Label>
                      <Input type="date" value={form.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))} className="mt-1" />
                      {formErrors.from_date && <p className="text-xs text-destructive mt-1">{formErrors.from_date}</p>}
                    </div>
                    <div>
                      <Label>To Date *</Label>
                      <Input type="date" value={form.to_date} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))} className="mt-1" />
                      {formErrors.to_date && <p className="text-xs text-destructive mt-1">{formErrors.to_date}</p>}
                    </div>
                  </div>

                  <div>
                    <Label>Leave Type *</Label>
                    <Select value={form.leave_type} onValueChange={v => setForm(p => ({ ...p, leave_type: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.leave_type && <p className="text-xs text-destructive mt-1">{formErrors.leave_type}</p>}
                  </div>

                  <div>
                    <Label>Reason *</Label>
                    <Textarea
                      value={form.reason}
                      onChange={e => setForm(p => ({ ...p, reason: e.target.value.slice(0, 500) }))}
                      placeholder="Explain the reason for leave..."
                      rows={4}
                      className="mt-1"
                    />
                    <div className="flex justify-between mt-1">
                      {formErrors.reason && <p className="text-xs text-destructive">{formErrors.reason}</p>}
                      <p className="text-xs text-muted-foreground ml-auto">{form.reason.length}/500</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">Your leave request will be sent to the Class Teacher for approval.</p>

                  <Button type="submit" disabled={submitLeave.isPending}>
                    {submitLeave.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Apply for Leave
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            {loadingLeaves ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
            ) : leaveRequests.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No leave requests yet.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((req: any) => {
                  const days = differenceInCalendarDays(new Date(req.to_date), new Date(req.from_date)) + 1;
                  return (
                    <Card key={req.id}>
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">
                                {format(new Date(req.from_date), 'dd MMM yyyy')} — {format(new Date(req.to_date), 'dd MMM yyyy')}
                              </span>
                              <span className="text-sm text-muted-foreground">({days} day{days > 1 ? 's' : ''})</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="capitalize">{req.leave_type}</Badge>
                              <Badge className={cn('capitalize', statusColors[req.status])}>{req.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{req.reason}</p>
                            {req.teacher_note && (
                              <p className="text-sm mt-2 p-2 rounded bg-muted">
                                <span className="font-medium">Teacher note:</span> {req.teacher_note}
                              </p>
                            )}
                          </div>
                          {req.status === 'pending' && (
                            <Button variant="outline" size="sm" onClick={() => cancelLeave.mutate(req.id)} disabled={cancelLeave.isPending}>
                              Cancel Request
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>
      )}
    </div>
  );
}
