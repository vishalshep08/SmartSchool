import { Outlet } from 'react-router-dom';
import { ParentSidebar } from './ParentSidebar';
import ChatbotWidget from '@/components/parent/ChatbotWidget';
import { BottomNav } from './BottomNav';

export function ParentLayout() {
  return (
    <div className="min-h-screen bg-background relative pb-[72px] md:pb-0">
      <ParentSidebar />
      <main className="transition-all duration-300 md:pl-[64px] lg:pl-[240px]">
        <div className="min-h-screen pt-16 p-4 md:p-5 md:pt-5 lg:p-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      {/* AI Chatbot — always visible on all parent pages */}
      <ChatbotWidget />
    </div>
  );
}
