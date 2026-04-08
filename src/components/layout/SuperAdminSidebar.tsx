import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  ScrollText,
  Lock,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSchoolName } from '@/hooks/useSchoolSettings';
import { useDisplayName } from '@/hooks/useDisplayName';

const links = [
  { to: '/super-admin/dashboard', icon: ScrollText, label: 'Activity Log' },
  { to: '/super-admin/privileges', icon: Lock, label: 'Privilege Management' },
];

export function SuperAdminSidebar() {
  const { logout } = useAuth();
  const { displayName } = useDisplayName();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

      {/* Logo */}
      <div className="flex items-center justify-center lg:justify-start gap-3 px-4 py-6 border-b border-[#2e2e48]">
        <div className="w-10 h-10 min-w-[40px] rounded-[14px] bg-[#2563eb] flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="md:hidden lg:block overflow-hidden">
          <h1 className="font-heading font-semibold text-[12px] text-white truncate">{schoolName}</h1>
          <p className="text-[10px] text-[#94a3b8] truncate">Super Admin</p>
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
            <p className="text-[13px] font-medium text-white truncate">{displayName || 'Super Admin'}</p>
            <p className="text-[10px] text-[#94a3b8]">Super Admin</p>
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
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[#2e2e48]">
        <button
          onClick={logout}
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
