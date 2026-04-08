import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  Home, Users, ClipboardCheck, Wallet, Settings, 
  FileText, MoreHorizontal, BookOpen 
} from 'lucide-react';

export function BottomNav() {
  const { role } = useAuth();
  const location = useLocation();

  if (!role || role === 'super_admin') return null;

  let links: { to: string; icon: any; label: string }[] = [];

  switch (role) {
    case 'principal':
      links = [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/students', icon: Users, label: 'Students' },
        { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
        { to: '/fee-management', icon: Wallet, label: 'Fees' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ];
      break;
    case 'teacher':
      links = [
        { to: '/dashboard-teacher', icon: Home, label: 'Dashboard' },
        { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
        { to: '/homework', icon: BookOpen, label: 'Homework' },
        { to: '/class-leaves', icon: FileText, label: 'Leaves' },
        { to: '/timetable', icon: MoreHorizontal, label: 'More' },
      ];
      break;
    case 'staff':
      links = [
        { to: '/dashboard-staff', icon: Home, label: 'Dashboard' },
        { to: '/dashboard-staff/student-records', icon: Users, label: 'Students' },
        { to: '/dashboard-staff/document-requests', icon: FileText, label: 'Documents' },
        { to: '/dashboard-staff/salary', icon: Wallet, label: 'Salary' },
        { to: '/dashboard-staff/leaves', icon: MoreHorizontal, label: 'More' },
      ];
      break;
    case 'parent':
      links = [
        { to: '/parent/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/parent/attendance', icon: ClipboardCheck, label: 'Attendance' },
        { to: '/parent/fees', icon: Wallet, label: 'Fees' },
        { to: '/parent/homework', icon: BookOpen, label: 'Homework' },
        { to: '/parent/timetable', icon: MoreHorizontal, label: 'More' },
      ];
      break;
    default:
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-slate-200 flex flex-row justify-around items-center z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location.pathname.startsWith(link.to) && (link.to !== '/' || location.pathname === '/');
        // Handle exact match for dashboards to avoid highlighting multiple
        const isExact = (link.to.includes('dashboard') || link.to === '/') ? location.pathname === link.to : isActive;
        
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={cn(
              "flex flex-col items-center justify-center gap-[3px] min-w-[44px] min-h-[44px] px-1 touch-manipulation",
              isExact ? "text-[#2563eb]" : "text-[#94a3b8] hover:text-[#64748b]"
            )}
          >
            <Icon className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-body font-medium">{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
