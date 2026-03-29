import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttendanceRecord {
  date: string;
  status: string;
}

export interface HomeworkRecord {
  id: string;
  subject: string;
  title: string;
  due_date: string;
  created_at: string;
}

export interface RemarkRecord {
  id: string;
  category: string;
  created_at: string;
}

export interface DocRequestRecord {
  id: string;
  current_stage: string;
}

export interface FeeRecord {
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
}

export interface FeePaymentRecord {
  id: string;
  amount_paid: number;
  payment_date: string;
}

export function useParentAnalytics(studentId?: string, classId?: string) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  // ── Current month attendance ──
  const { data: monthAttendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: ['parent-analytics-attendance-month', studentId, monthStart, today],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_attendance')
        .select('date, status')
        .eq('student_id', studentId)
        .gte('date', monthStart)
        .lte('date', today);
      if (error) throw error;
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!studentId,
  });

  // ── Last 3 months attendance (for trend) ──
  const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
  const threeMonthStart = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: threeMonthAttendance = [], isLoading: loadingTrend } = useQuery({
    queryKey: ['parent-analytics-attendance-3mo', studentId, threeMonthStart, today],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_attendance')
        .select('date, status')
        .eq('student_id', studentId)
        .gte('date', threeMonthStart)
        .lte('date', today);
      if (error) throw error;
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!studentId,
  });

  // ── Last 7 days attendance (for sparkline) ──
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sparkStart = sevenDaysAgo.toISOString().split('T')[0];

  const { data: weekAttendance = [] } = useQuery({
    queryKey: ['parent-analytics-attendance-week', studentId, sparkStart, today],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_attendance')
        .select('date, status')
        .eq('student_id', studentId)
        .gte('date', sparkStart)
        .lte('date', today)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!studentId,
  });

  // ── Homework for class (current month) ──
  const { data: homework = [], isLoading: loadingHw } = useQuery({
    queryKey: ['parent-analytics-homework', classId, monthStart],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await supabase
        .from('homework')
        .select('id, subject, title, due_date, created_at')
        .eq('class_id', classId)
        .gte('created_at', monthStart);
      if (error) throw error;
      return (data || []) as HomeworkRecord[];
    },
    enabled: !!classId,
  });

  // ── Fees ──
  const { data: feeData, isLoading: loadingFee } = useQuery({
    queryKey: ['parent-analytics-fee', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await (supabase as any)
        .from('student_fees')
        .select('id, total_amount, paid_amount, balance_amount, status')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (FeeRecord & { id: string }) | null;
    },
    enabled: !!studentId,
  });

  // ── Fee Payments (for timeline) ──
  const { data: feePayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['parent-analytics-fee-payments', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      // Get all student_fee IDs for this student
      const { data: feeIds } = await (supabase as any)
        .from('student_fees')
        .select('id')
        .eq('student_id', studentId);

      if (!feeIds || feeIds.length === 0) return [];

      const ids = feeIds.map((f: any) => f.id);
      const { data, error } = await (supabase as any)
        .from('fee_payments')
        .select('id, amount_paid, payment_date')
        .in('student_fee_id', ids)
        .order('payment_date', { ascending: true });
      if (error) throw error;
      return (data || []) as FeePaymentRecord[];
    },
    enabled: !!studentId,
  });

  // ── Remarks (this year) ──
  const { data: remarks = [], isLoading: loadingRemarks } = useQuery({
    queryKey: ['parent-analytics-remarks', studentId, currentYear],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_remarks')
        .select('id, category, created_at')
        .eq('student_id', studentId)
        .gte('created_at', `${currentYear}-01-01`);
      if (error) throw error;
      return (data || []) as RemarkRecord[];
    },
    enabled: !!studentId,
  });

  // ── Document Requests ──
  const { data: docRequests = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['parent-analytics-docs', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await (supabase as any)
        .from('document_requests')
        .select('id, current_stage')
        .eq('student_id', studentId);
      if (error) throw error;
      return (data || []) as DocRequestRecord[];
    },
    enabled: !!studentId,
  });

  return {
    monthAttendance,
    threeMonthAttendance,
    weekAttendance,
    homework,
    feeData,
    feePayments,
    remarks,
    docRequests,
    currentMonth,
    currentYear,
    isLoading: loadingAtt || loadingTrend || loadingHw || loadingFee || loadingPayments || loadingRemarks || loadingDocs,
  };
}
