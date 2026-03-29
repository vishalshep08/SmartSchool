import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ClerkDocumentRequests } from '@/components/staff/ClerkDocumentRequests';
import { 
  FileText, Users, Megaphone, CalendarOff, DollarSign, 
  Briefcase, AlertCircle, TrendingUp, BookOpen, Clock,
  FileBarChart, CheckCircle2, User, HelpCircle, School, ShieldAlert,
  FileSignature, CheckCircle, FileCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function AdministrationDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ newReqs: 0, readyToIssue: 0, issuedThisMonth: 0 });

  useEffect(() => {
    if (!employee?.id) return;
    
    const fetchCounts = async () => {
      try {
        const { data } = await (supabase as any)
          .from('document_requests')
          .select('current_stage, issued_at')
          .eq('assigned_clerk_id', employee.id);
        
        if (data) {
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          
          let newReqs = 0, readyToIssue = 0, issuedThisMonth = 0;
          
          data.forEach((req: any) => {
            if (req.current_stage === 'clerk_review') newReqs++;
            if (req.current_stage === 'clerk_issuing') readyToIssue++;
            if (['ready', 'downloaded'].includes(req.current_stage) && req.issued_at >= firstDayOfMonth) {
              issuedThisMonth++;
            }
          });
          
          setCounts({ newReqs, readyToIssue, issuedThisMonth });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCounts();
  }, [employee?.id]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-orange-50/50 border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => navigate('/dashboard-staff/document-requests?tab=pending')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-orange-800">
              New Requests <FileText className="h-4 w-4 text-orange-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{counts.newReqs}</div>
            <p className="text-xs text-orange-700/80 mt-1">Pending review</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => navigate('/dashboard-staff/document-requests?tab=ready')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-blue-800">
              Ready to Issue <FileSignature className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{counts.readyToIssue}</div>
            <p className="text-xs text-blue-700/80 mt-1">Signed by Principal</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-green-800">
              Issued This Month <FileCheck className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{counts.issuedThisMonth}</div>
            <p className="text-xs text-green-700/80 mt-1">Completed requests</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => navigate('/dashboard-staff/leaves')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-purple-800">
              Leave Balance <CalendarOff className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">12</div>
            <p className="text-xs text-purple-700/80 mt-1">Remaining days</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Administration Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                <FileText className="h-5 w-5 text-slate-600" /> Document Request Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-slate-600 mb-4">Process student document requests, forward to principal, and issue completed certificates.</p>
               <Button variant="default" className="w-full bg-slate-800 hover:bg-slate-900 text-white" onClick={() => navigate('/dashboard-staff/document-requests')}>
                 Go to Document Requests
               </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-indigo-50/50 border-indigo-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-indigo-800">
                <Users className="h-5 w-5 text-indigo-600" /> Student Records
              </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-indigo-700/80 mb-4">View and search through school student records (Read-Only).</p>
               <Button variant="default" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate('/dashboard-staff/student-records')}>
                 View Records
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function FinanceDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-green-50/50 border-green-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
              <FileBarChart className="h-5 w-5 text-green-600" /> Fee Records (Read-Only)
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-green-700/80 mb-4">Access detailed fee collection logs and outstanding balances.</p>
             <Button variant="default" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate('/dashboard-staff/fee-records')}>
               View Fee Records
             </Button>
          </CardContent>
        </Card>
        
        <Card className="bg-teal-50/50 border-teal-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-teal-800">
              <TrendingUp className="h-5 w-5 text-teal-600" /> Fee Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-teal-700/80 mb-4">Analyze daily collections and outstanding class reports.</p>
             <Button variant="default" className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => navigate('/dashboard-staff/fee-reports')}>
               Generate Reports
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function HRDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-purple-50/50 border-purple-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
              <Users className="h-5 w-5 text-purple-600" /> Staff Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-purple-700/80 mb-4">View contact and designation details for all active staff (Read-only).</p>
             <Button variant="default" className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate('/dashboard-staff/staff-directory')}>
               View Directory
             </Button>
          </CardContent>
        </Card>

        <Card className="bg-pink-50/50 border-pink-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-pink-800">
              <Briefcase className="h-5 w-5 text-pink-600" /> Leave Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-pink-700/80 mb-4">Overview of all staff leave requests, current absences, and statuses.</p>
             <Button variant="default" className="w-full bg-pink-600 hover:bg-pink-700 text-white" onClick={() => navigate('/dashboard-staff/leave-overview')}>
               View Staff Leaves
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function LibraryDashboard({ employee }: { employee: any }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-amber-50/50 border-amber-100 flex items-center justify-center p-12 text-center">
          <div>
            <BookOpen className="h-16 w-16 text-amber-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-amber-800 mb-2">Library Module</h3>
            <p className="text-sm text-amber-700/80">Book management and checkout system coming soon.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ITDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <AlertCircle className="h-5 w-5 text-slate-600" /> IT Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-slate-600 mb-4">View and respond to IT issues raised by staff members. Update progress and mark as resolved.</p>
             <Button variant="default" className="w-auto bg-slate-800 hover:bg-slate-900 text-white" onClick={() => navigate('/dashboard-staff/issues-raised')}>
               View Helpdesk Open Tickets
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SportsDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 gap-6">
       <Card className="bg-orange-50/50 border-orange-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
              <CheckCircle2 className="h-5 w-5 text-orange-600" /> Sports Students
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-orange-700/80 mb-4">View and manage records of students enrolled in specific sports.</p>
             <Button variant="default" className="w-auto bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate('/dashboard-staff/sports-records')}>
               View Sports Records
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function MaintenanceDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-stone-50 border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-stone-800">
              <ShieldAlert className="h-5 w-5 text-stone-600" /> Infrastructure & Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-stone-600 mb-4">Review and resolve open infrastructure breakdown limits or repairs requested by staff.</p>
             <Button variant="default" className="w-auto bg-stone-800 hover:bg-stone-900 text-white" onClick={() => navigate('/dashboard-staff/issues-raised')}>
               View Work Orders
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function GenericStaffDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-up">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <Card className="bg-primary/5 border-primary/20">
             <CardHeader className="pb-2">
               <CardTitle className="text-base flex items-center gap-2 text-primary">
                 <HelpCircle className="h-4 w-4" /> Help & Support
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground mb-3">Facing an issue? Raise a ticket seamlessly.</p>
               <Button variant="default" size="sm" onClick={() => navigate('/dashboard-staff/issues')} className="w-full">
                 Raise Issue
               </Button>
             </CardContent>
           </Card>

           <Card className="bg-background border-border">
             <CardHeader className="pb-2">
               <CardTitle className="text-base flex items-center gap-2">
                 <School className="h-4 w-4" /> Announcements
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground mb-3">Stay updated with latest school news.</p>
               <Button variant="outline" size="sm" onClick={() => navigate('/dashboard-staff/announcements')} className="w-full">
                 View Board
               </Button>
             </CardContent>
           </Card>
       </div>
    </div>
  );
}

export function AcademicDashboard({ employee }: { employee: any }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-up">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="bg-blue-50/50 border-blue-100">
             <CardHeader className="pb-2">
               <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                 <School className="h-4 w-4" /> Academic Resources
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-blue-700/80 mb-3">Manage laboratory schedules, academic coordination, and academic resources.</p>
               <Button variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/dashboard-staff/announcements')}>
                 View Announcements
               </Button>
             </CardContent>
           </Card>
       </div>
    </div>
  );
}
