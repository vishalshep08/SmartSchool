import { useState } from 'react';

import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  School, 
  ArrowRight,
  Loader2,
  KeyRound,
  AlertTriangle
} from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const passwordChangeSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, role, authInitialized } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Password change dialog state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const ROLE_HOME: Record<string, string> = {
    admin: '/dashboard',
    super_admin: '/super-admin/dashboard',
    teacher: '/dashboard-teacher',
    parent: '/parent/dashboard',
    staff: '/dashboard-staff',
    principal: '/dashboard',
  };

  // If already authenticated, redirect at render time — no useEffect
  if (authInitialized && isAuthenticated && role) {
    return <Navigate to={ROLE_HOME[role] || '/dashboard'} replace />;
  }


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error, role: userRole } = await login(loginEmail, loginPassword);

      if (error) {
        if (error.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else if (error.includes('Email not confirmed')) {
          toast.error('Please verify your email before logging in.');
        } else {
          toast.error(error);
        }
        return;
      }

      // Check if user needs to change password
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('force_password_change')
          .eq('user_id', user.id)
          .single();

        if (profile?.force_password_change) {
          setPendingUserId(user.id);
          setShowPasswordChange(true);
          return;
        }
      }

      toast.success('Welcome back!');

      // Log login action for admin
      if (userRole === 'principal') {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', currentUser.id).maybeSingle();
            await supabase.from('super_admin_activity_log' as any).insert({
              performed_by_user_id: currentUser.id,
              performed_by_name: prof?.full_name || loginEmail,
              performed_by_role: 'principal',
              action_type: 'LOGIN',
              module: 'Auth',
              record_affected: `Admin login: ${loginEmail}`,
              ip_address: 'N/A',
            });
          }
        } catch (_) { /* non-critical */ }
      }

      // Redirect immediately after successful login — no useEffect
      navigate(ROLE_HOME[userRole!] || '/dashboard', { replace: true });

      
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordChangeSchema.safeParse({
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsChangingPassword(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      // Clear the force_password_change flag
      if (pendingUserId) {
        await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('user_id', pendingUserId);
      }

      toast.success('Password changed successfully!');
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');

      // Get user role and redirect
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', pendingUserId)
        .single();

      const userRoleAfterPwChange = roleData?.role as UserRole;
      navigate(ROLE_HOME[userRoleAfterPwChange] || '/dashboard', { replace: true });


    } catch (error) {
      toast.error('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Show loading spinner while auth initializes on the login page too
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" 
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(240 80% 60%) 100%)' }}>
        
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="animate-fade-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center">
                <School className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">SmartSchool</h1>
                <p className="text-white/70 text-sm">ERP System</p>
              </div>
            </div>

            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              Manage Your School<br />
              <span className="text-white/80">Smarter and Faster</span>
            </h2>

            <p className="text-white/70 text-lg max-w-md mb-8">
              A complete digital platform for Principals and Teachers.
              Parents receive updates via WhatsApp.
            </p>

            <div className="flex flex-wrap gap-4">
              {['Attendance', 'Homework', 'Timetable', 'Reports'].map((feature, i) => (
                <span 
                  key={feature}
                  className="px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium backdrop-blur-xl animate-fade-up"
                  style={{ animationDelay: `${i * 100 + 300}ms` }}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form Only */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-up">

          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 
            flex items-center justify-center shadow-lg">
              <School className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">SmartSchool</h1>
              <p className="text-muted-foreground text-sm">ERP System</p>
            </div>
          </div>

          {/* Login Form */}
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1">Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              <Button 
                type="submit" 
                variant="gradient"
                size="xl"
                className="w-full mt-6"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <>
                  Sign In <ArrowRight />
                </>}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Note:</strong> Teacher accounts are created by the school admin.
                Contact your administrator if you need access.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordChange} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Change Your Password
            </DialogTitle>
            <DialogDescription>
              For security, you must change your password before continuing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              This is your first login. Please create a new secure password.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 mt-2">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            <Button 
              type="submit" 
              variant="gradient"
              className="w-full"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Change Password & Continue
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
