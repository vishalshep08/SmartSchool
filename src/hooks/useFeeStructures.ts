import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeeInstallment {
    id?: string;
    fee_structure_id?: string;
    installment_number: number;
    installment_name: string;
    due_date: string;
    amount: number;
}

export interface FeeStructure {
    id: string;
    academic_year: string;
    class_id: string;
    fee_category_id: string;
    total_amount: number;
    installment_type: 'Full' | 'Term-wise' | 'Monthly';
    created_at: string;
    updated_at: string;
    classes?: { name: string; section: string | null; grade: number } | null;
    fee_categories?: { category_name: string } | null;
    fee_installments?: FeeInstallment[];
}

export function useFeeStructures(academicYear?: string) {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['fee-structures', academicYear],
        queryFn: async () => {
            let query = (supabase as any)
                .from('fee_structures')
                .select('*, classes(name, section, grade), fee_categories(category_name), fee_installments(*)')
                .order('academic_year', { ascending: false })
                .order('created_at', { ascending: false });
            if (academicYear) query = query.eq('academic_year', academicYear);
            const { data, error } = await query;
            if (error) throw error;
            return data as FeeStructure[];
        },
    });

    const createStructure = useMutation({
        mutationFn: async (input: {
            academic_year: string;
            class_id: string;
            fee_category_id: string;
            total_amount: number;
            installment_type: string;
            installments: Omit<FeeInstallment, 'id' | 'fee_structure_id'>[];
        }) => {
            const { installments, ...structureData } = input;
            const { data: structure, error: sErr } = await (supabase as any)
                .from('fee_structures')
                .insert(structureData)
                .select()
                .single();
            if (sErr) throw sErr;

            if (installments.length > 0) {
                const installmentRows = installments.map((inst) => ({
                    fee_structure_id: structure.id,
                    installment_number: inst.installment_number,
                    installment_name: inst.installment_name,
                    due_date: inst.due_date,
                    amount: inst.amount,
                }));
                const { error: iErr } = await (supabase as any)
                    .from('fee_installments')
                    .insert(installmentRows);
                if (iErr) throw iErr;
            }

            return structure;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
            toast.success('Fee structure created');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteStructure = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('fee_structures')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
            toast.success('Fee structure deleted');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return {
        structures: data || [],
        isLoading,
        error,
        createStructure,
        deleteStructure,
    };
}
