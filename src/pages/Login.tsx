import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  KeyRound,
  AlertTriangle,
  Mail,
  Phone,
  CheckCircle2,
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
import { TermsAndConditionsModal } from '@/components/auth/TermsAndConditionsModal';

/* ─── Validation ─────────────────────────────────────────────────────────── */

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const passwordChangeSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

/* ─── Role Definitions ───────────────────────────────────────────────────── */

type RoleKey = 'principal' | 'staff' | 'parent' | 'superadmin';

interface RoleOption {
  key: RoleKey;
  label: string;
  emoji: string;
  description: string;
}

const ROLES: RoleOption[] = [
  { key: 'principal', label: 'Principal', emoji: '🏫', description: 'Full school management access' },
  { key: 'staff',     label: 'Staff',     emoji: '📋', description: 'Administrative & office access' },
  { key: 'parent',    label: 'Parent',    emoji: '👨‍👩‍👧', description: "View your child's progress" },
  { key: 'superadmin',label: 'Super Admin',emoji: '⚙️', description: 'System-level administration' },
];

/* ─── Redirect Map ───────────────────────────────────────────────────────── */
// Maps the *authenticated* role returned by Supabase to the correct dashboard path.
// The roleKey chosen on the login page is only a UX hint — actual redirect uses
// the server-confirmed role from useAuth().
const ROLE_HOME: Record<string, string> = {
  admin:       '/dashboard',
  super_admin: '/super-admin/dashboard',
  teacher:     '/dashboard-teacher',
  parent:      '/parent/dashboard',
  staff:       '/dashboard-staff',
  principal:   '/dashboard',
};

/* ─── School Initial Avatar ──────────────────────────────────────────────── */

function SchoolAvatar({ logoUrl, schoolName, size = 56 }: { logoUrl: string; schoolName: string; size?: number }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={schoolName}
        style={{
          width: size, height: size, borderRadius: '16px',
          objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)',
        }}
      />
    );
  }
  const initial = schoolName ? schoolName.trim()[0].toUpperCase() : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '16px',
      background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, fontWeight: 700, color: '#fff',
      border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function SchoolAvatarLight({ logoUrl, schoolName, size = 48 }: { logoUrl: string; schoolName: string; size?: number }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={schoolName}
        style={{ width: size, height: size, borderRadius: '12px', objectFit: 'cover' }}
      />
    );
  }
  const initial = schoolName ? schoolName.trim()[0].toUpperCase() : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '12px',
      background: 'hsl(var(--primary))', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, fontWeight: 700, flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

/* ─── Role Card ──────────────────────────────────────────────────────────── */

function RoleCard({
  role, selected, onClick,
}: { role: RoleOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        border: `2px solid ${selected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
        borderRadius: '12px',
        padding: '14px 16px',
        background: selected ? 'hsl(var(--primary) / 0.06)' : 'hsl(var(--card))',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.18s ease',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.5)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'hsl(var(--border))';
      }}
    >
      {selected && (
        <CheckCircle2
          size={16}
          style={{
            position: 'absolute', top: 10, right: 10,
            color: 'hsl(var(--primary))',
          }}
        />
      )}
      <span style={{ fontSize: '24px', lineHeight: 1, marginTop: '2px' }}>{role.emoji}</span>
      <div>
        <p style={{
          margin: 0, fontWeight: 600, fontSize: '14px',
          color: selected ? 'hsl(var(--primary))' : 'var(--foreground)',
        }}>
          {role.label}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>
          {role.description}
        </p>
      </div>
    </button>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, role, authInitialized } = useAuth();
  const { schoolName, appSubtitle, email: schoolEmail, phone: schoolPhone, logoUrl } = useSchoolSettings();

  /* Step: 'role' | 'credentials' */
  const [step, setStep] = useState<'role' | 'credentials'>('role');
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);

  /* Form state */
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /* Password change dialog */
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  /* T&C modal */
  const [showTnC, setShowTnC] = useState(false);

  /* If already authenticated redirect immediately */
  if (authInitialized && isAuthenticated && role) {
    return <Navigate to={ROLE_HOME[role] || '/dashboard'} replace />;
  }

  /* Show loading spinner while auth initializes */
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  /* ── Handlers ─────────────────────────────────────────────── */

  const handleRoleNext = () => {
    if (!selectedRole) { toast.error('Please select your role to continue.'); return; }
    setStep('credentials');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
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

      /* Check if user needs to change password */
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

      /* Log login action for principal */
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

      /* Redirect using server-confirmed role */
      navigate(ROLE_HOME[userRole!] || '/dashboard', { replace: true });

    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordChangeSchema.safeParse({ newPassword, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { toast.error(updateError.message); return; }

      if (pendingUserId) {
        await supabase.from('profiles').update({ force_password_change: false }).eq('user_id', pendingUserId);
      }

      toast.success('Password changed successfully!');
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', pendingUserId)
        .single();

      const userRoleAfterPwChange = roleData?.role as UserRole;
      navigate(ROLE_HOME[userRoleAfterPwChange] || '/dashboard', { replace: true });

    } catch {
      toast.error('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────── */

  const brandGradient = 'linear-gradient(145deg, hsl(245, 75%, 40%) 0%, hsl(245, 75%, 55%) 50%, hsl(14, 90%, 55%) 100%)';

  return (
    <>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'hsl(var(--background))',
      }}>

        {/* ── LEFT PANEL (hidden on mobile) ───────────────────── */}
        <div style={{
          display: 'none', // overridden via media query below
          width: '45%',
          flexShrink: 0,
          background: brandGradient,
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 48px',
        }}
        className="login-left-panel"
        >
          {/* Background Decorations */}
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '320px', height: '320px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-60px', left: '-60px',
            width: '240px', height: '240px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '60%',
            width: '160px', height: '160px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />

          {/* Top — Logo + Name */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
              <SchoolAvatar logoUrl={logoUrl} schoolName={schoolName} size={56} />
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  {schoolName || <span style={{ opacity: 0.5 }}>School Name</span>}
                </h1>
                {appSubtitle && (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                    {appSubtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Tagline */}
            <h2 style={{
              margin: '0 0 16px', fontSize: '38px', fontWeight: 800,
              color: '#fff', lineHeight: 1.2, letterSpacing: '-0.5px',
            }}>
              Manage Your School<br />
              <span style={{ color: 'rgba(255,255,255,0.75)' }}>Smarter and Faster</span>
            </h2>

            <p style={{ margin: '0 0 36px', fontSize: '16px', color: 'rgba(255,255,255,0.65)', maxWidth: '380px', lineHeight: 1.6 }}>
              A complete digital platform that connects Principals, Teachers, and Parents in one unified system.
            </p>

            {/* Feature Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {['✓  Attendance', '✓  Homework', '✓  Timetable', '✓  Reports', '✓  Fee Management', '✓  Announcements'].map((f) => (
                <span key={f} style={{
                  padding: '8px 16px', borderRadius: '999px',
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '13px', fontWeight: 500,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom — School Contact */}
          {(schoolEmail || schoolPhone) && (
            <div style={{
              position: 'relative', zIndex: 1,
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: '24px',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              {schoolEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  <Mail size={14} />
                  <a href={`mailto:${schoolEmail}`} style={{ color: 'inherit', textDecoration: 'none' }}>{schoolEmail}</a>
                </div>
              )}
              {schoolPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  <Phone size={14} />
                  <span>{schoolPhone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px', overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>

            {/* Mobile-only compact header */}
            <div className="login-mobile-header" style={{
              display: 'none', alignItems: 'center', gap: '12px',
              marginBottom: '28px', justifyContent: 'center',
            }}>
              <SchoolAvatarLight logoUrl={logoUrl} schoolName={schoolName} size={44} />
              <div>
                <h1 className="font-heading" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                  {schoolName || 'School Portal'}
                </h1>
                {appSubtitle && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{appSubtitle}</p>
                )}
              </div>
            </div>

            {/* ── Heading ── */}
            <div style={{ marginBottom: '28px' }}>
              <h2 className="font-heading" style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                Welcome back
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'hsl(var(--muted-foreground))' }}>
                {step === 'role' ? 'Select your role to get started' : `Sign in as ${ROLES.find(r => r.key === selectedRole)?.label}`}
              </p>
            </div>

            {/* ── STEP 1: Role selector ── */}
            {step === 'role' && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '24px',
                }}
                className="login-role-grid"
                >
                  {ROLES.map((r) => (
                    <RoleCard
                      key={r.key}
                      role={r}
                      selected={selectedRole === r.key}
                      onClick={() => setSelectedRole(r.key)}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="gradient"
                  size="xl"
                  className="w-full"
                  onClick={handleRoleNext}
                >
                  Continue <ArrowRight size={16} />
                </Button>

                <p style={{ textAlign: 'center', fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '20px' }}>
                  By continuing, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => setShowTnC(true)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: 'hsl(var(--primary))', cursor: 'pointer',
                      textDecoration: 'underline', fontSize: '13px', fontWeight: 500,
                    }}
                  >
                    Terms of Service
                  </button>.
                </p>
              </div>
            )}

            {/* ── STEP 2: Credentials ── */}
            {step === 'credentials' && (
              <div>
                {/* Back + selected role chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setStep('role')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'hsl(var(--muted))', border: 'none', borderRadius: '8px',
                      padding: '6px 12px', cursor: 'pointer', fontSize: '13px',
                      color: 'var(--muted-foreground)', fontWeight: 500,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--border))')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'hsl(var(--muted))')}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '8px',
                    background: 'hsl(var(--primary) / 0.1)',
                    color: 'hsl(var(--primary))',
                    fontSize: '13px', fontWeight: 600,
                    border: '1px solid hsl(var(--primary) / 0.25)',
                  }}>
                    {ROLES.find(r => r.key === selectedRole)?.emoji}{' '}
                    {ROLES.find(r => r.key === selectedRole)?.label}
                  </span>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="mt-1.5"
                      autoFocus
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
                    className="w-full mt-2"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <Loader2 className="animate-spin" size={18} />
                      : <><span>Sign In</span><ArrowRight size={16} /></>
                    }
                  </Button>
                </form>

                <div style={{
                  marginTop: '20px', padding: '14px 16px',
                  background: 'hsl(var(--muted) / 0.6)', borderRadius: '10px',
                }}>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
                    <strong>Note:</strong> Teacher accounts are created by the school admin.
                    Contact your administrator if you need access.
                  </p>
                </div>

                <p style={{ textAlign: 'center', fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '16px' }}>
                  By continuing, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => setShowTnC(true)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: 'hsl(var(--primary))', cursor: 'pointer',
                      textDecoration: 'underline', fontSize: '13px', fontWeight: 500,
                    }}
                  >
                    Terms of Service
                  </button>.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Responsive CSS ─────────────────────────────────────── */}
      <style>{`
        @media (min-width: 1024px) {
          .login-left-panel {
            display: flex !important;
            width: 50% !important;
          }
          .login-mobile-header {
            display: none !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .login-left-panel {
            display: flex !important;
            width: 40% !important;
            padding: 32px !important;
          }
          .login-mobile-header {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .login-left-panel {
            display: none !important;
          }
          .login-mobile-header {
            display: flex !important;
          }
          .login-role-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── Terms & Conditions Modal ────────────────────────────── */}
      <TermsAndConditionsModal open={showTnC} onClose={() => setShowTnC(false)} />

      {/* ── Force Password Change Dialog ────────────────────────── */}
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
              {isChangingPassword
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <KeyRound className="w-4 h-4 mr-2" />
              }
              Change Password & Continue
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
