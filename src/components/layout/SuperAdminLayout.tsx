import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from './SuperAdminSidebar';

export function SuperAdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <SuperAdminSidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 p-4 lg:p-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
