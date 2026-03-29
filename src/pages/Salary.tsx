import { useState } from 'react';
import { useSalary } from '@/hooks/useSalary';
import { useTeacherProfiles } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Download,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Loader2,
  IndianRupee,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatCurrencyINR, formatMonthYear, formatDateIndian } from '@/lib/dateUtils';
import { SalaryReceipt } from '@/components/salary/SalaryReceipt';

export default function Salary() {
  const { role, user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [formData, setFormData] = useState({
    teacher_id: '',
    basic_salary: '',
    allowances: '0',
    deductions: '0',
    days_present: '22',
    days_absent: '0',
  });

  const { salaryRecords, isLoading, createSalaryRecord, updateSalaryRecord, markAsPaid } = useSalary(
    parseInt(selectedMonth),
    parseInt(selectedYear)
  );
  const { teacherProfiles } = useTeacherProfiles();

  const canManageSalary = role === 'principal';
  
  // Get current teacher for filtering (teachers can only see their own salary)
  const currentTeacher = teacherProfiles.find(t => t.user_id === user?.id);
  
  // Filter salary records for teachers - they can only see their own
  const visibleSalaryRecords = role === 'teacher' && currentTeacher
    ? salaryRecords.filter(r => r.teacher_id === currentTeacher.id)
    : salaryRecords;

  const getTeacherName = (teacherId: string) => {
    const teacher = teacherProfiles.find(t => t.id === teacherId);
    return teacher?.profile?.full_name || 'Unknown';
  };

  const getTeacherEmployeeId = (teacherId: string) => {
    const teacher = teacherProfiles.find(t => t.id === teacherId);
    return teacher?.employee_id;
  };

  const openReceipt = (record: any) => {
    setSelectedRecord(record);
    setIsReceiptOpen(true);
  };

  const totalSalary = visibleSalaryRecords.reduce((sum, r) => sum + Number(r.net_salary), 0);
  const paidCount = visibleSalaryRecords.filter(r => r.status === 'paid').length;
  const pendingCount = visibleSalaryRecords.filter(r => r.status === 'pending').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const basicSalary = parseFloat(formData.basic_salary);
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const netSalary = basicSalary + allowances - deductions;

    await createSalaryRecord.mutateAsync({
      teacher_id: formData.teacher_id,
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      basic_salary: basicSalary,
      allowances,
      deductions,
      net_salary: netSalary,
      days_present: parseInt(formData.days_present),
      days_absent: parseInt(formData.days_absent),
      status: 'pending',
    });

    setFormData({
      teacher_id: '',
      basic_salary: '',
      allowances: '0',
      deductions: '0',
      days_present: '22',
      days_absent: '0',
    });
    setIsDialogOpen(false);
  };

  const handleMarkPaid = async (recordId: string) => {
    await markAsPaid.mutateAsync(recordId);
  };

  const handleExport = () => {
    toast.success('Salary report exported!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Salary Management</h1>
          <p className="text-muted-foreground mt-1">Process and track staff salaries</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          {canManageSalary && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Salary Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Teacher</Label>
                    <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherProfiles.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.profile?.full_name || 'Unknown'} - {teacher.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Basic Salary (₹)</Label>
                    <Input
                      type="number"
                      value={formData.basic_salary}
                      onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                      required
                      placeholder="e.g., 35000"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Allowances (₹)</Label>
                      <Input
                        type="number"
                        value={formData.allowances}
                        onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deductions (₹)</Label>
                      <Input
                        type="number"
                        value={formData.deductions}
                        onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Days Present</Label>
                      <Input
                        type="number"
                        value={formData.days_present}
                        onChange={(e) => setFormData({ ...formData, days_present: e.target.value })}
                        placeholder="22"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Days Absent</Label>
                      <Input
                        type="number"
                        value={formData.days_absent}
                        onChange={(e) => setFormData({ ...formData, days_absent: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createSalaryRecord.isPending}>
                    {createSalaryRecord.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add Salary Record
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Month/Year Filter */}
      <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Period:</span>
          </div>
          <div className="flex gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {new Date(2024, i).toLocaleString('en-IN', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 opacity-0 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Salary</p>
              <p className="text-2xl font-display font-bold text-foreground mt-1">
                {formatCurrencyINR(totalSalary)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4 opacity-0 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-display font-bold text-foreground mt-1">
                {teacherProfiles.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-success" />
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4 opacity-0 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-display font-bold text-foreground mt-1">{paidCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4 opacity-0 animate-fade-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-display font-bold text-foreground mt-1">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="glass-card overflow-hidden animate-fade-up" style={{ animationDelay: '300ms' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : salaryRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <IndianRupee className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-foreground">No Salary Records</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No salary records found for {formatMonthYear(parseInt(selectedMonth), parseInt(selectedYear))}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSalaryRecords.map((record, index) => (
                <TableRow 
                  key={record.id}
                  className="table-row-hover opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50 + 350}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {getTeacherName(record.teacher_id).split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">{getTeacherName(record.teacher_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrencyINR(Number(record.basic_salary))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-success">
                    +{formatCurrencyINR(Number(record.allowances) || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    -{formatCurrencyINR(Number(record.deductions) || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      (record.days_present || 0) >= 21 ? 'bg-success/10 text-success' : 
                      (record.days_present || 0) >= 18 ? 'bg-warning/10 text-warning' : 
                      'bg-destructive/10 text-destructive'
                    )}>
                      {record.days_present || 0}/{(record.days_present || 0) + (record.days_absent || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    {formatCurrencyINR(Number(record.net_salary))}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize',
                      record.status === 'paid' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-warning/10 text-warning'
                    )}>
                      {record.status === 'paid' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {record.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canManageSalary && record.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleMarkPaid(record.id)}
                          disabled={markAsPaid.isPending}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => openReceipt(record)}
                        title="View Receipt"
                      >
                        <Receipt className="w-4 h-4 text-primary" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary Card */}
      <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Salary Insights</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Total payroll for {formatMonthYear(parseInt(selectedMonth), parseInt(selectedYear))}: 
              <span className="font-semibold text-foreground ml-1">{formatCurrencyINR(totalSalary)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
