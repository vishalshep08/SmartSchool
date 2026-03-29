import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminActionLogger } from './useAdminActionLogger';

export interface StudentFeeRecord {
    id: string;
    student_id: string;
    fee_structure_id: string;
    academic_year: string;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    status: 'Unpaid' | 'Partial' | 'Paid';
    created_at: string;
    students?: {
        full_name: string;
        admission_number: string;
        class_id: string | null;
        classes?: { name: string; section: string | null } | null;
    } | null;
    fee_structures?: {
        fee_categories?: { category_name: string } | null;
        installment_type: string;
        classes?: { name: string; section: string | null } | null;
    } | null;
}

export interface FeePayment {
    id: string;
    student_fee_id: string;
    student_id: string;
    installment_id: string | null;
    amount_paid: number;
    payment_date: string;
    payment_mode: string;
    transaction_reference: string | null;
    received_by_admin_id: string | null;
    receipt_number: string;
    notes: string | null;
    created_at: string;
    // Extended payment mode fields
    upi_transaction_id: string | null;
    upi_payer_id: string | null;
    cheque_number: string | null;
    cheque_date: string | null;
    cheque_bank_name: string | null;
    cheque_status: string | null;
    bank_transfer_reference: string | null;
    bank_transfer_date: string | null;
    bank_transfer_bank: string | null;
    dd_number: string | null;
    dd_bank_name: string | null;
    dd_date: string | null;
    collected_by_employee_id: string | null;
    receipt_generated_at: string | null;
    is_receipt_printed: boolean;
    is_bounced: boolean;
    students?: any;
}

export function useStudentFees(filters?: {
    classId?: string;
    status?: string;
    academicYear?: string;
    studentId?: string;
}) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { logAction } = useAdminActionLogger();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['student-fees', filters],
        queryFn: async () => {
            let query = (supabase as any)
                .from('student_fees')
                .select(`
          *,
          students(full_name, admission_number, class_id, classes(name, section)),
          fee_structures(fee_categories(category_name), installment_type, classes(name, section))
        `)
                .order('created_at', { ascending: false });

            if (filters?.academicYear) query = query.eq('academic_year', filters.academicYear);
            if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
            if (filters?.studentId) query = query.eq('student_id', filters.studentId);
            if (filters?.classId && filters.classId !== 'all') {
                // Filter by student class
                query = query.eq('students.class_id', filters.classId);
            }

            const { data, error } = await query;
            if (error) throw error;

            let results = data as StudentFeeRecord[];
            // Client-side class filter since nested filtering is tricky
            if (filters?.classId && filters.classId !== 'all') {
                results = results.filter(r => r.students?.class_id === filters.classId);
            }
            return results;
        },
    });

    const assignFee = useMutation({
        mutationFn: async (input: {
            student_id: string;
            fee_structure_id: string;
            academic_year: string;
            total_amount: number;
        }) => {
            const { data, error } = await (supabase as any)
                .from('student_fees')
                .insert({ ...input, paid_amount: 0 })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-fees'] });
            toast.success('Fee assigned to student');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const recordPayment = useMutation({
        mutationFn: async (input: {
            student_fee_id: string;
            student_id: string;
            installment_id?: string;
            amount_paid: number;
            payment_date: string;
            payment_mode: string;
            transaction_reference?: string;
            notes?: string;
            collected_by_employee_id?: string;
            // UPI
            upi_transaction_id?: string;
            upi_payer_id?: string;
            // Cheque
            cheque_number?: string;
            cheque_date?: string;
            cheque_bank_name?: string;
            // Bank Transfer
            bank_transfer_reference?: string;
            bank_transfer_date?: string;
            bank_transfer_bank?: string;
            // DD
            dd_number?: string;
            dd_bank_name?: string;
            dd_date?: string;
        }) => {
            const today = new Date();
            const yyyymmdd = today.toISOString().split('T')[0].replace(/-/g, '').slice(0, 8);
            const { count } = await (supabase as any)
                .from('fee_payments')
                .select('*', { count: 'exact', head: true })
                .like('receipt_number', `REC-${today.getFullYear()}-%`);
            const seqNum = (count || 0) + 1;
            const receipt_number = `REC-${today.getFullYear()}-${yyyymmdd.slice(4)}-${String(seqNum).padStart(4, '0')}`;

            const paymentRow: any = {
                    student_fee_id: input.student_fee_id,
                    student_id: input.student_id,
                    installment_id: input.installment_id || null,
                    amount_paid: input.amount_paid,
                    payment_date: input.payment_date,
                    payment_mode: input.payment_mode,
                    transaction_reference: input.transaction_reference || null,
                    received_by_admin_id: input.collected_by_employee_id || user?.id || null,
                    collected_by_employee_id: input.collected_by_employee_id || null,
                    receipt_number,
                    receipt_generated_at: new Date().toISOString(),
                    notes: input.notes || null,
                    // UPI
                    upi_transaction_id: input.upi_transaction_id || null,
                    upi_payer_id: input.upi_payer_id || null,
                    // Cheque
                    cheque_number: input.cheque_number || null,
                    cheque_date: input.cheque_date || null,
                    cheque_bank_name: input.cheque_bank_name || null,
                    cheque_status: input.cheque_number ? 'Received' : null,
                    // Bank Transfer
                    bank_transfer_reference: input.bank_transfer_reference || null,
                    bank_transfer_date: input.bank_transfer_date || null,
                    bank_transfer_bank: input.bank_transfer_bank || null,
                    // DD
                    dd_number: input.dd_number || null,
                    dd_bank_name: input.dd_bank_name || null,
                    dd_date: input.dd_date || null,
                };

            const { data: payment, error: pErr } = await (supabase as any)
                .from('fee_payments')
                .insert(paymentRow)
                .select()
                .single();
            if (pErr) throw pErr;

            // Update paid_amount on student_fees
            const { data: currentFee } = await (supabase as any)
                .from('student_fees')
                .select('paid_amount')
                .eq('id', input.student_fee_id)
                .single();

            const newPaid = (currentFee?.paid_amount || 0) + input.amount_paid;
            const { error: uErr } = await (supabase as any)
                .from('student_fees')
                .update({ paid_amount: newPaid })
                .eq('id', input.student_fee_id);
            if (uErr) throw uErr;

            return payment as FeePayment;
        },
        onSuccess: (payment) => {
            queryClient.invalidateQueries({ queryKey: ['student-fees'] });
            queryClient.invalidateQueries({ queryKey: ['fee-payments'] });
            logAction({
                actionType: 'CREATE',
                module: 'Fee',
                recordAffected: `Payment recorded — Receipt: ${payment.receipt_number}, Amount: ₹${payment.amount_paid}`,
            });
            toast.success(`Payment recorded! Receipt: ${payment.receipt_number}`);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return {
        studentFees: data || [],
        isLoading,
        error,
        refetch,
        assignFee,
        recordPayment,
    };
}

export function useFeePayments(studentFeeId?: string) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['fee-payments', studentFeeId],
        enabled: !!studentFeeId,
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('fee_payments')
                .select('*')
                .eq('student_fee_id', studentFeeId)
                .order('payment_date', { ascending: false });
            if (error) throw error;
            return data as FeePayment[];
        },
    });

    return { payments: data || [], isLoading, error };
}

// ─── Cheque Tracking ──────────────────────────────
export function useChequeTracking() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['cheque-tracking'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('cheque_tracking')
                .select('*, students(full_name, admission_number, classes(name, section)), fee_payments(receipt_number)')
                .order('received_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const updateCheque = useMutation({
        mutationFn: async ({ id, payment_id, status, bounce_reason, amount, parent_user_id }: {
            id: string; payment_id: string; status: 'Cleared' | 'Bounced';
            bounce_reason?: string; amount: number; parent_user_id?: string;
        }) => {
            await (supabase as any).from('cheque_tracking').update({
                clearance_status: status,
                cleared_date: status === 'Cleared' ? new Date().toISOString().split('T')[0] : null,
                bounce_reason: bounce_reason || null,
            }).eq('id', id);

            await (supabase as any).from('fee_payments').update({
                cheque_status: status,
                is_bounced: status === 'Bounced',
            }).eq('id', payment_id);

            if (status === 'Bounced') {
                const { data: pm } = await (supabase as any).from('fee_payments').select('student_fee_id, amount_paid').eq('id', payment_id).single();
                if (pm) {
                    const { data: sf } = await (supabase as any).from('student_fees').select('paid_amount').eq('id', pm.student_fee_id).single();
                    if (sf) {
                        await (supabase as any).from('student_fees').update({ paid_amount: Math.max(0, sf.paid_amount - pm.amount_paid) }).eq('id', pm.student_fee_id);
                    }
                }
                if (parent_user_id) {
                    await (supabase as any).from('notifications').insert({
                        user_id: parent_user_id,
                        title: 'Cheque Returned by Bank',
                        message: `Your cheque payment of ₹${amount} has been returned by the bank. Reason: ${bounce_reason || 'Not specified'}. Please make the payment again.`,
                        type: 'warning',
                    });
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheque-tracking'] });
            queryClient.invalidateQueries({ queryKey: ['student-fees'] });
            toast.success('Cheque status updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return { cheques: data || [], isLoading, updateCheque };
}

// ─── Fee Pending Notifications ───────────────────
export function useFeePendingNotifications() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: history, isLoading: historyLoading } = useQuery({
        queryKey: ['fee-notifications-history'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('fee_pending_notifications')
                .select('*, students(full_name, classes(name, section))')
                .order('sent_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const sendReminders = useMutation({
        mutationFn: async (reminders: Array<{
            student_id: string; parent_id: string | null; parent_user_id: string;
            amount_pending: number; notification_type: string; message: string; academic_year: string;
        }>) => {
            for (const r of reminders) {
                await (supabase as any).from('fee_pending_notifications').insert({
                    student_id: r.student_id,
                    parent_id: r.parent_id,
                    notification_type: r.notification_type,
                    sent_by_admin_id: user?.id,
                    amount_pending: r.amount_pending,
                    message: r.message,
                    academic_year: r.academic_year,
                });
                if (['in_app', 'both'].includes(r.notification_type)) {
                    await (supabase as any).from('notifications').insert({
                        user_id: r.parent_user_id,
                        title: 'Fee Payment Reminder',
                        message: r.message,
                        type: 'warning',
                    });
                }
            }
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['fee-notifications-history'] });
            toast.success(`Reminders sent to ${vars.length} parent${vars.length !== 1 ? 's' : ''}`);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return { history: history || [], historyLoading, sendReminders };
}
export function useAllFeePayments(filters?: { from?: string; to?: string }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['all-fee-payments', filters],
        queryFn: async () => {
            let query = (supabase as any)
                .from('fee_payments')
                .select('*, students(full_name, admission_number, classes(name, section))')
                .order('payment_date', { ascending: false });
            if (filters?.from) query = query.gte('payment_date', filters.from);
            if (filters?.to) query = query.lte('payment_date', filters.to);
            const { data, error } = await query;
            if (error) throw error;
            return data as (FeePayment & { students?: any })[];
        },
    });

    return { payments: data || [], isLoading, error };
}
