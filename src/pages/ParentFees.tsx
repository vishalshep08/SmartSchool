import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentFees, useFeePayments } from '@/hooks/useStudentFees';
import { useParentData } from '@/hooks/useParentData';
import { formatCurrencyINR, formatDateIndian } from '@/lib/dateUtils';
import { IndianRupee, Receipt, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

function StatusBadge({ status }: { status: string }) {
    if (status === 'Paid') return <span className="badge-success">Paid</span>;
    if (status === 'Partial') return <span className="badge-warning">Partial</span>;
    return <span className="badge-destructive">Unpaid</span>;
}

export default function ParentFees() {
    const { linkedStudents, isLoading: parentLoading } = useParentData();
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const selectedChild = linkedStudents[selectedChildIndex] || null;

    const { studentFees, isLoading, error } = useStudentFees({
        studentId: selectedChild?.id || undefined,
    });
    const [showHistory, setShowHistory] = useState<string | null>(null);

    const currentFee = studentFees.length > 0 ? studentFees[0] : null;

    if (error) return <ErrorState title="Failed to load fee information" onRetry={() => window.location.reload()} />;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fee Information"
                description="View your child's fee status and payment history"
                breadcrumbs={[{ label: 'Home', href: '/parent/dashboard' }, { label: 'Fees' }]}
            />

            {/* Child Switcher */}
            {linkedStudents.length > 1 && (
                <Tabs value={selectedChildIndex.toString()} onValueChange={v => setSelectedChildIndex(parseInt(v))}>
                    <TabsList>
                        {linkedStudents.map((child: any, idx: number) => (
                            <TabsTrigger key={child.id} value={idx.toString()}>{child.full_name}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            )}

            {parentLoading || isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-60 w-full rounded-xl" />
                </div>
            ) : !selectedChild ? (
                <EmptyState icon={Receipt} title="No Children Linked" description="No children are linked to your account. Please contact the school administration." />
            ) : !currentFee ? (
                <EmptyState icon={Receipt} title="No Fee Records" description="No fee records found for the current academic year. Please contact the school administration." />
            ) : (
                <>
                    {/* Fee Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up">
                        <div className="stat-card">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <IndianRupee className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{formatCurrencyINR(currentFee.total_amount)}</p>
                                    <p className="text-xs text-muted-foreground">Total Fee</p>
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-success" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-success">{formatCurrencyINR(currentFee.paid_amount)}</p>
                                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-destructive" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-destructive">{formatCurrencyINR(currentFee.balance_amount)}</p>
                                    <p className="text-xs text-muted-foreground">Balance Due</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Banner */}
                    <div className={`glass-card p-4 animate-fade-up flex items-center gap-3 ${currentFee.status === 'Paid' ? 'border-success/30' : currentFee.status === 'Partial' ? 'border-warning/30' : 'border-destructive/30'
                        }`} style={{ animationDelay: '100ms' }}>
                        {currentFee.status === 'Paid' ? <CheckCircle2 className="w-5 h-5 text-success" /> :
                            currentFee.status === 'Partial' ? <Clock className="w-5 h-5 text-warning" /> :
                                <AlertTriangle className="w-5 h-5 text-destructive" />}
                        <div>
                            <p className="font-medium text-foreground">Status: <StatusBadge status={currentFee.status} /></p>
                            <p className="text-xs text-muted-foreground">Academic Year: {currentFee.academic_year} • Category: {currentFee.fee_structures?.fee_categories?.category_name || '-'}</p>
                        </div>
                    </div>

                    {/* Payment History */}
                    <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-heading font-semibold text-foreground">Payment History</h3>
                                <p className="text-sm text-muted-foreground">View all payments made for this fee record</p>
                            </div>
                            <button onClick={() => setShowHistory(currentFee.id)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                                View History
                            </button>
                        </div>
                    </div>

                    {showHistory && <PaymentHistoryDialog studentFeeId={showHistory} onClose={() => setShowHistory(null)} />}
                </>
            )}
        </div>
    );
}

function PaymentHistoryDialog({ studentFeeId, onClose }: { studentFeeId: string; onClose: () => void }) {
    const { payments, isLoading } = useFeePayments(studentFeeId);

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Payment History</DialogTitle></DialogHeader>
                {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : payments.length === 0 ? (
                    <EmptyState icon={Receipt} title="No Payments Yet" description="No payments have been recorded for this fee" />
                ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {payments.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                        <IndianRupee className="w-4 h-4 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-success">{formatCurrencyINR(p.amount_paid)}</p>
                                        <p className="text-xs text-muted-foreground">{formatDateIndian(p.payment_date)} • {p.payment_mode}</p>
                                    </div>
                                </div>
                                <p className="text-xs font-mono text-muted-foreground">{p.receipt_number}</p>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
