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
}

const DEFAULTS: SchoolSettingsData = {
  schoolName: 'SmartSchool',
  schoolCode: 'SSA-2024',
  email: 'admin@smartschool.edu',
  phone: '+91 98765 43210',
  address: '123 Education Street, Learning City, India - 110001',
  academicYear: '2024-2025',
  sessionStartDate: '2024-04-01',
};

/**
 * Lightweight hook used throughout the app to read the current school settings.
 * Settings are written by Settings.tsx via useSettings → school_settings table.
 * This hook simply reads them with a 10-minute cache so any page can use them.
 */
export function useSchoolSettings(): SchoolSettingsData {
  const { data } = useQuery({
    queryKey: ['school-settings', 'school'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('setting_value')
        .eq('setting_key', 'school')
        .single();

      if (error || !data) return DEFAULTS;
      return { ...DEFAULTS, ...(data.setting_value as unknown as Partial<SchoolSettingsData>) };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return data ?? DEFAULTS;
}

/**
 * Convenience hook — just returns the school name string.
 * Use this in sidebars, headers, PDF templates etc.
 */
export function useSchoolName(): string {
  const settings = useSchoolSettings();
  return settings.schoolName || 'SmartSchool';
}
