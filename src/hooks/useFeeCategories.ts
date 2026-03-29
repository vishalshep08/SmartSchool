import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeeCategory {
    id: string;
    category_name: string;
    description: string | null;
    created_at: string;
}

export function useFeeCategories() {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['fee-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fee_categories' as any)
                .select('*')
                .order('category_name');
            if (error) throw error;
            return data as unknown as FeeCategory[];
        },
    });

    const createCategory = useMutation({
        mutationFn: async (category: { category_name: string; description?: string }) => {
            const { data, error } = await supabase
                .from('fee_categories' as any)
                .insert(category)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-categories'] });
            toast.success('Fee category created');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateCategory = useMutation({
        mutationFn: async ({ id, ...updates }: { id: string; category_name?: string; description?: string }) => {
            const { data, error } = await supabase
                .from('fee_categories' as any)
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-categories'] });
            toast.success('Fee category updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('fee_categories' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-categories'] });
            toast.success('Fee category deleted');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return {
        categories: data || [],
        isLoading,
        error,
        createCategory,
        updateCategory,
        deleteCategory,
    };
}
