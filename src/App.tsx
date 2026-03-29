import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { ParentLayout } from "@/components/layout/ParentLayout";
import { StaffLayout } from "@/components/layout/StaffLayout";
import React from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardTeacher from "./pages/DashboardTeacher";
import Students from "./pages/Students";
import StaffManagement from "./pages/StaffManagement";
import Attendance from "./pages/Attendance";
import Homework from "./pages/Homework";
import Timetable from "./pages/Timetable";
import Salary from "./pages/Salary";
import Settings from "./pages/Settings";
import Notices from "./pages/Notices";
import Profile from "./pages/Profile";
import EmailCenter from "./pages/EmailCenter";
import EmailLogs from "./pages/EmailLogs";
import Documents from "./pages/Documents";
import Events from "./pages/Events";
import Leaves from "./pages/Leaves";
import Issues from "./pages/Issues";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminPrivileges from "./pages/SuperAdminPrivileges";
import ParentDashboard from "./pages/ParentDashboard";
import ParentAttendance from "./pages/ParentAttendance";
import ParentHomework from "./pages/ParentHomework";
import ParentLeave from "./pages/ParentLeave";
import ParentRemarks from "./pages/ParentRemarks";
import ParentDocuments from "./pages/ParentDocuments";
import DashboardStaff from "./pages/DashboardStaff";
import FeeManagement from "./pages/FeeManagement";
import Announcements from "./pages/Announcements";
import Reports from "./pages/Reports";
import ParentFees from "./pages/ParentFees";
import ParentTimetable from "./pages/ParentTimetable";
import NotFound from "./pages/NotFound";
import PrincipalStaffManagement from "./pages/PrincipalStaffManagement";
import TeacherLeaveRequests from "./pages/TeacherLeaveRequests";
import ClerkDocumentRequestsPage from "./pages/staff/ClerkDocumentRequestsPage";
import PrincipalDocumentApprovals from "./pages/principal/PrincipalDocumentApprovals";
import StudyMaterials from "./pages/StudyMaterials";
import ParentStudyMaterials from "./pages/ParentStudyMaterials";
import ParentAnalytics from "./pages/ParentAnalytics";

import { Loader2 } from "lucide-react";
import { Loader } from "@/components/ui/loader";

const handleGlobalError = (error: any) => {
  const isAuthError =
    error?.status === 401 ||
    error?.status === 403 ||
    error?.message?.toLowerCase().includes('jwt') ||
    error?.message?.toLowerCase().includes('valid token') ||
    error?.message?.toLowerCase().includes('unauthorized');

  if (isAuthError) {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleGlobalError,
  }),
  mutationCache: new MutationCache({
    onError: handleGlobalError,
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 1000 * 60 * 2,       // 2 minutes — data considered fresh
      gcTime: 1000 * 60 * 10,         // 10 minutes — keep in cache even if unused
      refetchOnWindowFocus: true,     // re-fetch when tab regains focus
      refetchOnMount: true,           // always refetch when component mounts if stale
      refetchOnReconnect: true,       // re-fetch after network reconnects
    },
    mutations: {
      retry: 0,                       // don't retry mutations automatically
    },
  },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader />
    </div>
  );
}

// Error boundary for catching render errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Something went wrong loading this section.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RoleBasedRedirect() {
  const { role, isAuthenticated, authInitialized } = useAuth();
  if (!authInitialized) return <LoadingScreen />;
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;
  if (role === "super_admin") return <Navigate to="/super-admin/dashboard" replace />;
  if (role === "parent") return <Navigate to="/parent/dashboard" replace />;
  if (role === "admin" as any || role === "principal" as any) return <Navigate to="/dashboard" replace />;
  if (role === "teacher") return <Navigate to="/dashboard-teacher" replace />;
  if (role === "staff") return <Navigate to="/dashboard-staff" replace />;
  return <Navigate to="/login" replace />;
}


function AppRoutes() {
  const { authInitialized } = useAuth();
  if (!authInitialized) return <LoadingScreen />;


  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Super Admin routes */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="privileges" element={<SuperAdminPrivileges />} />
      </Route>
      {/* Parent routes */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={["parent"]}>
            <ParentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="homework" element={<ParentHomework />} />
        <Route path="attendance" element={<ParentAttendance />} />
        <Route path="leave" element={<ParentLeave />} />
        <Route path="remarks" element={<ParentRemarks />} />
        <Route path="fees" element={<ParentFees />} />
        <Route path="timetable" element={<ParentTimetable />} />
        <Route path="documents" element={<ParentDocuments />} />
        <Route path="study-materials" element={<ParentStudyMaterials />} />
        <Route path="analytics" element={<ParentAnalytics />} />
      </Route>
      {/* Staff employee portal routes */}
      <Route
        path="/dashboard-staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardStaff />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="issues" element={<Issues />} />
        <Route path="salary" element={<Salary />} />
        <Route path="profile" element={<Profile />} />
        <Route path="document-requests" element={<ClerkDocumentRequestsPage />} />
      </Route>
      {/* Admin & Teacher routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["principal", "teacher"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleBasedRedirect />} />
        <Route path="dashboard" element={<ProtectedRoute allowedRoles={["admin", "principal"] as any}><Dashboard /></ProtectedRoute>} />

        <Route path="dashboard-teacher" element={<ProtectedRoute allowedRoles={["teacher"]}><DashboardTeacher /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute allowedRoles={["principal"]}><Students /></ProtectedRoute>} />
        <Route path="staff" element={<ProtectedRoute allowedRoles={["principal"]}><StaffManagement /></ProtectedRoute>} />
        <Route path="staff-management" element={<ProtectedRoute allowedRoles={["principal"]}><PrincipalStaffManagement /></ProtectedRoute>} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="homework" element={<ProtectedRoute allowedRoles={["teacher"]}><Homework /></ProtectedRoute>} />
        <Route path="study-materials" element={<ProtectedRoute allowedRoles={["teacher"]}><StudyMaterials /></ProtectedRoute>} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="class-leaves" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherLeaveRequests /></ProtectedRoute>} />
        <Route path="issues" element={<Issues />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="notices" element={<ProtectedRoute allowedRoles={["teacher"]}><Notices /></ProtectedRoute>} />
        <Route path="profile" element={<Profile />} />
        <Route path="email-center" element={<ProtectedRoute allowedRoles={["principal"]}><EmailCenter /></ProtectedRoute>} />
        <Route path="email-logs" element={<ProtectedRoute allowedRoles={["principal"]}><EmailLogs /></ProtectedRoute>} />
        <Route path="documents" element={<ProtectedRoute allowedRoles={["principal"]}><Documents /></ProtectedRoute>} />
        <Route path="document-approvals" element={<ProtectedRoute allowedRoles={["principal"]}><PrincipalDocumentApprovals /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute allowedRoles={["principal"]}><Events /></ProtectedRoute>} />
        <Route path="announcements" element={<ProtectedRoute allowedRoles={["principal"]}><Announcements /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={["principal"]}><Reports /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute allowedRoles={["principal"]}><Settings /></ProtectedRoute>} />
      </Route>
      {/* Legacy redirects */}
      <Route path="/teachers" element={<Navigate to="/staff" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
