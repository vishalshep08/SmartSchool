import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AllStaffList } from '@/components/staff/AllStaffList';
import { CreateEmployeeForm } from '@/components/staff/CreateEmployeeForm';
import { StaffLeaveManagement } from '@/components/staff/StaffLeaveManagement';
import { StaffIssues } from '@/components/staff/StaffIssues';
import { StaffSalary } from '@/components/staff/StaffSalary';
import { StaffDocuments } from '@/components/staff/StaffDocuments';
import { EmployeeProfile } from '@/components/staff/EmployeeProfile';

export default function StaffManagement() {
  const [activeTab, setActiveTab] = useState('all-staff');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  if (selectedEmployeeId) {
    return (
      <EmployeeProfile
        employeeId={selectedEmployeeId}
        onBack={() => setSelectedEmployeeId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-foreground">Staff & Employee Management</h1>
        <p className="text-muted-foreground mt-1">Manage all staff — teaching, non-teaching, management, and contract</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all-staff">All Staff</TabsTrigger>
          <TabsTrigger value="create">Create Employee</TabsTrigger>
          <TabsTrigger value="leaves">Leave Management</TabsTrigger>
          <TabsTrigger value="issues">Issues Raised</TabsTrigger>
          <TabsTrigger value="salary">Salary & Payroll</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="all-staff">
          <AllStaffList onViewProfile={(id) => setSelectedEmployeeId(id)} />
        </TabsContent>

        <TabsContent value="create">
          <CreateEmployeeForm onSuccess={() => setActiveTab('all-staff')} />
        </TabsContent>

        <TabsContent value="leaves">
          <StaffLeaveManagement />
        </TabsContent>

        <TabsContent value="issues">
          <StaffIssues />
        </TabsContent>

        <TabsContent value="salary">
          <StaffSalary />
        </TabsContent>

        <TabsContent value="documents">
          <StaffDocuments />
        </TabsContent>
      </Tabs>
    </div>
  );
}
