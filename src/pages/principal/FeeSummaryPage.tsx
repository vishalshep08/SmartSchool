import React, { useState } from 'react';
import { useStudentFees, useFeePayments, type StudentFeeRecord } from '@/hooks/useStudentFees';
import { useClasses } from '@/hooks/useStudents';
import {
  IndianRupee, TrendingUp, AlertCircle, Users, Search,
  Plus, ChevronDown, ChevronUp, Receipt, Loader2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyINR } from '@/lib/dateUtils';

const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Demand Draft'];
const STATUS_OPTS = ['all', 'Unpaid', 'Partial', 'Paid'];

/* ─── Stat Card ─────────────────────────────────────────────── */

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className={`rounded-2xl p-5 border ${color} shadow-sm`}>
      <p className="text-xs font-medium mb-1 opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

/* ─── Record Payment Dialog ──────────────────────────────────── */

function RecordPaymentDialog({
  fee,
  onClose,
}: {
  fee: StudentFeeRecord;
  onClose: () => void;
}) {
  const { recordPayment } = useStudentFees();
  const [amount, setAmount] = useState(String(fee.balance_amount || ''));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('Cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) return toast.error('Enter a valid amount');
    if (amtNum > fee.balance_amount) return toast.error(`Amount cannot exceed balance of ${formatCurrencyINR(fee.balance_amount)}`);
    await recordPayment.mutateAsync({
      student_fee_id: fee.id,
      student_id: fee.student_id,
      amount_paid: amtNum,
      payment_date: date,
      payment_mode: mode,
      notes,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-indigo-600" />
            Record Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Student Info */}
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="font-semibold text-indigo-900">{fee.students?.full_name}</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {fee.students?.classes?.name} {fee.students?.classes?.section || ''} · Balance: {formatCurrencyINR(fee.balance_amount)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="Reference, notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={recordPayment.isPending}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {recordPayment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Record Payment
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Payment History Dialog ─────────────────────────────────── */

function PaymentHistoryDialog({ feeId, onClose }: { feeId: string; onClose: () => void }) {
  const { payments, isLoading } = useFeePayments(feeId);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Payment History</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">{formatCurrencyINR(p.amount_paid)}</p>
                    <p className="text-xs text-gray-400">{p.payment_date} · {p.payment_mode}</p>
                  </div>
                </div>
                <p className="text-xs font-mono text-gray-400">{p.receipt_number}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Assign Fee Dialog ──────────────────────────────────────── */

function AssignFeeDialog({ onClose }: { onClose: () => void }) {
  const { assignFee } = useStudentFees();
  const [studentAdmNo, setStudentAdmNo] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [searching, setSearching] = useState(false);


  const searchStudent = async () => {
    if (!studentAdmNo.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, admission_number, classes(name, section)')
        .ilike('admission_number', `%${studentAdmNo.trim()}%`)
        .limit(1)
        .maybeSingle();
      setStudent(data);
      if (!data) toast.error('Student not found');
    } finally {
      setSearching(false);
    }
  };


  const [totalAmount, setTotalAmount] = useState('');
  const [academicYear, setAcademicYear] = useState(
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  );

  const handleAssign = async () => {
    if (!student || !totalAmount || !academicYear) return toast.error('Fill in all fields');
    await assignFee.mutateAsync({
      student_id: student.id,
      fee_structure_id: null,
      academic_year: academicYear,
      total_amount: parseFloat(totalAmount),
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Assign Fee to Student
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={studentAdmNo}
                onChange={e => { setStudentAdmNo(e.target.value); setStudent(null); }}
                placeholder="Search by admission no."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={searchStudent}
                disabled={searching}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </div>
          </div>

          {student && (
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="font-semibold text-emerald-900">{student.full_name}</p>
              <p className="text-xs text-emerald-600">{student.classes?.name} {student.classes?.section || ''}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-2026"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Fee Amount (₹)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              placeholder="Enter total fee for the year"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!student || !totalAmount || assignFee.isPending}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {assignFee.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign Fee
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function FeeManagementPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [recordFor, setRecordFor] = useState<StudentFeeRecord | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { classes } = useClasses();
  const { studentFees, isLoading, error, refetch } = useStudentFees({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    classId: classFilter !== 'all' ? classFilter : undefined,
  });

  const filtered = studentFees.filter(f => {
    const name = f.students?.full_name?.toLowerCase() || '';
    const admNo = f.students?.admission_number?.toLowerCase() || '';
    const q = search.toLowerCase();
    return !search || name.includes(q) || admNo.includes(q);
  });

  const totalExpected = studentFees.reduce((s, f) => s + (f.total_amount || 0), 0);
  const totalCollected = studentFees.reduce((s, f) => s + (f.paid_amount || 0), 0);
  const totalPending = studentFees.reduce((s, f) => s + (f.balance_amount || 0), 0);
  const collectionPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-500 font-medium text-sm">{error.message}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-indigo-600" />
            Fee Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage student fees and record payments</p>
        </div>
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Assign Fee
        </button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Expected"
            value={formatCurrencyINR(totalExpected)}
            color="bg-white border-gray-100"
            sub={`${studentFees.length} students`}
          />
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-medium text-emerald-600">Collected</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrencyINR(totalCollected)}</p>
            <div className="mt-2">
              <div className="h-1.5 bg-emerald-100 rounded-full">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${collectionPct}%` }} />
              </div>
              <p className="text-xs text-emerald-500 mt-1">{collectionPct}% collected</p>
            </div>
          </div>
          <StatCard
            label="Pending"
            value={formatCurrencyINR(totalPending)}
            color="bg-red-50 border-red-100 text-red-700"
          />
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-2.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Status Breakdown
            </p>
            <div className="space-y-1.5">
              {[
                { label: '✓ Paid', val: studentFees.filter(f => f.status === 'Paid').length, cls: 'text-emerald-600' },
                { label: '◑ Partial', val: studentFees.filter(f => f.status === 'Partial').length, cls: 'text-amber-600' },
                { label: '✗ Unpaid', val: studentFees.filter(f => f.status === 'Unpaid').length, cls: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-xs">
                  <span className={`font-semibold ${s.cls}`}>{s.label}</span>
                  <span className="font-bold text-gray-700">{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or admission no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All Classes</option>
          {classes.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name} {c.section}</option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? s === 'Paid' ? 'bg-emerald-600 text-white'
                    : s === 'Partial' ? 'bg-amber-500 text-white'
                    : s === 'Unpaid' ? 'bg-red-500 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Student', 'Class', 'Total Fee', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3.5 text-gray-500 font-medium text-xs uppercase tracking-wide ${h === 'Actions' ? 'text-center' : h === 'Student' ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(fee => (
                  <React.Fragment key={fee.id}>
                    <tr
                      key={fee.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === fee.id ? null : fee.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expandedRow === fee.id
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-gray-900">{fee.students?.full_name || '—'}</p>
                            <p className="text-xs text-gray-400">{fee.students?.admission_number || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {fee.students?.classes ? `${fee.students.classes.name} ${fee.students.classes.section || ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">{formatCurrencyINR(fee.total_amount || 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrencyINR(fee.paid_amount || 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">{formatCurrencyINR(fee.balance_amount || 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          fee.status === 'Paid' ? 'bg-emerald-100 text-emerald-700'
                            : fee.status === 'Partial' ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {fee.status || 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {fee.status !== 'Paid' && (
                            <button
                              onClick={() => setRecordFor(fee)}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                            >
                              + Pay
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryFor(fee.id)}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === fee.id && (
                      <tr>
                        <td colSpan={7} className="bg-indigo-50/40 px-6 py-3 border-b border-indigo-100/50">
                          <div className="flex gap-6 text-xs text-gray-600">
                            <span><strong>Academic Year:</strong> {fee.academic_year}</span>
                            <span><strong>Category:</strong> {fee.fee_structures?.fee_categories?.category_name || '—'}</span>
                            <span><strong>Fee ID:</strong> {fee.id.slice(0, 8)}…</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && !isLoading && (
              <div className="text-center py-14 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm font-medium">No fee records found</p>
                <p className="text-xs mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {studentFees.length} records
          </div>
        )}
      </div>

      {/* Dialogs */}
      {recordFor && <RecordPaymentDialog fee={recordFor} onClose={() => setRecordFor(null)} />}
      {historyFor && <PaymentHistoryDialog feeId={historyFor} onClose={() => setHistoryFor(null)} />}
      {showAssign && <AssignFeeDialog onClose={() => setShowAssign(false)} />}
    </div>
  );
}
