import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DollarSign, IndianRupee, Receipt, Loader2, Download, FileText, Tag, Layers, Users, CreditCard, Bell } from 'lucide-react';
import { useFeeCategories } from '@/hooks/useFeeCategories';
import { useFeeStructures, type FeeInstallment } from '@/hooks/useFeeStructures';
import { useStudentFees, useFeePayments } from '@/hooks/useStudentFees';
import { useClasses } from '@/hooks/useStudents';
import { formatCurrencyINR, formatDateIndian } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolName } from '@/hooks/useSettings';
import { PaymentForm } from '@/components/fees/PaymentForm';
import { generateReceiptPDF } from '@/components/fees/generateReceiptPDF';
import { ChequeTrackingTab } from '@/components/fees/ChequeTrackingTab';
import { FeeRemindersTab } from '@/components/fees/FeeRemindersTab';
import { useStaff } from '@/hooks/useStaff';

// ─── Fee Structure Form ─────────────────────────────
function FeeStructureForm({
    onClose,
    classes,
    categories,
    onSubmit,
    isPending,
}: {
    onClose: () => void;
    classes: any[];
    categories: any[];
    onSubmit: (data: any) => void;
    isPending: boolean;
}) {
    const [formData, setFormData] = useState({
        academic_year: '2025-2026',
        class_id: '',
        fee_category_id: '',
        total_amount: '',
        installment_type: 'Full',
    });
    const [installments, setInstallments] = useState<Omit<FeeInstallment, 'id' | 'fee_structure_id'>[]>([]);

    const handleTypeChange = (type: string) => {
        setFormData({ ...formData, installment_type: type });
        if (type === 'Full') {
            setInstallments([]);
        } else if (type === 'Term-wise') {
            setInstallments([
                { installment_number: 1, installment_name: 'Term 1', due_date: '', amount: 0 },
                { installment_number: 2, installment_name: 'Term 2', due_date: '', amount: 0 },
            ]);
        } else if (type === 'Monthly') {
            const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
            const total = Number(formData.total_amount) || 0;
            const monthly = Math.round(total / 12);
            setInstallments(
                months.map((m, i) => ({
                    installment_number: i + 1,
                    installment_name: m,
                    due_date: '',
                    amount: monthly,
                }))
            );
        }
    };

    const updateInstallment = (idx: number, field: string, value: any) => {
        const updated = [...installments];
        (updated[idx] as any)[field] = value;
        setInstallments(updated);
    };

    const addInstallment = () => {
        setInstallments([...installments, {
            installment_number: installments.length + 1,
            installment_name: `Term ${installments.length + 1}`,
            due_date: '',
            amount: 0,
        }]);
    };

    const removeInstallment = (idx: number) => {
        setInstallments(installments.filter((_, i) => i !== idx));
    };

    const installmentSum = installments.reduce((s, i) => s + Number(i.amount), 0);
    const totalAmount = Number(formData.total_amount) || 0;
    const isValid = formData.class_id && formData.fee_category_id && totalAmount > 0 &&
        (formData.installment_type === 'Full' || Math.abs(installmentSum - totalAmount) < 1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            academic_year: formData.academic_year,
            class_id: formData.class_id,
            fee_category_id: formData.fee_category_id,
            total_amount: totalAmount,
            installment_type: formData.installment_type,
            installments: formData.installment_type === 'Full'
                ? [{ installment_number: 1, installment_name: 'Full Payment', due_date: new Date().toISOString().split('T')[0], amount: totalAmount }]
                : installments,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Academic Year <span className="text-destructive">*</span></Label>
                    <Input value={formData.academic_year} onChange={e => setFormData({ ...formData, academic_year: e.target.value })} required />
                </div>
                <div className="space-y-2">
                    <Label>Class <span className="text-destructive">*</span></Label>
                    <Select value={formData.class_id} onValueChange={v => setFormData({ ...formData, class_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                            {classes.map((cls: any) => (
                                <SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section && `- ${cls.section}`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Fee Category <span className="text-destructive">*</span></Label>
                    <Select value={formData.fee_category_id} onValueChange={v => setFormData({ ...formData, fee_category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                            {categories.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.category_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Total Amount (₹) <span className="text-destructive">*</span></Label>
                    <Input type="number" value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} required min={1} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Installment Type <span className="text-destructive">*</span></Label>
                <Select value={formData.installment_type} onValueChange={handleTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Full">Full Payment</SelectItem>
                        <SelectItem value="Term-wise">Term-wise</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {formData.installment_type !== 'Full' && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Installments</Label>
                        {formData.installment_type === 'Term-wise' && (
                            <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                                <Plus className="w-3 h-3 mr-1" /> Add Term
                            </Button>
                        )}
                    </div>
                    {installments.map((inst, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                            <div>
                                <Label className="text-xs">Name</Label>
                                <Input value={inst.installment_name} onChange={e => updateInstallment(idx, 'installment_name', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div>
                                <Label className="text-xs">Due Date</Label>
                                <Input type="date" value={inst.due_date} onChange={e => updateInstallment(idx, 'due_date', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div>
                                <Label className="text-xs">Amount (₹)</Label>
                                <Input type="number" value={inst.amount} onChange={e => updateInstallment(idx, 'amount', Number(e.target.value))} className="h-8 text-sm" min={0} />
                            </div>
                            {formData.installment_type === 'Term-wise' && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeInstallment(idx)} className="h-8 w-8 p-0 text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Installment Total:</span>
                        <span className={installmentSum === totalAmount ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                            {formatCurrencyINR(installmentSum)} / {formatCurrencyINR(totalAmount)}
                            {installmentSum !== totalAmount && ' ❌ Must equal total'}
                        </span>
                    </div>
                </div>
            )}

            <Button type="submit" className="w-full" disabled={!isValid || isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Fee Structure
            </Button>
        </form>
    );
}

// ─── Skeleton Loader ─────────────────────────────
function TableSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-28" />
                </div>
            ))}
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, string> = {
        Paid: 'badge-success',
        Partial: 'badge-warning',
        Unpaid: 'badge-destructive',
    };
    return <span className={variants[status] || 'badge-warning'}>{status}</span>;
}

// ─── Main Page ───────────────────────────────────
export default function FeeManagement() {
    const { profile } = useAuth();
    const schoolName = useSchoolName();
    const { staff } = useStaff();
    const { classes } = useClasses();
    const { categories, isLoading: catLoading, createCategory, deleteCategory } = useFeeCategories();
    const { structures, isLoading: strLoading, createStructure, deleteStructure } = useFeeStructures();

    const [feeFilters, setFeeFilters] = useState({ classId: 'all', status: 'all', academicYear: '2025-2026' });
    const { studentFees, isLoading: feesLoading, recordPayment, refetch: refetchFees } = useStudentFees(feeFilters);

    const [showStructureForm, setShowStructureForm] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState<any>(null);
    const [showPaymentHistory, setShowPaymentHistory] = useState<string | null>(null);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [newCategory, setNewCategory] = useState({ category_name: '', description: '' });
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; label: string } | null>(null);

    const getStatusColor = (status: string) => {
        if (status === 'Paid') return 'text-success';
        if (status === 'Partial') return 'text-warning';
        return 'text-destructive';
    };

    const generateReceiptPDFWrapped = (payment: any, studentFee: any) => {
        const collector = staff.find(s => s.id === payment.collected_by_employee_id);
        generateReceiptPDF(payment, studentFee, schoolName, collector?.profile?.full_name);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fee Management"
                description="Manage fee structures, student fees, and payments"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Fee Management' }]}
            />

            <Tabs defaultValue="structures" className="animate-fade-up" style={{ animationDelay: '100ms' }}>
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="structures" className="gap-2"><Layers className="w-4 h-4" /> Fee Structure</TabsTrigger>
                    <TabsTrigger value="records" className="gap-2"><Users className="w-4 h-4" /> Student Fees</TabsTrigger>
                    <TabsTrigger value="cheques" className="gap-2"><CreditCard className="w-4 h-4" /> Cheque Tracking</TabsTrigger>
                    <TabsTrigger value="reminders" className="gap-2"><Bell className="w-4 h-4" /> Send Reminders</TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2"><FileText className="w-4 h-4" /> Fee Reports</TabsTrigger>
                    <TabsTrigger value="categories" className="gap-2"><Tag className="w-4 h-4" /> Categories</TabsTrigger>
                </TabsList>

                {/* ═══════ TAB 1 — Fee Structures ═══════ */}
                <TabsContent value="structures" className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="gradient" onClick={() => setShowStructureForm(true)} className="gap-2">
                            <Plus className="w-4 h-4" /> Create Fee Structure
                        </Button>
                    </div>

                    {strLoading ? <TableSkeleton /> : structures.length === 0 ? (
                        <EmptyState icon={Layers} title="No Fee Structures" description="Create your first fee structure to start managing fees" actionLabel="Create Fee Structure" onAction={() => setShowStructureForm(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Academic Year</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Total Amount</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Installments</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {structures.map(s => (
                                            <TableRow key={s.id} className="table-row-hover">
                                                <TableCell className="font-medium">{s.academic_year}</TableCell>
                                                <TableCell>{s.classes?.name} {s.classes?.section && `- ${s.classes.section}`}</TableCell>
                                                <TableCell>{s.fee_categories?.category_name}</TableCell>
                                                <TableCell className="font-semibold">{formatCurrencyINR(s.total_amount)}</TableCell>
                                                <TableCell><Badge variant="outline">{s.installment_type}</Badge></TableCell>
                                                <TableCell>{s.fee_installments?.length || 0}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm({ type: 'structure', id: s.id, label: `${s.classes?.name} ${s.fee_categories?.category_name} structure` })}>
                                                        <Trash2 className="w-4 h-4" />
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

                {/* ═══════ TAB 2 — Student Fee Records ═══════ */}
                <TabsContent value="records" className="space-y-4">
                    <div className="glass-card p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select value={feeFilters.classId} onValueChange={v => setFeeFilters({ ...feeFilters, classId: v })}>
                                <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map((cls: any) => <SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section && `- ${cls.section}`}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={feeFilters.status} onValueChange={v => setFeeFilters({ ...feeFilters, status: v })}>
                                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                                    <SelectItem value="Partial">Partial</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input value={feeFilters.academicYear} onChange={e => setFeeFilters({ ...feeFilters, academicYear: e.target.value })} placeholder="Academic Year" className="w-36" />
                        </div>
                    </div>

                    {feesLoading ? <TableSkeleton /> : studentFees.length === 0 ? (
                        <EmptyState icon={Receipt} title="No Student Fee Records" description="No records found for the selected filters" />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Paid</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentFees.map(sf => (
                                            <TableRow key={sf.id} className="table-row-hover">
                                                <TableCell className="font-medium">{sf.students?.full_name}</TableCell>
                                                <TableCell>{sf.fee_structures?.classes?.name} {sf.fee_structures?.classes?.section && `- ${sf.fee_structures.classes.section}`}</TableCell>
                                                <TableCell>{sf.fee_structures?.fee_categories?.category_name}</TableCell>
                                                <TableCell>{formatCurrencyINR(sf.total_amount)}</TableCell>
                                                <TableCell className="text-success font-medium">{formatCurrencyINR(sf.paid_amount)}</TableCell>
                                                <TableCell className="text-destructive font-medium">{formatCurrencyINR(sf.balance_amount)}</TableCell>
                                                <TableCell><StatusBadge status={sf.status} /></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {sf.status !== 'Paid' && (
                                                            <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(sf)} className="gap-1 text-xs">
                                                                <IndianRupee className="w-3 h-3" /> Pay
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => setShowPaymentHistory(sf.id)} className="text-xs">
                                                            History
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ═══════ TAB 3 — Cheque Tracking ═══════ */}
                <TabsContent value="cheques" className="space-y-4">
                    <ChequeTrackingTab />
                </TabsContent>

                {/* ═══════ TAB 4 — Send Reminders ═══════ */}
                <TabsContent value="reminders" className="space-y-4">
                    <FeeRemindersTab />
                </TabsContent>

                {/* ═══════ TAB 5 — Fee Reports ═══════ */}
                <TabsContent value="reports" className="space-y-4">
                    <FeeReportSection studentFees={studentFees} schoolName={schoolName} />
                </TabsContent>

                {/* ═══════ TAB 4 — Fee Categories ═══════ */}
                <TabsContent value="categories" className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="gradient" onClick={() => setShowCategoryForm(true)} className="gap-2">
                            <Plus className="w-4 h-4" /> Add Category
                        </Button>
                    </div>

                    {catLoading ? <TableSkeleton /> : categories.length === 0 ? (
                        <EmptyState icon={Tag} title="No Fee Categories" description="Add fee categories like General, OBC, SC, ST, EWS" actionLabel="Add Category" onAction={() => setShowCategoryForm(true)} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Category Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.map(cat => (
                                            <TableRow key={cat.id} className="table-row-hover">
                                                <TableCell className="font-medium">{cat.category_name}</TableCell>
                                                <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm({ type: 'category', id: cat.id, label: cat.category_name })}>
                                                        <Trash2 className="w-4 h-4" />
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
            </Tabs>

            {/* ─── Dialogs ─── */}
            <Dialog open={showStructureForm} onOpenChange={setShowStructureForm}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Create Fee Structure</DialogTitle></DialogHeader>
                    <FeeStructureForm
                        onClose={() => setShowStructureForm(false)}
                        classes={classes}
                        categories={categories}
                        isPending={createStructure.isPending}
                        onSubmit={(data) => {
                            createStructure.mutateAsync(data).then(() => setShowStructureForm(false));
                        }}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={!!showPaymentForm} onOpenChange={() => setShowPaymentForm(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                    {showPaymentForm && (
                        <PaymentForm
                            studentFee={showPaymentForm}
                            isPending={recordPayment.isPending}
                            onSubmit={data => {
                                recordPayment.mutateAsync(data).then(payment => {
                                    if (payment) generateReceiptPDFWrapped(payment, showPaymentForm);
                                    setShowPaymentForm(null);
                                });
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Fee Category</DialogTitle></DialogHeader>
                    <form onSubmit={e => { e.preventDefault(); createCategory.mutateAsync(newCategory).then(() => { setShowCategoryForm(false); setNewCategory({ category_name: '', description: '' }); }); }} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Category Name <span className="text-destructive">*</span></Label>
                            <Input value={newCategory.category_name} onChange={e => setNewCategory({ ...newCategory, category_name: e.target.value })} required placeholder="e.g., General, OBC" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={newCategory.description} onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} placeholder="Optional description" />
                        </div>
                        <Button type="submit" className="w-full" disabled={createCategory.isPending}>
                            {createCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Add Category
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {showPaymentHistory && <PaymentHistoryDialog studentFeeId={showPaymentHistory} onClose={() => setShowPaymentHistory(null)} />}

            <ConfirmDialog
                open={!!deleteConfirm}
                onOpenChange={() => setDeleteConfirm(null)}
                title="Delete Confirmation"
                description={`Are you sure you want to delete "${deleteConfirm?.label}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => {
                    if (deleteConfirm?.type === 'structure') deleteStructure.mutateAsync(deleteConfirm.id);
                    else if (deleteConfirm?.type === 'category') deleteCategory.mutateAsync(deleteConfirm.id);
                    setDeleteConfirm(null);
                }}
            />
        </div>
    );
}

// ─── Payment History Dialog ───────────────────────
function PaymentHistoryDialog({ studentFeeId, onClose }: { studentFeeId: string; onClose: () => void }) {
    const { payments, isLoading } = useFeePayments(studentFeeId);

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Payment History</DialogTitle></DialogHeader>
                {isLoading ? <TableSkeleton /> : payments.length === 0 ? (
                    <EmptyState icon={Receipt} title="No Payments" description="No payments have been recorded yet" />
                ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {payments.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                <div>
                                    <p className="text-sm font-medium">{formatCurrencyINR(p.amount_paid)}</p>
                                    <p className="text-xs text-muted-foreground">{formatDateIndian(p.payment_date)} • {p.payment_mode}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono text-muted-foreground">{p.receipt_number}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Fee Reports Section ──────────────────────────
function FeeReportSection({ studentFees, schoolName }: { studentFees: any[]; schoolName: string }) {
    const totalCollection = studentFees.reduce((s, f) => s + f.paid_amount, 0);
    const totalOutstanding = studentFees.reduce((s, f) => s + f.balance_amount, 0);
    const totalStudents = studentFees.length;
    const paidCount = studentFees.filter(f => f.status === 'Paid').length;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{formatCurrencyINR(totalCollection)}</p>
                            <p className="text-xs text-muted-foreground">Total Collected</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{formatCurrencyINR(totalOutstanding)}</p>
                            <p className="text-xs text-muted-foreground">Outstanding</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                            <p className="text-xs text-muted-foreground">Total Students</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{paidCount}/{totalStudents}</p>
                            <p className="text-xs text-muted-foreground">Fully Paid</p>
                        </div>
                    </div>
                </div>
            </div>
            {studentFees.length === 0 && (
                <EmptyState icon={FileText} title="No Data Available" description="No records found for the selected filters" />
            )}
        </div>
    );
}
