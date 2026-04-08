import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  MessageSquareWarning,
  DollarSign,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  School,
  CalendarOff,
  Bell,
  Mail,
  MailOpen,
  User,
  FolderOpen,
  CalendarDays,
  IndianRupee,
  FileBarChart,
  Megaphone,
  Briefcase,
  ClipboardList,
  LibraryBig,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTeachers } from '@/hooks/useTeachers';
import { useTeacherClassAssignments } from '@/hooks/useTeacherPermissions';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';
import { useDisplayName } from '@/hooks/useDisplayName';

const principalLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: GraduationCap, label: 'Students' },
  { to: '/staff', icon: Users, label: 'Staff & Employees' },
  { to: '/staff-management', icon: Briefcase, label: 'Staff Management' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/email-center', icon: Mail, label: 'Email Center' },
  { to: '/email-logs', icon: MailOpen, label: 'Email Logs' },
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/document-approvals', icon: FileText, label: 'Document Approvals' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/timetable', icon: Clock, label: 'Timetable' },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/school-settings', icon: Building2, label: 'School Settings' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const teacherLinks = [
  { to: '/dashboard-teacher', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/homework', icon: BookOpen, label: 'Homework' },
  { to: '/study-materials', icon: LibraryBig, label: 'Study Materials' },
  { to: '/remarks', icon: MessageSquare, label: 'Remarks' },
  { to: '/leaves', icon: CalendarOff, label: 'My Leaves' },
  { to: '/issues', icon: MessageSquareWarning, label: 'My Issues' },
  { to: '/notices', icon: Bell, label: 'Notices' },
  { to: '/timetable', icon: Clock, label: 'Timetable' },
  { to: '/profile', icon: User, label: 'My Profile' },
];

export function Sidebar() {
  const { role, logout, user } = useAuth();
  const { displayName } = useDisplayName();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Class teacher logic for Leave Requests
  const { teachers } = useTeachers();
  const currentTeacher = teachers.find(t => t.user_id === user?.id);
  const { assignments } = useTeacherClassAssignments(currentTeacher?.id);
  const classTeacherAssignment = assignments.find(a => a.is_class_teacher === true);
  
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingDocCount, setPendingDocCount] = useState(0);

  useEffect(() => {
    if (role === 'principal') {
      const fetchDocs = async () => {
        const { count } = await (supabase as any)
          .from('document_requests')
          .select('*', { count: 'exact', head: true })
          .eq('current_stage', 'principal_review');
        if (count !== null) setPendingDocCount(count);
      };
      fetchDocs();
      
      const channel = supabase.channel('public:document_requests_principal')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, fetchDocs)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [role]);

  useEffect(() => {
    if (role === 'teacher' && classTeacherAssignment) {
      const fetchLeaves = async () => {
        const { count } = await supabase
          .from('student_leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classTeacherAssignment.class_id)
          .eq('status', 'pending');
        if (count !== null) setPendingLeaveCount(count);
      };
      fetchLeaves();
      
      const channel = supabase.channel('public:student_leave_requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_leave_requests' }, fetchLeaves)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [role, classTeacherAssignment]);

  let links = role === 'principal' ? principalLinks : teacherLinks;
  
  if (role === 'teacher' && classTeacherAssignment) {
    const classLeavesLink = { to: '/class-leaves', icon: ClipboardList, label: 'Leave Requests' };
    const leavesIndex = links.findIndex(l => l.to === '/leaves');
    links = [
      ...links.slice(0, leavesIndex + 1),
      classLeavesLink,
      ...links.slice(leavesIndex + 1)
    ];
  }

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = () => {
    const { schoolName, appSubtitle } = useSchoolSettings();
    return (
      <div className="flex flex-col h-full">
        {/* Header/Close */}
        <div className="md:hidden flex justify-end p-2 border-b border-[#2e2e48]">
           <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="text-white hover:bg-[rgba(255,255,255,0.1)] w-11 h-11">
             <X className="w-6 h-6" />
           </Button>
        </div>

      {/* Logo */}
      <div className="flex items-center justify-center lg:justify-start gap-3 px-4 py-6 border-b border-[#2e2e48]">
        <div className="w-10 h-10 min-w-[40px] rounded-[14px] bg-[#2563eb] flex items-center justify-center shadow-lg">
          <School className="w-5 h-5 text-white" />
        </div>
        <div className="md:hidden lg:block overflow-hidden">
          <h1 className="font-heading font-semibold text-[12px] text-white truncate">{schoolName}</h1>
          <p className="text-[10px] text-[#94a3b8] truncate">{appSubtitle}</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-[#2e2e48]">
        <div className="flex items-center justify-center lg:justify-start gap-3">
          <div className="w-10 h-10 min-w-[40px] rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center">
            <span className="text-[13px] font-medium text-white">
              {displayName?.split(' ').map(n => n[0]).join('') || '?'}
            </span>
          </div>
          <div className="md:hidden lg:block flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white truncate">{displayName || 'User'}</p>
            <p className="text-[10px] text-[#94a3b8] capitalize">{role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
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
              {link.to === '/class-leaves' && pendingLeaveCount > 0 && (
                <Badge variant="destructive" className="ml-auto md:hidden lg:flex w-5 h-5 items-center justify-center p-0 rounded-full text-[10px]">
                  {pendingLeaveCount}
                </Badge>
              )}
              {link.to === '/document-approvals' && pendingDocCount > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 ml-auto md:hidden lg:flex w-5 h-5 items-center justify-center p-0 rounded-full text-[10px]">
                  {pendingDocCount}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
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
