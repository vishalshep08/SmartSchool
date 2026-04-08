import { useState } from 'react';
import { useStaff, StaffMember } from '@/hooks/useStaff';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Search, Filter, User, Edit, Eye, Loader2, CheckCircle2,
  Mail, Phone, Building, Calendar, History, AlertTriangle, Users,
  Briefcase, GraduationCap, FileText, Banknote, UserX, UserCheck, Shield, Trash2,
} from 'lucide-react';
import { formatDateIndian, formatCurrencyINR } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EMPLOYEE_TYPES = ['Teaching', 'Non-Teaching', 'Management', 'Contract'];
const DEPARTMENTS = ['Academic', 'Administration', 'Finance', 'HR', 'IT', 'Sports', 'Library', 'Maintenance'];
const DESIGNATIONS: Record<string, string[]> = {
  Teaching: ['Teacher', 'Senior Teacher', 'Head of Department', 'Vice Principal', 'Principal'],
  'Non-Teaching': ['Office Assistant', 'Accountant', 'Clerk', 'Receptionist', 'Lab Assistant'],
  Management: ['Director', 'Manager', 'Coordinator', 'Supervisor'],
  Contract: ['Security Guard', 'Cleaning Staff', 'Driver', 'Gardener', 'Electrician'],
};
const EMPLOYMENT_MODES = ['Full-time', 'Part-time', 'Contract'];
const SALARY_GRADES = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'];
const QUALIFICATIONS = ['B.Ed', 'M.Ed', 'B.Sc', 'M.Sc', 'B.A', 'M.A', 'Ph.D', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];

// ─── Edit Employee Form ───────────────────────────────────────────────────────
function EditEmployeeDialog({ employee, onClose }: { employee: StaffMember; onClose: (saved?: boolean) => void }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const emp = employee as any;

  const [form, setForm] = useState({
    full_name: employee.profile?.full_name || '',
    phone: employee.profile?.phone || '',
    date_of_birth: emp.date_of_birth || '',
    gender: emp.gender || '',
    contact_number: emp.contact_number || '',
    personal_email: emp.personal_email || '',
    official_email: emp.official_email || '',
    address: emp.address || '',
    aadhaar_number: emp.aadhaar_number || '',
    employee_type: emp.employee_type || '',
    department: emp.department || '',
    designation: emp.designation || '',
    joining_date: employee.joining_date || '',
    employment_mode: emp.employment_mode || '',
    salary_grade: emp.salary_grade || '',
    subject: employee.subject || '',
    qualification: employee.qualification || '',
    experience_type: emp.experience_type || '',
    experience_years: employee.experience_years?.toString() || '0',
    bank_account_number: emp.bank_account_number || '',
    ifsc_code: emp.ifsc_code || '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_number: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const [tab, setTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch emergency contact
  const { data: emergencyContact } = useQuery({
    queryKey: ['emergency-contact', employee.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('employee_emergency_contacts')
        .select('*')
        .eq('teacher_id', employee.id)
        .maybeSingle();
      return data;
    },
  });

  // Load emergency contact into form once fetched
  useState(() => {
    if (emergencyContact) {
      setForm(prev => ({
        ...prev,
        emergency_contact_name: emergencyContact.contact_name || '',
        emergency_contact_relationship: emergencyContact.relationship || '',
        emergency_contact_number: emergencyContact.contact_number || '',
      }));
    }
  });

  const handleSave = async () => {
    if (!form.full_name.trim()) return toast.error('Name is required');
    setIsSaving(true);
    try {
      // Track changes for history
      const changes: Record<string, { old: any; new: any }> = {};
      const checkChange = (field: string, oldVal: any, newVal: any) => {
        if (String(oldVal || '') !== String(newVal || '')) changes[field] = { old: oldVal, new: newVal };
      };

      checkChange('full_name', employee.profile?.full_name, form.full_name);
      checkChange('phone', employee.profile?.phone, form.phone);
      checkChange('date_of_birth', emp.date_of_birth, form.date_of_birth);
      checkChange('gender', emp.gender, form.gender);
      checkChange('department', emp.department, form.department);
      checkChange('designation', emp.designation, form.designation);
      checkChange('employee_type', emp.employee_type, form.employee_type);
      checkChange('employment_mode', emp.employment_mode, form.employment_mode);
      checkChange('salary_grade', emp.salary_grade, form.salary_grade);
      checkChange('qualification', employee.qualification, form.qualification);
      checkChange('bank_account_number', emp.bank_account_number, form.bank_account_number);

      // 1. Update profile
      await supabase.from('profiles').update({
        full_name: form.full_name,
        phone: form.phone,
      } as any).eq('user_id', employee.user_id);

      // 2. Update teacher/employee record
      const updatePayload = {
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        contact_number: form.contact_number || null,
        personal_email: form.personal_email || null,
        official_email: form.official_email || null,
        address: form.address || null,
        aadhaar_number: form.aadhaar_number || null,
        employee_type: form.employee_type || null,
        department: form.department || null,
        designation: form.designation || null,
        joining_date: form.joining_date || null,
        employment_mode: form.employment_mode || null,
        salary_grade: form.salary_grade || null,
        subject: form.subject || employee.subject,
        qualification: form.qualification || null,
        experience_type: form.experience_type || null,
        experience_years: Number(form.experience_years) || 0,
        bank_account_number: form.bank_account_number || null,
        ifsc_code: form.ifsc_code?.toUpperCase() || null,
      };

      const targetTable = employee.source_table === 'teachers' ? 'teachers' : 'employees';
      await (supabase as any).from(targetTable).update(updatePayload).eq('id', employee.id);

      // 3. Upsert emergency contact
      if (form.emergency_contact_name && form.emergency_contact_number) {
        if (emergencyContact?.id) {
          await (supabase as any).from('employee_emergency_contacts').update({
            contact_name: form.emergency_contact_name,
            relationship: form.emergency_contact_relationship,
            contact_number: form.emergency_contact_number,
          }).eq('id', emergencyContact.id);
        } else {
          await (supabase as any).from('employee_emergency_contacts').insert({
            teacher_id: employee.id,
            contact_name: form.emergency_contact_name,
            relationship: form.emergency_contact_relationship,
            contact_number: form.emergency_contact_number,
          });
        }
      }

      // 4. Log edit history
      if (Object.keys(changes).length > 0) {
        await (supabase as any).from('employee_edit_history').insert({
          teacher_id: employee.id,
          changed_by_id: user?.id,
          changed_by_name: profile?.fullName || 'Principal',
          changed_by_role: 'principal',
          changed_fields: changes,
          change_summary: Object.keys(changes).join(', '),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-contact', employee.id] });
      toast.success('Employee record updated successfully');
      onClose(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit Employee — {employee.profile?.full_name || employee.employee_id}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            {emp.employee_type === 'Teaching' && <TabsTrigger value="teaching">Teaching</TabsTrigger>}
            <TabsTrigger value="bank">Bank</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>

          {/* BASIC INFO */}
          <TabsContent value="basic" className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex gap-2">
              <Shield className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Login email cannot be changed here. Contact Super Admin to update auth email.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => set('gender', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input value={form.contact_number} onChange={e => set('contact_number', e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1" />
              </div>
              <div>
                <Label>Personal Email</Label>
                <Input type="email" value={form.personal_email} onChange={e => set('personal_email', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Official Email</Label>
                <Input type="email" value={form.official_email} onChange={e => set('official_email', e.target.value)} placeholder="Optional" className="mt-1" />
              </div>
              <div>
                <Label>Aadhaar Number</Label>
                <Input value={form.aadhaar_number} onChange={e => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className="mt-1" />
              </div>
            </div>
          </TabsContent>

          {/* EMPLOYMENT */}
          <TabsContent value="employment" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Employee Type</Label>
                <Select value={form.employee_type} onValueChange={v => set('employee_type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYEE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={form.department} onValueChange={v => set('department', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation</Label>
                <Select value={form.designation} onValueChange={v => set('designation', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(DESIGNATIONS[form.employee_type] || DESIGNATIONS.Teaching).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employment Mode</Label>
                <Select value={form.employment_mode} onValueChange={v => set('employment_mode', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Salary Grade</Label>
                <Select value={form.salary_grade} onValueChange={v => set('salary_grade', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SALARY_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Joining Date</Label>
                <Input type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} className="mt-1" />
              </div>
            </div>
          </TabsContent>

          {/* TEACHING */}
          {emp.employee_type === 'Teaching' && (
            <TabsContent value="teaching" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Subject to Teach</Label>
                  <Input value={form.subject} onChange={e => set('subject', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Qualification</Label>
                  <Select value={form.qualification} onValueChange={v => set('qualification', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Experience Type</Label>
                  <Select value={form.experience_type} onValueChange={v => set('experience_type', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fresher">Fresher</SelectItem>
                      <SelectItem value="Experienced">Experienced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input type="number" min="0" max="50" value={form.experience_years}
                    onChange={e => set('experience_years', e.target.value)} className="mt-1" />
                </div>
              </div>
            </TabsContent>
          )}

          {/* BANK & SALARY */}
          <TabsContent value="bank" className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Verify bank details carefully. Changes will be logged for audit purposes.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Bank Account Number</Label>
                <Input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value.replace(/\D/g, '').slice(0, 18))} className="mt-1" />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input value={form.ifsc_code} onChange={e => set('ifsc_code', e.target.value.toUpperCase().slice(0, 11))} placeholder="e.g., SBIN0001234" className="mt-1" />
              </div>
            </div>
          </TabsContent>

          {/* EMERGENCY CONTACT */}
          <TabsContent value="emergency" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input value={form.emergency_contact_relationship} onChange={e => set('emergency_contact_relationship', e.target.value)} placeholder="e.g., Spouse, Parent" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Contact Number</Label>
                <Input value={form.emergency_contact_number} onChange={e => set('emergency_contact_number', e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onClose(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit History Tab ────────────────────────────────────────────────────────
function EditHistoryTab({ employeeId }: { employeeId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['employee-edit-history', employeeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employee_edit_history')
        .select('*')
        .eq('teacher_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!history || history.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No edit history available.</div>;
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {history.map((h: any) => (
        <div key={h.id} className="p-3 rounded-lg bg-muted/30 border text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{h.changed_by_name} ({h.changed_by_role})</span>
            <span className="text-xs text-muted-foreground">{h.created_at ? formatDateIndian(h.created_at) : '—'}</span>
          </div>
          <p className="text-muted-foreground text-xs">Fields changed: {h.change_summary || '-'}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Employee Detail View ────────────────────────────────────────────────────
function EmployeeDetailView({ employeeId, onBack }: { employeeId: string; onBack: () => void }) {
  // Derive from live query so edits always show immediately
  const { staff } = useStaff();
  const employee = staff.find(s => s.id === employeeId);

  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleEditClose = (saved?: boolean) => {
    setShowEdit(false);
    if (saved) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3500);
    }
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const emp = employee as any;

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active, source_table }: { id: string; is_active: boolean; source_table?: string }) => {
      const targetTable = source_table === 'teachers' ? 'teachers' : 'employees';
      await (supabase as any).from(targetTable).update({ status: is_active ? 'Active' : 'Inactive' } as any).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(`Employee ${employee.is_active ? 'deactivated' : 'activated'}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: emergencyContact } = useQuery({
    queryKey: ['emergency-contact', employee.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from('employee_emergency_contacts').select('*').eq('teacher_id', employee.id).maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Staff List
      </Button>

      {/* Saved confirmation banner */}
      {justSaved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm animate-fade-up">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          Employee details updated successfully — all changes are now live.
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-primary">
              {employee.profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl font-bold">{employee.profile?.full_name || 'Unknown'}</h1>
              <Badge className={cn(employee.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                {employee.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">{emp.designation || employee.subject} • {emp.department || 'Academic'}</p>
            <p className="text-sm text-muted-foreground mt-1">Employee ID: {employee.employee_id} • {emp.employee_type || 'Teaching'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowEdit(true)}>
              <Edit className="h-4 w-4" /> Edit
            </Button>
            {employee.is_active ? (
              <Button variant="destructive" className="gap-2" size="sm"
                onClick={() => setShowDeactivateConfirm(true)}>
                <UserX className="h-4 w-4" /> Deactivate
              </Button>
            ) : (
              <Button variant="outline" className="gap-2 border-success text-success" size="sm"
                disabled={toggleActive.isPending}
                onClick={() => toggleActive.mutate({ id: employee.id, is_active: true, source_table: employee.source_table })}>
                <UserCheck className="h-4 w-4" /> Activate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {emp.employee_type === 'Teaching' && <TabsTrigger value="teaching">Teaching</TabsTrigger>}
          <TabsTrigger value="bank">Bank & Salary</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
          <TabsTrigger value="history">Edit History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Date of Birth', emp.date_of_birth ? formatDateIndian(emp.date_of_birth) : '—'],
                  ['Gender', emp.gender || '—'],
                  ['Contact', emp.contact_number || employee.profile?.phone || '—'],
                  ['Personal Email', emp.personal_email || employee.profile?.email || '—'],
                  ['Aadhaar', emp.aadhaar_number ? `XXXX-XXXX-${emp.aadhaar_number.slice(-4)}` : '—'],
                  ['Address', emp.address || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-right max-w-[200px]">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Type', emp.employee_type || 'Teaching'],
                  ['Department', emp.department || '—'],
                  ['Designation', emp.designation || '—'],
                  ['Mode', emp.employment_mode || 'Full-time'],
                  ['Salary Grade', emp.salary_grade || '—'],
                  ['Joining Date', employee.joining_date ? formatDateIndian(employee.joining_date) : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span><span>{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {emp.employee_type === 'Teaching' && (
          <TabsContent value="teaching">
            <Card>
              <CardHeader><CardTitle className="text-base">Teaching Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Subject', employee.subject || '—'],
                  ['Qualification', employee.qualification || '—'],
                  ['Experience Type', emp.experience_type || '—'],
                  ['Years of Experience', `${employee.experience_years || 0} years`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span><span>{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="bank">
          <Card>
            <CardHeader><CardTitle className="text-base">Bank & Salary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Bank Account', emp.bank_account_number ? `XXXX${emp.bank_account_number.slice(-4)}` : '—'],
                ['IFSC Code', emp.ifsc_code || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span><span className="font-mono">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency">
          <Card>
            <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {emergencyContact ? [
                ['Name', emergencyContact.contact_name],
                ['Relationship', emergencyContact.relationship],
                ['Contact', emergencyContact.contact_number],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span><span>{v || '—'}</span>
                </div>
              )) : (
                <p className="text-muted-foreground text-center py-4">No emergency contact on record.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Edit History
            </CardTitle></CardHeader>
            <CardContent>
              <EditHistoryTab employeeId={employee.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showEdit && <EditEmployeeDialog employee={employee!} onClose={(saved) => handleEditClose(saved)} />}

      {/* Deactivate Confirm */}
      <Dialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deactivate Employee?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate <strong>{employee.profile?.full_name}</strong>?
            They will no longer be able to log in. This action can be reversed.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeactivateConfirm(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={toggleActive.isPending}
              onClick={() => {
                toggleActive.mutate({ id: employee.id, is_active: false, source_table: employee.source_table });
                setShowDeactivateConfirm(false);
              }}>
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Staff Management Page ───────────────────────────────────────────────
export default function PrincipalStaffManagement() {
  const { staff, isLoading } = useStaff();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  // Store only ID — detail view derives fresh data from live query
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      setIsDeleting(true);

      const employeeId = employeeToDelete.id;
      const userId = employeeToDelete.user_id;
      const isTeaching = employeeToDelete.employee_type === 'Teaching' || employeeToDelete.source_table === 'teachers';

      // Step 1: Nullify teacher_class_assignments (NOT NULL constraint — must clear first)
      await (supabase as any)
        .from('teacher_class_assignments')
        .update({ teacher_id: null, is_class_teacher: false })
        .eq('teacher_id', employeeId);

      // Step 2: Clear other linked data
      await (supabase as any).from('employee_emergency_contacts').delete().eq('teacher_id', employeeId);
      await (supabase as any).from('employee_edit_history').delete().eq('teacher_id', employeeId);

      // Step 3: If teaching staff, also clean up teachers table references
      if (isTeaching && userId) {
        const { data: teacherRec } = await (supabase as any)
          .from('teachers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (teacherRec?.id) {
          // Nullify teacher references that cannot be deleted outright
          await (supabase as any)
            .from('student_leave_requests')
            .update({ reviewed_by_teacher_id: null })
            .eq('reviewed_by_teacher_id', teacherRec.id);

          await (supabase as any)
            .from('homework')
            .update({ assigned_by: null })
            .eq('assigned_by', teacherRec.id);

          // Delete the teachers record
          await (supabase as any).from('teachers').delete().eq('id', teacherRec.id);
        }
      }

      // Step 4: Delete from employees table
      const { error: empErr } = await (supabase as any)
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (empErr) {
        if (empErr.code === '23503') {
          throw new Error('Cannot delete: Employee has linked records (attendance/leaves). Please deactivate instead.');
        }
        throw new Error(empErr.message || 'Failed to delete employee record');
      }

      // Step 5: Delete from user_roles
      if (userId) {
        await (supabase as any).from('user_roles').delete().eq('user_id', userId);
      }

      // Step 6: Delete auth user (removes login access)
      if (userId) {
        const { error: fnErr } = await supabase.functions.invoke('delete-user', {
          body: { userId }
        });
        if (fnErr) console.error('Auth user delete failed (non-critical):', fnErr);
      }

      toast.success(`${employeeToDelete.profile?.full_name || employeeToDelete.full_name || 'Employee'} has been permanently removed`);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setEmployeeToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete employee. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedEmployeeId) {
    return <EmployeeDetailView employeeId={selectedEmployeeId} onBack={() => setSelectedEmployeeId(null)} />;
  }

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q || [
      s.profile?.full_name, s.employee_id, s.profile?.email,
    ].some(v => v?.toLowerCase().includes(q));
    const emp = s as any;
    const matchesType = filterType === 'all' || emp.employee_type === filterType;
    const matchesDept = filterDept === 'all' || emp.department === filterDept;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'Active' ? s.is_active : !s.is_active);
    return matchesSearch && matchesType && matchesDept && matchesStatus;
  });

  const activeCount = staff.filter(s => s.is_active).length;
  const teachingCount = staff.filter(s => (s as any).employee_type === 'Teaching').length;
  const nonTeachingCount = staff.filter(s => (s as any).employee_type !== 'Teaching').length;

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="font-heading text-2xl font-bold mb-1">Staff Management</h1>
        <p className="text-muted-foreground">View and manage all school employees</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Active', value: activeCount, icon: Users, color: 'text-primary' },
          { label: 'Teaching Staff', value: teachingCount, icon: GraduationCap, color: 'text-success' },
          { label: 'Non-Teaching', value: nonTeachingCount, icon: Briefcase, color: 'text-warning' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, email..." className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Employee Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EMPLOYEE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No employees match your filters.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => {
                  const emp = s as any;
                  const eType = emp.employee_type || 'Teaching';
                  const typeColors: any = {
                    Teaching: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
                    'Non-Teaching': 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    Management: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
                    Contract: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  };

                  return (
                    <TableRow key={s.id} className="table-row-hover cursor-pointer" onClick={() => setSelectedEmployeeId(s.id)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {s.profile?.avatar_url || s.profile_photo_url ? (
                            <img src={s.profile?.avatar_url || s.profile_photo_url} alt="Profile" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {(s.profile?.full_name || (s as any).full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{s.profile?.full_name || (s as any).full_name || 'Unknown'}</p>
                              {s.assignedClass && (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] px-1.5 py-0 h-4">CT</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.employee_id}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-xs font-normal', typeColors[eType] || typeColors['Non-Teaching'])}>
                          {eType}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.department || '—'}</TableCell>
                      <TableCell>{emp.designation || '—'}</TableCell>
                      <TableCell>{s.joining_date ? formatDateIndian(s.joining_date) : '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs border-transparent', s.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200')}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 items-center">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelectedEmployeeId(s.id)}>
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setEmployeeToDelete(s)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t text-xs text-muted-foreground">
            Showing {filtered.length} of {staff.length} employees
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Delete Employee — Are you sure?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove <strong>{employeeToDelete?.profile?.full_name}</strong> ({employeeToDelete?.designation || employeeToDelete?.employee_type}) from the system. All their records including attendance, leaves, and remarks will be preserved but unlinked. This cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setEmployeeToDelete(null)} disabled={isDeleting} className="flex-1">Cancel</Button>
            <Button variant="destructive" className="flex-1 gap-2" disabled={isDeleting}
              onClick={handleDeleteEmployee}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
