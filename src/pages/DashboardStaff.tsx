import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDisplayName } from '@/hooks/useDisplayName';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLeaves } from '@/hooks/useLeaves';
import { supabase } from '@/integrations/supabase/client';
import { formatDateIndian } from '@/lib/dateUtils';
import {
  CalendarOff,
  User,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  AdministrationDashboard,
  FinanceDashboard,
  HRDashboard,
  LibraryDashboard,
  ITDashboard,
  SportsDashboard,
  MaintenanceDashboard,
  AcademicDashboard,
  GenericStaffDashboard
} from '@/components/staff/DepartmentDashboards';

export default function DashboardStaff() {
  const { user } = useAuth();
  const { displayName } = useDisplayName();
  const navigate = useNavigate();
  const { leaves } = useLeaves();
  
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEmployee = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await (supabase as any)
          .from('employees')
          .select('id, full_name, department, designation, employee_type, status')
          .eq('user_id', user.id)
          .single();
        
        if (cancelled) return;
        if (error) throw error;
        setEmployeeDetails(data);
      } catch (err) {
        if (!cancelled) {
          console.error('Fetch error:', err);
          setEmployeeDetails(null);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
      }
    }, 10000);

    fetchEmployee();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [user?.id]);

  const dept = employeeDetails?.department || 'General';
  const designation = employeeDetails?.designation || '';

  const myLeaves = employeeDetails ? leaves.filter(l => l.teacher_id === employeeDetails.id) : [];
  const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;
  const approvedLeaves = myLeaves.filter(l => l.status === 'approved').length;

  const todayDate = new Date();

  const greeting = () => {
    const hour = todayDate.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderDashboard = () => {
    const dpt = employeeDetails?.department?.toLowerCase() || '';

    if (dpt.includes('administration') || dpt.includes('admin'))
      return <AdministrationDashboard employee={employeeDetails} />;

    if (dpt.includes('finance'))
      return <FinanceDashboard employee={employeeDetails} />;

    if (dpt === 'hr' || dpt.includes('human resource'))
      return <HRDashboard employee={employeeDetails} />;

    if (dpt === 'it' || dpt.includes('information tech'))
      return <ITDashboard employee={employeeDetails} />;

    if (dpt.includes('sports'))
      return <SportsDashboard employee={employeeDetails} />;

    if (dpt.includes('library'))
      return <LibraryDashboard employee={employeeDetails} />;

    if (dpt.includes('maintenance'))
      return <MaintenanceDashboard employee={employeeDetails} />;

    if (dpt.includes('academic'))
      return <AcademicDashboard employee={employeeDetails} />;

    return <GenericStaffDashboard employee={employeeDetails} />;
  };

  const quickActions = [
    { label: 'Apply Leave', icon: CalendarOff, to: '/dashboard-staff/leaves', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { label: 'Raise Issue', icon: AlertCircle, to: '/dashboard-staff/issues', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { label: 'My Profile', icon: User, to: '/dashboard-staff/profile', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { label: 'Salary Slips', icon: DollarSign, to: '/dashboard-staff/salary', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {greeting()}, {displayName?.split(' ')[0] || 'Staff'} — {designation || 'Staff'}, {dept}
        </h1>
        <p className="text-muted-foreground mt-1">
          {formatDateIndian(todayDate)} • Welcome to the Staff Portal
        </p>
        
        {employeeDetails && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{employeeDetails.employee_type || 'Staff'}</Badge>
            <Badge variant="outline">{dept}</Badge>
            {designation && <Badge variant="outline">{designation}</Badge>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
           {renderDashboard()}
        </div>

        <div className="space-y-6">
          <Card className="animate-fade-up">
            <CardHeader className="pb-3">
               <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    className={`h-auto py-3 flex flex-col gap-2 ${action.color}`}
                    onClick={() => navigate(action.to)}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-up border-orange-100 bg-orange-50/30">
            <CardHeader className="pb-3">
               <CardTitle className="text-base text-orange-800 flex items-center gap-2">
                 <CalendarOff className="h-4 w-4 text-orange-600" />
                 My Leave Balance
               </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4 text-sm text-orange-800">
                <div className="flex justify-between items-center bg-white p-2 rounded border border-orange-100">
                  <span>Available:</span><span className="font-bold">12 days</span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-orange-600/70 text-xs">Pending: {pendingLeaves}</span>
                  <span className="text-orange-600/70 text-xs">Taken: {approvedLeaves}</span>
                </div>
              </div>
              <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate('/dashboard-staff/leaves')}>View Leaves</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
