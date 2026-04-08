import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import SarthiChatbot from '@/components/chatbot/SarthiChatbot';
import { BottomNav } from './BottomNav';

export function DashboardLayout() {
  const { role } = useAuth();

  // Determine chatbot variant based on role
  const chatbotVariant = role === 'teacher' ? 'teacher' : 'principal';

  return (
    <div className="min-h-screen bg-background relative pb-[72px] md:pb-0">
      <Sidebar />
      <main className="transition-all duration-300 md:pl-[64px] lg:pl-[240px]">
        <div className="min-h-screen pt-16 p-4 md:p-5 md:pt-5 lg:p-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      {/* AI Chatbot — visible on all teacher/principal pages */}
      <SarthiChatbot variant={chatbotVariant} />
    </div>
  );
}
