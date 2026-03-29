import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import SarthiChatbot from '@/components/chatbot/SarthiChatbot';

export function DashboardLayout() {
  const { role } = useAuth();

  // Determine chatbot variant based on role
  const chatbotVariant = role === 'teacher' ? 'teacher' : 'principal';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 p-4 lg:p-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
      {/* AI Chatbot — visible on all teacher/principal pages */}
      <SarthiChatbot variant={chatbotVariant} />
    </div>
  );
}
