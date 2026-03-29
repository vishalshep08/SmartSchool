import { Outlet } from 'react-router-dom';
import { ParentSidebar } from './ParentSidebar';
import ChatbotWidget from '@/components/parent/ChatbotWidget';

export function ParentLayout() {
  return (
    <div className="min-h-screen bg-background">
      <ParentSidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 p-4 lg:p-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
      {/* AI Chatbot — always visible on all parent pages */}
      <ChatbotWidget />
    </div>
  );
}
