import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeachers } from '@/hooks/useTeachers';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Key,
  Save,
  Loader2,
  Lock,
  Calendar,
  Briefcase
} from 'lucide-react';

export default function Profile() {
  const { user, profile, role, logout } = useAuth();
  const { teachers } = useTeachers();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Get current teacher details if applicable
  const currentTeacher = teachers.find(t => t.user_id === user?.id);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    qualification: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.fullName || '',
        phone: profile.phone || '',
        address: (currentTeacher as any)?.address || '',
        qualification: currentTeacher?.qualification || '',
      });
    }
  }, [profile, currentTeacher]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Update profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // If teacher, update teacher record too
      if (currentTeacher && formData.qualification) {
        const { error: teacherError } = await (supabase as any)
          .from('employees')
          .update({ qualification: formData.qualification })
          .eq('id', currentTeacher.id);

      if (teacherError) throw teacherError;
      }

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      // If teacher has force_password_change flag, remove it
      if (user) {
        await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('user_id', user.id);
      }

      toast.success('Password changed successfully!');
      setIsPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          View and update your personal information
        </p>
      </div>

      {/* Profile Card */}
      <Card className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                {profile?.fullName?.split(' ').map(n => n[0]).join('') || '?'}
              </span>
            </div>
            <div>
              <CardTitle className="text-2xl">{profile?.fullName || 'User'}</CardTitle>
              <CardDescription className="capitalize text-base mt-1">
                {role === 'principal' ? 'Principal / Administrator' : 
                 role === 'staff' ? 'Staff Member' : 
                 role === 'teacher' ? 'Teacher' : role}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1.5"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email (Read-only)
              </Label>
              <Input
                value={profile?.email || user?.email || ''}
                disabled
                className="mt-1.5 bg-muted"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1.5"
                placeholder="Enter your phone number"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1.5"
                placeholder="Enter your full address"
              />
            </div>
            {(role === 'teacher' || role === 'staff') && currentTeacher && (
              <div>
                <Label className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Qualification
                </Label>
                <Input
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="mt-1.5"
                  placeholder="e.g., M.Ed, B.Ed, PhD"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleUpdateProfile} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employment Details (for teachers and staff) */}
      {(role === 'teacher' || role === 'staff') && currentTeacher && (
        <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Employment Details
            </CardTitle>
            <CardDescription>
              Your employment information (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Employee ID</p>
                <p className="font-medium text-foreground">{currentTeacher.employee_id}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="font-medium text-foreground">{currentTeacher.subject}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Joining Date</p>
                <p className="font-medium text-foreground">
                  {new Date(currentTeacher.joining_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Experience</p>
                <p className="font-medium text-foreground">
                  {currentTeacher.experience_years || 0} years
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`font-medium ${currentTeacher.is_active ? 'text-success' : 'text-destructive'}`}>
                  {currentTeacher.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">
                Change your password to keep your account secure
              </p>
            </div>
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="mt-1.5"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="mt-1.5"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button 
                    onClick={handleChangePassword} 
                    className="w-full"
                    disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                  >
                    {passwordLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Update Password
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
