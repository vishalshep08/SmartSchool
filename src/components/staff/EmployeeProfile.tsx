import { useState } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Loader2, Mail, Phone, Calendar, MapPin, Building, Briefcase,
} from 'lucide-react';
import { formatDateIndian, formatCurrencyINR } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface EmployeeProfileProps {
  employeeId: string;
  onBack: () => void;
}

export function EmployeeProfile({ employeeId, onBack }: EmployeeProfileProps) {
  const { staff, isLoading, toggleActive } = useStaff();
  const [tab, setTab] = useState('overview');

  const employee = staff.find(s => s.id === employeeId);

  const { data: documents } = useQuery({
    queryKey: ['teacher-docs', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('teacher_documents')
        .select('*')
        .eq('teacher_id', employeeId)
        .order('uploaded_at', { ascending: false });
      return data || [];
    },
    enabled: !!employeeId,
  });

  const { data: leaveRecords } = useQuery({
    queryKey: ['teacher-leaves', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('teacher_leaves')
        .select('*')
        .eq('teacher_id', employeeId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!employeeId,
  });

  const { data: salaryRecords } = useQuery({
    queryKey: ['teacher-salary', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('salary_records')
        .select('*')
        .eq('teacher_id', employeeId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      return data || [];
    },
    enabled: !!employeeId,
  });

  if (isLoading || !employee) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const emp = employee as any;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Staff List
      </Button>

      {/* Profile Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-3xl font-heading font-bold text-primary">
              {employee.profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl font-bold">{employee.profile?.full_name || emp.full_name || 'Unknown'}</h1>
              <Badge className={cn(
                employee.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {employee.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">{emp.designation || employee.subject} • {emp.department || 'Academic'}</p>
            <div className="flex items-center gap-2 mt-1">
              {(employee.employee_id || emp.employee_id) && (
                <Badge variant="outline" className="text-xs font-mono">
                  ID: {employee.employee_id || emp.employee_id}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {(employee.profile?.email || emp.official_email || emp.personal_email) && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {employee.profile?.email || emp.official_email || emp.personal_email}
                </span>
              )}
              {(employee.profile?.phone || emp.contact_number) && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {employee.profile?.phone || emp.contact_number}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={employee.is_active ? "destructive" : "default"}
              size="sm"
              onClick={() => toggleActive.mutateAsync({ id: employee.id, is_active: !employee.is_active })}
            >
              {employee.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {emp.employee_type === 'Teaching' && <TabsTrigger value="teaching">Teaching</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leave">Leave Record</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span><span>{emp.date_of_birth ? formatDateIndian(emp.date_of_birth) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span>{emp.gender || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{emp.contact_number || employee.profile?.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{emp.personal_email || employee.profile?.email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right max-w-[200px]">{emp.address || '—'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{emp.employee_type || 'Teaching'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{emp.department || 'Academic'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Designation</span><span>{emp.designation || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span>{emp.employment_mode || 'Full-time'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Salary Grade</span><span>{emp.salary_grade || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Joining Date</span><span>{employee.joining_date ? formatDateIndian(employee.joining_date) : '—'}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teaching">
          <Card>
            <CardHeader><CardTitle className="text-base">Teaching Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subject</span><span>{employee.subject}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Qualification</span><span>{employee.qualification || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span>{employee.experience_years || 0} years</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Experience Type</span><span>{emp.experience_type || '—'}</span></div>

              {/* Class Teacher Status */}
              <div className="border-t pt-3 mt-1">
                <p className="text-muted-foreground font-medium mb-2">Class Teacher Assignment</p>
                {emp.is_class_teacher ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 border border-green-200">
                        ✓ Class Teacher
                      </Badge>
                      {employee.assignedClass && (
                        <span className="font-medium">
                          {employee.assignedClass.name}
                          {(employee.assignedClass as any).section ? ` (${(employee.assignedClass as any).section})` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This teacher manages attendance, leave approvals, and remarks for their assigned class.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Badge variant="secondary">Subject Teacher</Badge>
                    <p className="text-xs text-muted-foreground block">
                      Not assigned as a Class Teacher. Use Staff Management to assign a class.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle className="text-base">Uploaded Documents</CardTitle></CardHeader>
            <CardContent>
              {!documents || documents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No documents uploaded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="capitalize">{doc.document_type.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{doc.file_name}</TableCell>
                        <TableCell>{doc.uploaded_at ? formatDateIndian(doc.uploaded_at) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader><CardTitle className="text-base">Leave History</CardTitle></CardHeader>
            <CardContent>
              {!leaveRecords || leaveRecords.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No leave records</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRecords.map(lr => (
                      <TableRow key={lr.id}>
                        <TableCell className="capitalize">{lr.leave_type}</TableCell>
                        <TableCell>{lr.start_date ? formatDateIndian(lr.start_date) : '—'}</TableCell>
                        <TableCell>{lr.end_date ? formatDateIndian(lr.end_date) : '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{lr.reason}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{lr.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <Card>
            <CardHeader><CardTitle className="text-base">Salary Records</CardTitle></CardHeader>
            <CardContent>
              {!salaryRecords || salaryRecords.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No salary records</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month/Year</TableHead>
                      <TableHead>Basic</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryRecords.map(sr => (
                      <TableRow key={sr.id}>
                        <TableCell>{sr.month}/{sr.year}</TableCell>
                        <TableCell>{formatCurrencyINR(sr.basic_salary)}</TableCell>
                        <TableCell>{formatCurrencyINR(sr.allowances || 0)}</TableCell>
                        <TableCell>{formatCurrencyINR(sr.deductions || 0)}</TableCell>
                        <TableCell className="font-medium">{formatCurrencyINR(sr.net_salary)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{sr.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
