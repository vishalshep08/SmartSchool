import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  CalendarOff,
  MessageSquare,
  FolderOpen,
  LogOut,
  Menu,
  X,
  School,
  IndianRupee,
  Clock,
  LibraryBig,
  BarChart2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSchoolName } from '@/hooks/useSchoolSettings';

const parentLinks = [
  { to: '/parent/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/parent/homework', icon: BookOpen, label: 'Homework' },
  { to: '/parent/study-materials', icon: LibraryBig, label: 'Study Materials' },
  { to: '/parent/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/parent/leave', icon: CalendarOff, label: 'Leave' },
  { to: '/parent/remarks', icon: MessageSquare, label: 'Remarks' },
  { to: '/parent/fees', icon: IndianRupee, label: 'Fees' },
  { to: '/parent/timetable', icon: Clock, label: 'Timetable' },
  { to: '/parent/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/parent/documents', icon: FolderOpen, label: 'Documents' },
];

export function ParentSidebar() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = () => {
    const schoolName = useSchoolName();
    return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
          <School className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display font-bold text-sidebar-foreground text-lg">{schoolName}</h1>
          <p className="text-xs text-sidebar-foreground/60">Parent Portal</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {profile?.fullName?.split(' ').map(n => n[0]).join('') || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.fullName || 'Parent'}</p>
            <p className="text-xs text-sidebar-foreground/60">Parent</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {parentLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsMobileOpen(false)}
              className={cn('sidebar-link', isActive && 'active')}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
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
          'fixed inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
