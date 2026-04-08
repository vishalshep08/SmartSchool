import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolSettingsData {
  schoolName: string;
  schoolCode: string;
  email: string;
  phone: string;
  address: string;
  academicYear: string;
  sessionStartDate: string;
  appSubtitle: string;
  logoUrl: string;
}

// Default fallback object — all empty strings, never hardcoded branding
const DEFAULT_SCHOOL_SETTINGS: SchoolSettingsData = {
  schoolName: '',
  schoolCode: '',
  email: '',
  phone: '',
  address: '',
  academicYear: '',
  sessionStartDate: '',
  appSubtitle: '',
  logoUrl: '',
};

const QUERY_KEY = ['school-settings', 'school'];

/**
 * Single source of truth for school settings.
 * Fetches from school_settings where setting_key = 'school'.
 * Exposes a refetch() so the settings panel can refresh the whole app after save.
 */
export function useSchoolSettings(): SchoolSettingsData & { refetch: () => void } {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('setting_value')
        .eq('setting_key', 'school')
        .single();

      if (error || !data) return DEFAULT_SCHOOL_SETTINGS;
      return { ...DEFAULT_SCHOOL_SETTINGS, ...(data.setting_value as unknown as Partial<SchoolSettingsData>) };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return { ...(data ?? DEFAULT_SCHOOL_SETTINGS), refetch };
}

/**
 * Convenience hook — just returns the school name string.
 * Use this in sidebars, headers, PDF templates etc.
 */
export function useSchoolName(): string {
  const { schoolName } = useSchoolSettings();
  return schoolName;
}
