import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LogParams {
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'PERMISSION_CHANGE';
  module: 'Students' | 'Staff' | 'Attendance' | 'Fee' | 'Reports' | 'Auth' | 'Homework' | 'Settings' | 'Events' | 'Notices' | 'Documents' | 'Email' | 'Privileges' | 'Salary';
  recordAffected: string;
}

export function useAdminActionLogger() {
  const { user, profile, role } = useAuth();

  const logAction = useCallback(async ({ actionType, module, recordAffected }: LogParams) => {
    if (!user) return;

    try {
      await supabase.from('super_admin_activity_log' as any).insert({
        performed_by_user_id: user.id,
        performed_by_name: profile?.fullName || user.email || 'Unknown',
        performed_by_role: role || 'admin',
        action_type: actionType,
        module,
        record_affected: recordAffected,
        ip_address: 'N/A',
      });
    } catch (err) {
      console.error('Failed to log admin action:', err);
    }
  }, [user, profile, role]);

  return { logAction };
}
