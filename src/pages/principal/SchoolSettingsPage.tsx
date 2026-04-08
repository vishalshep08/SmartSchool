import { useState, useRef, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/common/PageHeader';
import {
  Save, Loader2, Upload, X, School,
} from 'lucide-react';
import { toast } from 'sonner';

// Requires 'school-assets' public bucket in Supabase Storage
// Create it in: Supabase Dashboard → Storage → New bucket → Name: school-assets → Public: true

export default function SchoolSettingsPage() {
  const { user } = useAuth();
  const {
    settings,
    isLoading,
    isSaving,
    updateSchoolSettings,
    saveSettings,
  } = useSettings();

  const { refetch } = useSchoolSettings();

  /* ── Logo state ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoError, setLogoError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  /* Sync logo preview from DB settings on load */
  useEffect(() => {
    const saved = (settings.school as any).logoUrl || '';
    setLogoPreview(saved);
  }, [settings.school]);

  /* ── Logo upload handler ── */
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoError('Only PNG or JPG images are allowed.');
      return;
    }
    // Validate size (2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image must be under 2 MB.');
      return;
    }

    setLogoError('');
    // Instant preview
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);

    setIsUploading(true);
    try {
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      // Use user id as school identifier (unique per school installation)
      const schoolId = user?.id || 'default';
      const path = `logos/${schoolId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('school-assets')
        .getPublicUrl(path);

      const publicUrl = data.publicUrl;
      setLogoPreview(publicUrl);
      updateSchoolSettings({ logoUrl: publicUrl } as any);
      toast.success('Logo uploaded — click Save to apply.');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
      setLogoPreview((settings.school as any).logoUrl || '');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoRemove = () => {
    setLogoPreview('');
    setLogoError('');
    updateSchoolSettings({ logoUrl: '' } as any);
  };

  const handleSave = async () => {
    await saveSettings();
    refetch(); // Propagate to sidebar, login page, etc.
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const schoolName = settings.school.schoolName;
  const initial = schoolName ? schoolName.trim()[0].toUpperCase() : '?';

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Settings"
        description="Configure your school's branding, contact information, and academic year"
      />

      <div className="flex justify-end animate-fade-up">
        <Button variant="gradient" className="gap-2" onClick={handleSave} disabled={isSaving || isUploading}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">

        {/* ── School Logo ── */}
        <div className="glass-card p-6 animate-fade-up">
          <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            School Logo
          </h3>
          <div className="flex items-center gap-6 flex-wrap">
            {/* Preview */}
            <div style={{
              width: 72, height: 72, borderRadius: 16,
              overflow: 'hidden', flexShrink: 0,
              border: '2px solid hsl(var(--border))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: logoPreview ? 'transparent' : 'hsl(var(--primary))',
              position: 'relative',
            }}>
              {isUploading && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                }}>
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              {logoPreview
                ? <img src={logoPreview} alt="School logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{initial}</span>
              }
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'Uploading…' : 'Upload Logo'}
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                    onClick={handleLogoRemove}
                    disabled={isUploading}
                  >
                    <X className="w-3.5 h-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: square image, PNG or JPG, max 2 MB
              </p>
              {logoError && (
                <p className="text-xs text-destructive font-medium">{logoError}</p>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={handleLogoSelect}
          />
        </div>

        {/* ── School Information ── */}
        <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <h3 className="font-heading font-semibold text-foreground mb-4">School Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>School Name</Label>
              <Input
                value={settings.school.schoolName}
                onChange={(e) => updateSchoolSettings({ schoolName: e.target.value })}
                placeholder="e.g. Delhi Public School"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>School Code</Label>
              <Input
                value={settings.school.schoolCode}
                onChange={(e) => updateSchoolSettings({ schoolCode: e.target.value })}
                placeholder="e.g. DPS-2024"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.school.email}
                onChange={(e) => updateSchoolSettings({ email: e.target.value })}
                placeholder="admin@school.edu"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={settings.school.phone}
                onChange={(e) => updateSchoolSettings({ phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input
                value={settings.school.address}
                onChange={(e) => updateSchoolSettings({ address: e.target.value })}
                placeholder="123 Education Street, City, State - 110001"
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label>
                App Subtitle{' '}
                <span className="text-muted-foreground text-xs">
                  (shown in sidebar &amp; login — e.g. "School Management System")
                </span>
              </Label>
              <Input
                value={(settings.school as any).appSubtitle || ''}
                onChange={(e) => updateSchoolSettings({ appSubtitle: e.target.value } as any)}
                placeholder="School Management System"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* ── Academic Year ── */}
        <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h3 className="font-heading font-semibold text-foreground mb-4">Academic Year</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Current Academic Year</Label>
              <Input
                value={settings.school.academicYear}
                onChange={(e) => updateSchoolSettings({ academicYear: e.target.value })}
                placeholder="2025-2026"
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

        {/* ── Regional Settings ── */}
        <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
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

      </div>
    </div>
  );
}
