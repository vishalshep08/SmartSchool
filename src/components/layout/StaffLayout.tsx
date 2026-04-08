import { Outlet } from 'react-router-dom';
import { StaffSidebar } from './StaffSidebar';
import { BottomNav } from './BottomNav';

export function StaffLayout() {
  return (
    <div className="min-h-screen bg-background relative pb-[72px] md:pb-0">
      <StaffSidebar />
      <main className="transition-all duration-300 md:pl-[64px] lg:pl-[240px]">
        <div className="min-h-screen pt-16 p-4 md:p-5 md:pt-5 lg:p-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
