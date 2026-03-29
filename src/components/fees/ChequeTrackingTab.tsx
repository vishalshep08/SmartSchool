import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChequeTracking } from '@/hooks/useStudentFees';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Clock, IndianRupee } from 'lucide-react';
import { formatCurrencyINR, formatDateIndian } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Cleared: 'bg-green-100 text-green-800 border-green-300',
  Bounced: 'bg-red-100 text-red-800 border-red-300',
};

export function ChequeTrackingTab() {
  const { cheques, isLoading, updateCheque } = useChequeTracking();
  const [statusFilter, setStatusFilter] = useState('all');
  const [bounceDialog, setBounceDialog] = useState<any>(null);
  const [bounceReason, setBounceReason] = useState('');
  const [confirmClear, setConfirmClear] = useState<any>(null);

  const filtered = cheques.filter((c: any) =>
    statusFilter === 'all' || c.clearance_status === statusFilter
  );

  const totalPending = cheques.filter((c: any) => c.clearance_status === 'Pending').reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalCleared = cheques.filter((c: any) => c.clearance_status === 'Cleared').reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const bouncedCount = cheques.filter((c: any) => c.clearance_status === 'Bounced').length;
  const bouncedAmount = cheques.filter((c: any) => c.clearance_status === 'Bounced').reduce((s: number, c: any) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Pending Clearance', value: formatCurrencyINR(totalPending), color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Cleared', value: formatCurrencyINR(totalCleared), color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'Bounced', value: `${bouncedCount} (${formatCurrencyINR(bouncedAmount)})`, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={cn('p-4 rounded-xl border font-medium', s.bg)}>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Cleared">Cleared</SelectItem>
            <SelectItem value="Bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No cheque records found.</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Cheque #</TableHead>
                  <TableHead>Cheque Date</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className={cn('table-row-hover', c.clearance_status === 'Bounced' && 'bg-red-50/40')}>
                    <TableCell className="font-mono text-xs">{c.fee_payments?.receipt_number || '-'}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{c.students?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.students?.classes?.name}</p>
                    </TableCell>
                    <TableCell className="font-mono">{c.cheque_number}</TableCell>
                    <TableCell>{formatDateIndian(c.cheque_date)}</TableCell>
                    <TableCell>{c.bank_name}</TableCell>
                    <TableCell className="font-semibold">{formatCurrencyINR(c.amount)}</TableCell>
                    <TableCell>{formatDateIndian(c.received_date)}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border', statusColor[c.clearance_status])}>
                        {c.clearance_status}
                      </Badge>
                      {c.bounce_reason && <p className="text-xs text-red-600 mt-1">{c.bounce_reason}</p>}
                    </TableCell>
                    <TableCell>
                      {c.clearance_status === 'Pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-7 text-xs"
                            onClick={() => setConfirmClear(c)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Clear
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-700 border-red-300 h-7 text-xs"
                            onClick={() => { setBounceDialog(c); setBounceReason(''); }}>
                            <XCircle className="h-3 w-3 mr-1" /> Bounce
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Confirm Clear Dialog */}
      <Dialog open={!!confirmClear} onOpenChange={() => setConfirmClear(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Cheque as Cleared?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark cheque <strong className="font-mono">{confirmClear?.cheque_number}</strong> for{' '}
            <strong>{confirmClear?.students?.full_name}</strong> ({formatCurrencyINR(confirmClear?.amount)}) as Cleared?
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmClear(null)} className="flex-1">Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={updateCheque.isPending}
              onClick={() => {
                updateCheque.mutateAsync({ id: confirmClear.id, payment_id: confirmClear.fee_payment_id, status: 'Cleared', amount: confirmClear.amount })
                  .then(() => setConfirmClear(null));
              }}>
              Confirm Clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bounce Dialog */}
      <Dialog open={!!bounceDialog} onOpenChange={() => setBounceDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Cheque as Bounced</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cheque <strong className="font-mono">{bounceDialog?.cheque_number}</strong> — {formatCurrencyINR(bounceDialog?.amount)}.
            This will reverse the payment and notify the parent.
          </p>
          <div>
            <Label>Bounce Reason *</Label>
            <Input value={bounceReason} onChange={e => setBounceReason(e.target.value)}
              placeholder="e.g., Insufficient funds" className="mt-1" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setBounceDialog(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" className="flex-1"
              disabled={!bounceReason.trim() || updateCheque.isPending}
              onClick={() => {
                updateCheque.mutateAsync({
                  id: bounceDialog.id, payment_id: bounceDialog.fee_payment_id,
                  status: 'Bounced', bounce_reason: bounceReason, amount: bounceDialog.amount,
                }).then(() => setBounceDialog(null));
              }}>
              Confirm Bounce & Reverse Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
