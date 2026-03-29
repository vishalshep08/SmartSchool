import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { formatCurrencyINR } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { useStaff } from '@/hooks/useStaff';

const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Demand Draft'];

interface PaymentFormProps {
  studentFee: any;
  onSubmit: (data: any) => void;
  isPending: boolean;
}

export function PaymentForm({ studentFee, onSubmit, isPending }: PaymentFormProps) {
  const { staff } = useStaff();
  const balance = studentFee.balance_amount || 0;

  const [form, setForm] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    collected_by_employee_id: '',
    notes: '',
    // UPI
    upi_transaction_id: '',
    upi_payer_id: '',
    // Cheque
    cheque_number: '',
    cheque_date: '',
    cheque_bank_name: '',
    // Bank Transfer
    bank_transfer_reference: '',
    bank_transfer_date: '',
    bank_transfer_bank: '',
    // DD
    dd_number: '',
    dd_bank_name: '',
    dd_date: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const amount = Number(form.amount_paid) || 0;

  const validate = (): string | null => {
    if (!amount || amount <= 0) return 'Enter a valid amount';
    if (amount > balance) return 'Amount cannot exceed balance';
    if (form.payment_mode === 'UPI' && form.upi_transaction_id.length < 12) return 'UPI Transaction ID must be at least 12 characters';
    if (form.payment_mode === 'Cheque') {
      if (!/^\d{6}$/.test(form.cheque_number)) return 'Cheque number must be 6 digits';
      if (!form.cheque_date) return 'Cheque date is required';
      if (!form.cheque_bank_name.trim()) return 'Bank name is required';
    }
    if (form.payment_mode === 'Bank Transfer' && form.bank_transfer_reference.length < 8) return 'Reference number must be at least 8 characters';
    if (form.payment_mode === 'Demand Draft') {
      if (!form.dd_number.trim()) return 'DD number is required';
      if (!form.dd_date) return 'DD date is required';
      if (!form.dd_bank_name.trim()) return 'DD bank name is required';
    }
    return null;
  };

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    onSubmit({
      student_fee_id: studentFee.id,
      student_id: studentFee.student_id,
      amount_paid: amount,
      payment_date: form.payment_date,
      payment_mode: form.payment_mode,
      collected_by_employee_id: form.collected_by_employee_id || undefined,
      notes: form.notes || undefined,
      upi_transaction_id: form.upi_transaction_id || undefined,
      upi_payer_id: form.upi_payer_id || undefined,
      cheque_number: form.cheque_number || undefined,
      cheque_date: form.cheque_date || undefined,
      cheque_bank_name: form.cheque_bank_name || undefined,
      bank_transfer_reference: form.bank_transfer_reference || undefined,
      bank_transfer_date: form.bank_transfer_date || undefined,
      bank_transfer_bank: form.bank_transfer_bank || undefined,
      dd_number: form.dd_number || undefined,
      dd_bank_name: form.dd_bank_name || undefined,
      dd_date: form.dd_date || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student Info */}
      <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
        <p><strong>Student:</strong> {studentFee.students?.full_name}</p>
        <p><strong>Class:</strong> {studentFee.fee_structures?.classes?.name} {studentFee.fee_structures?.classes?.section || ''}</p>
        <p><strong>Total Fee:</strong> {formatCurrencyINR(studentFee.total_amount)}</p>
        <p><strong>Balance Due:</strong> <span className="text-destructive font-semibold">{formatCurrencyINR(balance)}</span></p>
      </div>

      {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Amount (₹) *</Label>
          <Input type="number" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)}
            className={cn('mt-1', amount > balance && 'border-destructive')} min={1} max={balance} />
        </div>
        <div>
          <Label>Payment Date *</Label>
          <Input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Payment Mode *</Label>
          <Select value={form.payment_mode} onValueChange={v => set('payment_mode', v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Collected By</Label>
          <Select value={form.collected_by_employee_id} onValueChange={v => set('collected_by_employee_id', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.profile?.full_name || s.employee_id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cash */}
      {form.payment_mode === 'Cash' && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700 flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" /><span>Ensure cash is deposited to the school account.</span>
        </div>
      )}

      {/* UPI */}
      {form.payment_mode === 'UPI' && (
        <div className="space-y-3">
          <div><Label>UPI Transaction ID *</Label>
            <Input value={form.upi_transaction_id} onChange={e => set('upi_transaction_id', e.target.value)}
              placeholder="Min 12 characters" className="mt-1" /></div>
          <div><Label>Payer UPI ID (optional)</Label>
            <Input value={form.upi_payer_id} onChange={e => set('upi_payer_id', e.target.value)}
              placeholder="e.g., name@upi" className="mt-1" /></div>
        </div>
      )}

      {/* Cheque */}
      {form.payment_mode === 'Cheque' && (
        <div className="space-y-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50">
          <div className="flex gap-2 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Cheque payments are not confirmed until the cheque is cleared. Mark as Cleared once the bank confirms.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Cheque Number * (6 digits)</Label>
              <Input value={form.cheque_number} onChange={e => set('cheque_number', e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6-digit" className="mt-1" /></div>
            <div><Label>Cheque Date *</Label>
              <Input type="date" value={form.cheque_date} onChange={e => set('cheque_date', e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label>Bank Name *</Label>
            <Input value={form.cheque_bank_name} onChange={e => set('cheque_bank_name', e.target.value)}
              placeholder="Which bank issued the cheque" className="mt-1" /></div>
        </div>
      )}

      {/* Bank Transfer */}
      {form.payment_mode === 'Bank Transfer' && (
        <div className="space-y-3">
          <div><Label>Transaction Reference (NEFT/IMPS/RTGS) *</Label>
            <Input value={form.bank_transfer_reference} onChange={e => set('bank_transfer_reference', e.target.value)}
              placeholder="Min 8 characters" className="mt-1" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Transfer Date *</Label>
              <Input type="date" value={form.bank_transfer_date} onChange={e => set('bank_transfer_date', e.target.value)} className="mt-1" /></div>
            <div><Label>Transferring Bank</Label>
              <Input value={form.bank_transfer_bank} onChange={e => set('bank_transfer_bank', e.target.value)}
                placeholder="Optional" className="mt-1" /></div>
          </div>
        </div>
      )}

      {/* Demand Draft */}
      {form.payment_mode === 'Demand Draft' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>DD Number *</Label>
              <Input value={form.dd_number} onChange={e => set('dd_number', e.target.value)} className="mt-1" /></div>
            <div><Label>DD Date *</Label>
              <Input type="date" value={form.dd_date} onChange={e => set('dd_date', e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label>DD Bank Name *</Label>
            <Input value={form.dd_bank_name} onChange={e => set('dd_bank_name', e.target.value)}
              placeholder="Which bank issued the DD" className="mt-1" /></div>
        </div>
      )}

      <div><Label>Notes</Label>
        <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" className="mt-1" /></div>

      <Button type="submit" className="w-full" disabled={isPending || !amount}>
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Record Payment
      </Button>
    </form>
  );
}
