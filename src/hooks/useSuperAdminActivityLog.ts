import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuperAdminActivityLog {
  id: string;
  performed_by_user_id: string | null;
  performed_by_name: string;
  performed_by_role: string;
  action_type: string;
  module: string;
  record_affected: string;
  ip_address: string;
  created_at: string;
}

interface Filters {
  search: string;
  actionType: string;
  module: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export function useSuperAdminActivityLog(filters: Filters) {
  return useQuery({
    queryKey: ['super-admin-activity-log', filters],
    queryFn: async () => {
      let countQuery = supabase
        .from('super_admin_activity_log')
        .select('id', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('super_admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters to both
      if (filters.actionType && filters.actionType !== 'all') {
        countQuery = countQuery.eq('action_type', filters.actionType);
        dataQuery = dataQuery.eq('action_type', filters.actionType);
      }
      if (filters.module && filters.module !== 'all') {
        countQuery = countQuery.eq('module', filters.module);
        dataQuery = dataQuery.eq('module', filters.module);
      }
      if (filters.dateFrom) {
        countQuery = countQuery.gte('created_at', filters.dateFrom);
        dataQuery = dataQuery.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setDate(toDate.getDate() + 1);
        countQuery = countQuery.lt('created_at', toDate.toISOString());
        dataQuery = dataQuery.lt('created_at', toDate.toISOString());
      }
      if (filters.search) {
        const s = `%${filters.search}%`;
        const orFilter = `performed_by_name.ilike.${s},action_type.ilike.${s},module.ilike.${s},record_affected.ilike.${s}`;
        countQuery = countQuery.or(orFilter);
        dataQuery = dataQuery.or(orFilter);
      }

      // Pagination
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      dataQuery = dataQuery.range(from, to);

      const [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([
        countQuery,
        dataQuery,
      ]);

      if (countErr) throw countErr;
      if (dataErr) throw dataErr;

      return {
        logs: (data || []) as SuperAdminActivityLog[],
        totalCount: count || 0,
      };
    },
  });
}
