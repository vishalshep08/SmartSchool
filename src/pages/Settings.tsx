import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  School, 
  Bell, 
  Shield, 
  Smartphone,
  Database,
  Save,
  Loader2
} from 'lucide-react';

export default function Settings() {
  const {
    settings,
    isLoading,
    isSaving,
    updateSchoolSettings,
    updateNotificationSettings,
    updateSecuritySettings,
    updateIntegrationSettings,
    saveSettings,
  } = useSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your school management system</p>
        </div>
        <Button variant="gradient" className="gap-2" onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="school" className="space-y-6">
        <TabsList className="animate-fade-up" style={{ animationDelay: '50ms' }}>
          <TabsTrigger value="school" className="gap-2">
            <School className="w-4 h-4" />
            School
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Smartphone className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="space-y-6">
          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">School Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>School Name</Label>
                <Input 
                  value={settings.school.schoolName}
                  onChange={(e) => updateSchoolSettings({ schoolName: e.target.value })}
                  className="mt-1.5" 
                />
              </div>
              <div>
                <Label>School Code</Label>
                <Input 
                  value={settings.school.schoolCode}
                  onChange={(e) => updateSchoolSettings({ schoolCode: e.target.value })}
                  className="mt-1.5" 
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={settings.school.email}
                  onChange={(e) => updateSchoolSettings({ email: e.target.value })}
                  className="mt-1.5" 
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={settings.school.phone}
                  onChange={(e) => updateSchoolSettings({ phone: e.target.value })}
                  className="mt-1.5" 
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input 
                  value={settings.school.address}
                  onChange={(e) => updateSchoolSettings({ address: e.target.value })}
                  className="mt-1.5" 
                />
              </div>
              <div className="md:col-span-2">
                <Label>App Subtitle <span className="text-muted-foreground text-xs">(shown in sidebar &amp; login — e.g. "School Management System")</span></Label>
                <Input 
                  value={(settings.school as any).appSubtitle || ''}
                  onChange={(e) => updateSchoolSettings({ appSubtitle: e.target.value } as any)}
                  placeholder="School Management System"
                  className="mt-1.5" 
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Academic Year</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Current Academic Year</Label>
                <Input 
                  value={settings.school.academicYear}
                  onChange={(e) => updateSchoolSettings({ academicYear: e.target.value })}
                  className="mt-1.5" 
                />
              </div>
              <div>
                <Label>Session Start Date</Label>
                <Input 
                  type="date" 
                  value={settings.school.sessionStartDate}
                  onChange={(e) => updateSchoolSettings({ sessionStartDate: e.target.value })}
                  className="mt-1.5" 
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Regional Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Date Format</p>
                <p className="font-medium text-foreground">DD/MM/YYYY</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Time Zone</p>
                <p className="font-medium text-foreground">IST (Asia/Kolkata)</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium text-foreground">₹ INR</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Notification Preferences</h3>
            <div className="space-y-6">
              {[
                { key: 'attendanceAlerts', label: 'Attendance Alerts', description: 'Notify parents when student is marked absent' },
                { key: 'homeworkReminders', label: 'Homework Reminders', description: 'Send reminders for pending homework' },
                { key: 'eventNotifications', label: 'Event Notifications', description: 'Notify about upcoming events and holidays' },
                { key: 'inOutTracking', label: 'In/Out Tracking', description: 'Send student arrival/departure notifications' },
                { key: 'issueUpdates', label: 'Issue Updates', description: 'Notify teachers about issue status changes' },
              ].map((item, index) => (
                <div 
                  key={item.key}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0 opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50 + 150}ms` }}
                >
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch 
                    checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                    onCheckedChange={(checked) => updateNotificationSettings({ [item.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Notification Channels</h3>
            <div className="space-y-4">
              {[
                { key: 'pushNotifications', label: 'Push Notifications' },
                { key: 'emailNotifications', label: 'Email Notifications' },
                { key: 'whatsappMessages', label: 'WhatsApp Messages' },
                { key: 'smsAlerts', label: 'SMS Alerts' },
              ].map((channel, index) => (
                <div 
                  key={channel.key}
                  className="flex items-center justify-between opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50 + 250}ms` }}
                >
                  <span className="text-foreground">{channel.label}</span>
                  <Switch 
                    checked={settings.notifications[channel.key as keyof typeof settings.notifications]}
                    onCheckedChange={(checked) => updateNotificationSettings({ [channel.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Biometric Integration</h3>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Fingerprint Device</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your biometric attendance device for automatic teacher attendance sync.
                </p>
                <div className="flex gap-3 mt-4">
                  <Input 
                    placeholder="Device IP Address" 
                    value={settings.integrations.biometricDeviceIp}
                    onChange={(e) => updateIntegrationSettings({ biometricDeviceIp: e.target.value })}
                    className="max-w-xs" 
                  />
                  <Button variant="outline">Connect</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Email Notifications (Resend)</h3>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Email Integration</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Attendance, homework, and notice emails are sent automatically via Resend. The API key is stored securely in server environment variables.
                </p>
                <div className="mt-3 px-3 py-2 rounded-md bg-success/10 text-success text-sm font-medium inline-block">
                  ✓ Active — RESEND_API_KEY configured
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Password Policy</h3>
            <div className="space-y-4">
              {[
                { key: 'strongPasswords', label: 'Require strong passwords' },
                { key: 'passwordExpiry', label: 'Password expiry (90 days)' },
                { key: 'twoFactor', label: 'Two-factor authentication' },
              ].map((policy, index) => (
                <div 
                  key={policy.key}
                  className="flex items-center justify-between opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50 + 150}ms` }}
                >
                  <span className="text-foreground">{policy.label}</span>
                  <Switch 
                    checked={settings.security[policy.key as keyof typeof settings.security]}
                    onCheckedChange={(checked) => updateSecuritySettings({ [policy.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h3 className="font-heading font-semibold text-foreground mb-4">Data & Privacy</h3>
            <div className="space-y-4">
              {[
                { key: 'autoBackup', label: 'Automatic data backup' },
                { key: 'encryptData', label: 'Encrypt sensitive data' },
                { key: 'activityLogging', label: 'Activity logging' },
              ].map((setting, index) => (
                <div 
                  key={setting.key}
                  className="flex items-center justify-between opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50 + 250}ms` }}
                >
                  <span className="text-foreground">{setting.label}</span>
                  <Switch 
                    checked={settings.security[setting.key as keyof typeof settings.security]}
                    onCheckedChange={(checked) => updateSecuritySettings({ [setting.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
