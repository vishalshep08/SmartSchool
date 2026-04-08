-- Fix the approved_by foreign key constraint
-- It currently references profiles.id but we're passing user_id

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.teacher_leaves 
DROP CONSTRAINT IF EXISTS teacher_leaves_approved_by_fkey;

-- Step 2: Add a new foreign key that references profiles.user_id instead
-- This allows us to store the auth.uid() directly
ALTER TABLE public.teacher_leaves
ADD CONSTRAINT teacher_leaves_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES auth.users(id);

-- Step 3: Create a school_settings table for global settings
CREATE TABLE IF NOT EXISTS public.school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Everyone can view settings"
ON public.school_settings
FOR SELECT
USING (true);

-- Only principals can manage settings
CREATE POLICY "Principals can manage settings"
ON public.school_settings
FOR ALL
USING (has_role(auth.uid(), 'principal'));

-- Insert default settings (all school-specific fields start empty so fresh installs have no hardcoded branding)
INSERT INTO public.school_settings (setting_key, setting_value)
VALUES 
  ('school', '{"schoolName": "", "schoolCode": "", "email": "", "phone": "", "address": "", "academicYear": "", "sessionStartDate": "", "appSubtitle": ""}'::jsonb),
  ('notifications', '{"attendanceAlerts": true, "homeworkReminders": true, "eventNotifications": true, "inOutTracking": true, "issueUpdates": true, "pushNotifications": true, "emailNotifications": true, "whatsappMessages": false, "smsAlerts": false}'::jsonb),
  ('security', '{"strongPasswords": true, "passwordExpiry": false, "twoFactor": false, "autoBackup": true, "encryptData": true, "activityLogging": true}'::jsonb),
  ('integrations', '{"biometricDeviceIp": "", "whatsappApiKey": ""}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;