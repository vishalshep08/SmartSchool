import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  CalendarOff,
  MessageSquareWarning,
  DollarSign,
  LogOut,
  Menu,
  X,
  School,
  User,
  Megaphone,
  FileText,
  Users,
  Briefcase,
  AlertCircle,
  FileBarChart,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolName } from '@/hooks/useSchoolSettings';
import { useDisplayName } from '@/hooks/useDisplayName';

export function StaffSidebar() {
  const { logout, user } = useAuth();
  const { displayName } = useDisplayName();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchEmployee = async () => {
      if (!user?.id) return;
      try {
        const { data } = await (supabase as any)
          .from('employees')
          .select('id, department, designation, employee_type')
          .eq('user_id', user.id)
          .single();
        if (!cancelled) setEmployeeDetails(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEmployee();
    return () => { cancelled = true; };
  }, [user?.id]);

  const [pendingDocCount, setPendingDocCount] = useState(0);

  useEffect(() => {
    const isAdminClerk = employeeDetails?.department === 'Administration' && employeeDetails?.designation === 'Clerk';
    if (isAdminClerk && employeeDetails?.id) {
      const fetchDocs = async () => {
        const { count } = await (supabase as any)
          .from('document_requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_clerk_id', employeeDetails.id)
          .eq('current_stage', 'clerk_review');
        if (count !== null) setPendingDocCount(count);
      };
      fetchDocs();
      
      const channel = supabase.channel('public:document_requests_clerk')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, fetchDocs)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [employeeDetails?.id, employeeDetails?.department, employeeDetails?.designation]);

  const handleLogout = async () => {
    await logout();
  };

  const getLinks = (): any[] => {
    const defaultLinks = [
      { to: '/dashboard-staff', icon: LayoutDashboard, label: 'Dashboard' }
    ];
    
    const commonTail = [
      { to: '/dashboard-staff/leaves', icon: CalendarOff, label: 'My Leaves' },
      { to: '/dashboard-staff/issues', icon: MessageSquareWarning, label: 'My Issues' },
      { to: '/dashboard-staff/profile', icon: User, label: 'My Profile' },
      { to: '/dashboard-staff/salary', icon: DollarSign, label: 'Salary Slips' },
    ];

    const altCommonTail = [
      { to: '/dashboard-staff/leaves', icon: CalendarOff, label: 'My Leaves' },
      { to: '/dashboard-staff/profile', icon: User, label: 'My Profile' },
      { to: '/dashboard-staff/salary', icon: DollarSign, label: 'Salary Slips' },
    ];

    const dpt = employeeDetails?.department?.toLowerCase() || '';

    if (dpt.includes('administration') || dpt.includes('admin')) {
      return [
        ...defaultLinks,
        { to: '/dashboard-staff/document-requests', icon: FileText, label: 'Document Requests', badge: pendingDocCount > 0 ? pendingDocCount : undefined },
        { to: '/dashboard-staff/student-records', icon: Users, label: 'Student Records' },
        ...commonTail
      ];
    }
    if (dpt.includes('finance')) {
      return [
        ...defaultLinks,
        { to: '/dashboard-staff/fee-records', icon: FileText, label: 'Fee Records' },
        { to: '/dashboard-staff/fee-reports', icon: FileBarChart, label: 'Fee Reports' },
        ...commonTail
      ];
    }
    if (dpt === 'hr' || dpt.includes('human resource')) {
      return [
        ...defaultLinks,
        { to: '/dashboard-staff/staff-directory', icon: Users, label: 'Staff Directory' },
        { to: '/dashboard-staff/leave-overview', icon: Briefcase, label: 'Leave Overview' },
        ...commonTail
      ];
    }
    if (dpt === 'it' || dpt.includes('information tech') || dpt.includes('maintenance')) {
      return [
        ...defaultLinks,
        { to: '/dashboard-staff/issues-raised', icon: AlertCircle, label: dpt.includes('it') ? 'IT Issues' : 'Maintenance Issues' },
        { to: '/dashboard-staff/announcements', icon: Megaphone, label: 'Announcements' },
        ...altCommonTail
      ];
    }
    if (dpt.includes('sports') || dpt.includes('library') || dpt.includes('academic')) {
      return [
        ...defaultLinks,
        { to: '/dashboard-staff/announcements', icon: Megaphone, label: 'Announcements' },
        ...altCommonTail
      ];
    }

    // Generic fallback
    return [
      ...defaultLinks,
      ...commonTail
    ];
  };

  const staffLinks = getLinks();

  const SidebarContent = () => {
    const schoolName = useSchoolName();
    return (
      <div className="flex flex-col h-full">
        {/* Header/Close */}
        <div className="md:hidden flex justify-end p-2 border-b border-[#2e2e48]">
           <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="text-white hover:bg-[rgba(255,255,255,0.1)] w-11 h-11">
             <X className="w-6 h-6" />
           </Button>
        </div>

      <div className="flex items-center justify-center lg:justify-start gap-3 px-4 py-6 border-b border-[#2e2e48]">
        <div className="w-10 h-10 min-w-[40px] rounded-[14px] bg-[#2563eb] flex items-center justify-center shadow-lg">
          <School className="w-5 h-5 text-white" />
        </div>
        <div className="md:hidden lg:block overflow-hidden">
          <h1 className="font-heading font-semibold text-[12px] text-white truncate">{schoolName}</h1>
          <p className="text-[10px] text-[#94a3b8] truncate">Staff Portal</p>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-[#2e2e48]">
        <div className="flex items-center justify-center lg:justify-start gap-3">
          <div className="w-10 h-10 min-w-[40px] rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center">
            <span className="text-[13px] font-medium text-white">
              {displayName?.split(' ').map(n => n[0]).join('') || '?'}
            </span>
          </div>
          <div className="md:hidden lg:block flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white truncate">{displayName || 'Staff'}</p>
            <p className="text-[10px] text-[#94a3b8] truncate">{employeeDetails?.department || 'Staff'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {staffLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.label}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[9px] transition-all duration-200 min-h-[44px]',
                'md:justify-center lg:justify-start',
                isActive 
                  ? 'bg-[#eff6ff] text-[#2563eb] font-medium'
                  : 'text-[#94a3b8] hover:bg-[rgba(255,255,255,0.06)] font-body'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 font-body text-[13px] md:hidden lg:inline-block" style={{ fontWeight: isActive ? 500 : 400 }}>{link.label}</span>
              {link.badge && link.badge > 0 && (
                <Badge variant="destructive" className="ml-auto md:hidden lg:flex w-5 h-5 items-center justify-center p-0 rounded-full text-[10px]">
                  {link.badge}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#2e2e48]">
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] w-full text-red-400 hover:bg-[rgba(255,255,255,0.06)] font-body text-[13px] min-h-[44px] md:justify-center lg:justify-start"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="md:hidden lg:inline-block">Logout</span>
        </button>
      </div>
    </div>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out',
          'w-[280px] md:w-[64px] lg:w-[240px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ backgroundColor: '#1a1a2e' }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
