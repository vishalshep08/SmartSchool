import { useState } from 'react';
import { useStudentFees, useFeePendingNotifications } from '@/hooks/useStudentFees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Send, Users, Clock } from 'lucide-react';
import { formatCurrencyINR, formatDateIndian } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { useSchoolName } from '@/hooks/useSettings';

export function FeeRemindersTab() {
  const schoolName = useSchoolName();
  const { studentFees, isLoading: feesLoading } = useStudentFees({ status: 'Partial' });
  const { history, historyLoading, sendReminders } = useFeePendingNotifications();

  // Fetch parents to get user_ids
  const { data: parents } = useQuery({
    queryKey: ['parents-for-reminders'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('parents').select('id, user_id, name, email');
      return data || [];
    },
  });

  const pending = studentFees.filter(sf => sf.balance_amount > 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notifType, setNotifType] = useState('in_app');
  const [customMessage, setCustomMessage] = useState('');
  const [dialogTarget, setDialogTarget] = useState<any>(null); // single reminder target
  const [bulkOpen, setBulkOpen] = useState(false);

  const buildMessage = (sf: any, parentName: string) => {
    const cls = sf.fee_structures?.classes;
    return customMessage ||
      `Dear ${parentName}, this is a reminder that the school fee for ${sf.students?.full_name} (Class ${cls?.name || '-'}) is pending. Outstanding amount: ₹${sf.balance_amount}. Kindly clear the dues at the earliest to avoid any inconvenience. Contact the school office for payment. — ${schoolName || 'The School'}`;
  };

  const getSfParent = (sf: any) => {
    return parents?.find((p: any) => p.id === sf.students?.parent_id) || null;
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSendSingle = () => {
    if (!dialogTarget) return;
    const parent = getSfParent(dialogTarget);
    sendReminders.mutateAsync([{
      student_id: dialogTarget.student_id,
      parent_id: parent?.id || null,
      parent_user_id: parent?.user_id,
      amount_pending: dialogTarget.balance_amount,
      notification_type: notifType,
      message: buildMessage(dialogTarget, parent?.name || 'Parent'),
      academic_year: dialogTarget.academic_year,
    }]).then(() => setDialogTarget(null));
  };

  const handleSendBulk = () => {
    const items = pending.filter(sf => selected.has(sf.id));
    const reminders = items.map(sf => {
      const parent = getSfParent(sf);
      return {
        student_id: sf.student_id,
        parent_id: parent?.id || null,
        parent_user_id: parent?.user_id || '',
        amount_pending: sf.balance_amount,
        notification_type: notifType,
        message: buildMessage(sf, parent?.name || 'Parent'),
        academic_year: sf.academic_year,
      };
    });
    sendReminders.mutateAsync(reminders).then(() => { setBulkOpen(false); setSelected(new Set()); });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send">Send Reminders</TabsTrigger>
          <TabsTrigger value="history">Reminder History</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          {/* Toolbar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button size="sm" onClick={() => setBulkOpen(true)}>
                <Send className="h-3 w-3 mr-1" /> Send Bulk Reminder
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}

          {feesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No students with pending fees.</div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={selected.size === pending.length}
                          onCheckedChange={v => setSelected(v ? new Set(pending.map(sf => sf.id)) : new Set())}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map(sf => (
                      <TableRow key={sf.id} className={cn('table-row-hover', selected.has(sf.id) && 'bg-primary/5')}>
                        <TableCell>
                          <Checkbox checked={selected.has(sf.id)} onCheckedChange={() => toggleSelect(sf.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{sf.students?.full_name}</TableCell>
                        <TableCell>{sf.fee_structures?.classes?.name} {sf.fee_structures?.classes?.section || ''}</TableCell>
                        <TableCell>{formatCurrencyINR(sf.total_amount)}</TableCell>
                        <TableCell className="text-green-700">{formatCurrencyINR(sf.paid_amount)}</TableCell>
                        <TableCell className="text-destructive font-semibold">{formatCurrencyINR(sf.balance_amount)}</TableCell>
                        <TableCell><span className="badge-warning">Partial</span></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => { setDialogTarget(sf); setCustomMessage(''); setNotifType('in_app'); }}>
                            <Bell className="h-3 w-3 mr-1" /> Remind
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {historyLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No reminders sent yet.</div>
          ) : (
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Sent</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount at Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Message Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h: any) => (
                    <TableRow key={h.id} className="table-row-hover">
                      <TableCell className="text-xs">{formatDateIndian(h.sent_at)}</TableCell>
                      <TableCell className="font-medium">{h.students?.full_name}</TableCell>
                      <TableCell className="text-destructive">{h.amount_pending ? formatCurrencyINR(h.amount_pending) : '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{h.notification_type?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{h.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Single Reminder Dialog */}
      <Dialog open={!!dialogTarget} onOpenChange={() => setDialogTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Fee Reminder</DialogTitle></DialogHeader>
          {dialogTarget && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p><strong>{dialogTarget.students?.full_name}</strong> — Balance: <span className="text-destructive font-bold">{formatCurrencyINR(dialogTarget.balance_amount)}</span></p>
              </div>
              <div>
                <Label>Message (editable)</Label>
                <Textarea
                  value={customMessage || buildMessage(dialogTarget, getSfParent(dialogTarget)?.name || 'Parent')}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={5} className="mt-1 text-sm" />
              </div>
              <div>
                <Label>Notification Type</Label>
                <Select value={notifType} onValueChange={setNotifType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">In-App Only</SelectItem>
                    <SelectItem value="both">Both (In-App + Email)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogTarget(null)} className="flex-1">Cancel</Button>
                <Button className="flex-1" disabled={sendReminders.isPending} onClick={handleSendSingle}>
                  <Send className="h-3 w-3 mr-1" /> Send Reminder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Reminder Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Bulk Reminder to {selected.size} Parents</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message Template</Label>
              <Textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                placeholder="Leave blank to use default template with each student's details"
                rows={4} className="mt-1 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">Dynamic variables per parent will be auto-filled.</p>
            </div>
            <div>
              <Label>Notification Type</Label>
              <Select value={notifType} onValueChange={setNotifType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App Only</SelectItem>
                  <SelectItem value="both">Both (In-App + Email)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{selected.size} parent{selected.size !== 1 ? 's' : ''} will receive this reminder.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(false)} className="flex-1">Cancel</Button>
              <Button className="flex-1" disabled={sendReminders.isPending} onClick={handleSendBulk}>
                <Send className="h-3 w-3 mr-1" /> Send to {selected.size} Parents
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
