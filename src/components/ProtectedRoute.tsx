// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from '@/components/ui/loader';

const DASHBOARDS: Record<string, string> = {
  admin: '/dashboard',
  super_admin: '/super-admin/dashboard',
  teacher: '/dashboard-teacher',
  parent: '/parent/dashboard',
  staff: '/dashboard-staff',
  principal: '/dashboard',
};

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, role, authInitialized } = useAuth();

  // Show loading spinner — but never more than 5 seconds (safety timer handles it)
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  // Auth initialized — now check authentication
  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  // Check role permission
  if (allowedRoles && !allowedRoles.includes(role)) {
    const destination = DASHBOARDS[role] || '/login';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}
