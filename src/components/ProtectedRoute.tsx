import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Loader } from '@/components/ui/loader';

const ROLE_HOME: Record<string, string> = {
  admin: '/dashboard',
  super_admin: '/super-admin/dashboard',
  teacher: '/dashboard-teacher',
  parent: '/parent/dashboard',
  staff: '/dashboard-staff',
  principal: '/dashboard',
};

interface Props {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { isAuthenticated, role, authInitialized } = useAuth();

  // Show spinner only while auth is initializing
  // authInitialized becomes true within 1-2 seconds maximum
  // because sessionStorage read is synchronous — very fast
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  // Not authenticated — go to login
  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role for this route — go to their dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />;
  }

  return <>{children}</>;
}
