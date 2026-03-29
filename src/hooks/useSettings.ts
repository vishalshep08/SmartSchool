import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Settings interfaces
interface SchoolSettings {
  schoolName: string;
  schoolCode: string;
  email: string;
  phone: string;
  address: string;
  academicYear: string;
  sessionStartDate: string;
}

interface NotificationSettings {
  attendanceAlerts: boolean;
  homeworkReminders: boolean;
  eventNotifications: boolean;
  inOutTracking: boolean;
  issueUpdates: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  whatsappMessages: boolean;
  smsAlerts: boolean;
}

interface SecuritySettings {
  strongPasswords: boolean;
  passwordExpiry: boolean;
  twoFactor: boolean;
  autoBackup: boolean;
  encryptData: boolean;
  activityLogging: boolean;
}

interface IntegrationSettings {
  biometricDeviceIp: string;
  whatsappApiKey: string;
}

export interface AllSettings {
  school: SchoolSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  integrations: IntegrationSettings;
}

const defaultSettings: AllSettings = {
  school: {
    schoolName: 'SmartSchool Academy',
    schoolCode: 'SSA-2024',
    email: 'admin@smartschool.edu',
    phone: '+91 98765 43210',
    address: '123 Education Street, Learning City, India - 110001',
    academicYear: '2024-2025',
    sessionStartDate: '2024-04-01',
  },
  notifications: {
    attendanceAlerts: true,
    homeworkReminders: true,
    eventNotifications: true,
    inOutTracking: true,
    issueUpdates: true,
    pushNotifications: true,
    emailNotifications: true,
    whatsappMessages: false,
    smsAlerts: false,
  },
  security: {
    strongPasswords: true,
    passwordExpiry: false,
    twoFactor: false,
    autoBackup: true,
    encryptData: true,
    activityLogging: true,
  },
  integrations: {
    biometricDeviceIp: '',
    whatsappApiKey: '',
  },
};

export function useSettings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<AllSettings>(defaultSettings);

  // Fetch settings from database
  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ['school-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Error fetching settings:', error);
        return defaultSettings;
      }

      // Convert array of settings to object
      const settingsMap: AllSettings = { ...defaultSettings };
      
      data?.forEach((row) => {
        const key = row.setting_key as keyof AllSettings;
        if (key in settingsMap && row.setting_value) {
          // Type assertion needed due to JSONB flexibility
          if (key === 'school') {
            settingsMap.school = row.setting_value as unknown as SchoolSettings;
          } else if (key === 'notifications') {
            settingsMap.notifications = row.setting_value as unknown as NotificationSettings;
          } else if (key === 'security') {
            settingsMap.security = row.setting_value as unknown as SecuritySettings;
          } else if (key === 'integrations') {
            settingsMap.integrations = row.setting_value as unknown as IntegrationSettings;
          }
        }
      });

      return settingsMap;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Update local state when DB data changes
  useEffect(() => {
    if (dbSettings) {
      setLocalSettings(dbSettings);
    }
  }, [dbSettings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: AllSettings) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }));

      // Use upsert to handle both insert and update
      for (const update of updates) {
        const { error } = await supabase
          .from('school_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) {
          console.error(`Error saving ${update.setting_key}:`, error);
          throw error;
        }
      }

      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      toast.success('Settings saved successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const updateSettings = useCallback((newSettings: Partial<AllSettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  const updateSchoolSettings = useCallback((school: Partial<SchoolSettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      school: { ...prev.school, ...school },
    }));
  }, []);

  const updateNotificationSettings = useCallback((notifications: Partial<NotificationSettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...notifications },
    }));
  }, []);

  const updateSecuritySettings = useCallback((security: Partial<SecuritySettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      security: { ...prev.security, ...security },
    }));
  }, []);

  const updateIntegrationSettings = useCallback((integrations: Partial<IntegrationSettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      integrations: { ...prev.integrations, ...integrations },
    }));
  }, []);

  const saveSettings = useCallback(async () => {
    await saveMutation.mutateAsync(localSettings);
  }, [localSettings, saveMutation]);

  return {
    settings: localSettings,
    isLoading,
    isSaving: saveMutation.isPending,
    updateSettings,
    updateSchoolSettings,
    updateNotificationSettings,
    updateSecuritySettings,
    updateIntegrationSettings,
    saveSettings,
  };
}

// Hook for getting school name globally (used by WhatsApp, reports, etc.)
export function useSchoolName() {
  const { data: schoolSettings } = useQuery({
    queryKey: ['school-settings', 'school'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('setting_value')
        .eq('setting_key', 'school')
        .single();

      if (error || !data) {
        return 'SmartSchool Academy';
      }

      const schoolData = data.setting_value as unknown as SchoolSettings;
      return schoolData?.schoolName || 'SmartSchool Academy';
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  return schoolSettings || 'SmartSchool Academy';
}
