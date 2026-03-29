import { Outlet } from 'react-router-dom';
import { StaffSidebar } from './StaffSidebar';

export function StaffLayout() {
  return (
    <div className="min-h-screen bg-background">
      <StaffSidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 p-4 lg:p-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
