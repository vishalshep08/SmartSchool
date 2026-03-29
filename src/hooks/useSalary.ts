import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type SalaryRecord = any;

export function useSalary(month?: number, year?: number) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['salary', month, year],
    queryFn: async () => {
      let query = (supabase as any)
        .from('salary_records')
        .select('*, employees(*)')
        .order('created_at', { ascending: false });

      if (month) {
        query = query.eq('month', month);
      }
      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalaryRecord[];
    },
  });

  const createSalaryRecord = useMutation({
    mutationFn: async (record: TablesInsert<'salary_records'>) => {
      const { data, error } = await supabase
        .from('salary_records')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      toast.success('Salary record created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateSalaryRecord = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'salary_records'> & { id: string }) => {
      const { data, error } = await supabase
        .from('salary_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      toast.success('Salary record updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('salary_records')
        .update({ 
          status: 'paid', 
          paid_on: new Date().toISOString().split('T')[0] 
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      toast.success('Marked as paid!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const processAllSalaries = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      // Get all teachers
      const { data: teachers, error: teachersError } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('employee_type', 'Teaching')
        .eq('status', 'Active');

      if (teachersError) throw teachersError;

      // Create salary records for all teachers
      const records = teachers?.map(teacher => ({
        teacher_id: teacher.id,
        month,
        year,
        basic_salary: teacher.salary_amount || 0,
        allowances: (teacher.salary_amount || 0) * 0.1,
        deductions: (teacher.salary_amount || 0) * 0.05,
        net_salary: (teacher.salary_amount || 0) * 1.05,
        days_present: 22,
        days_absent: 0,
        status: 'pending' as const,
      })) || [];

      const { data, error } = await supabase
        .from('salary_records')
        .upsert(records, { onConflict: 'teacher_id,month,year' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      toast.success('Salary processed for all teachers!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    salaryRecords: data || [],
    isLoading,
    error,
    refetch,
    createSalaryRecord,
    updateSalaryRecord,
    markAsPaid,
    processAllSalaries,
  };
}
