import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDisplayName = () => {
  const { user, role } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchName = async () => {
      try {
        // Source 1: profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled && profile?.full_name) {
          setDisplayName(profile.full_name);
          setLoading(false);
          return;
        }

        // Source 2: employees table (for teachers, staff, principal)
        if (role === 'teacher' || role === 'staff' || role === 'principal') {
          const { data: emp } = await supabase
            .from('employees')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!cancelled && emp?.full_name) {
            setDisplayName(emp.full_name);
            setLoading(false);
            return;
          }

          // Source 3: teachers table
          const { data: teacher } = await supabase
            .from('teachers')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!cancelled && teacher?.full_name) {
            setDisplayName(teacher.full_name);
            setLoading(false);
            return;
          }
        }

        // Source 4: parents table
        if (role === 'parent') {
          const { data: parent } = await supabase
            .from('parents')
            .select('name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!cancelled && parent?.name) {
            setDisplayName(parent.name);
            setLoading(false);
            return;
          }
        }

        // Final fallback: use email prefix
        if (!cancelled) {
          const emailName = user.email?.split('@')[0] || 'User';
          setDisplayName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        }
      } catch (err) {
        console.error('[useDisplayName] Error:', err);
        if (!cancelled) {
          const emailName = user.email?.split('@')[0] || 'User';
          setDisplayName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchName();
    return () => { cancelled = true; };
  }, [user?.id, role]);

  return { displayName, loading };
};
