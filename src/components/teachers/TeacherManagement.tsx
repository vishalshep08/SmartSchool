import { useState, useRef } from 'react';
import { useTeachers, useTeacherProfiles } from '@/hooks/useTeachers';
import { useCreateTeacher, exportSingleTeacherCSV, CreatedTeacher } from '@/hooks/useCreateTeacher';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { useAdminActionLogger } from '@/hooks/useAdminActionLogger';
import { useTeacherDocumentUpload, REQUIRED_DOCS, OPTIONAL_DOCS, ALL_DOCS, DOC_LABELS, type DocType } from '@/hooks/useTeacherDocuments';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Search, Plus, Mail, Phone, BookOpen, Calendar, MoreHorizontal,
  Loader2, Edit, Trash2, Eye, Settings, Download, Copy, CheckCircle2,
  Upload, X, FileText, Image, ArrowLeft, ArrowRight
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDateIndian, formatCurrencyINR } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { TeacherPermissionsManager } from './TeacherPermissionsManager';

interface TeacherFormData {
  employee_id: string;
  subject: string;
  qualification: string;
  experience_years: number;
  salary_amount: number;
  joining_date: string;
  full_name: string;
  email: string;
  phone: string;
}

const initialFormData: TeacherFormData = {
  employee_id: '', subject: '', qualification: '', experience_years: 0,
  salary_amount: 0, joining_date: new Date().toISOString().split('T')[0],
  full_name: '', email: '', phone: '',
};

export function TeacherManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logActivity } = useLogActivity();
  const { logAction } = useAdminActionLogger();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [formData, setFormData] = useState<TeacherFormData>(initialFormData);
  const [createdTeacher, setCreatedTeacher] = useState<CreatedTeacher | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2>(1);

  const { teachers, isLoading, deleteTeacher, updateTeacher } = useTeachers();
  const { teacherProfiles, isLoading: profilesLoading } = useTeacherProfiles();
  const { createTeacher } = useCreateTeacher();
  const docUpload = useTeacherDocumentUpload();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useRealtimeSubscription({
    table: 'teachers',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-profiles'] });
    },
  });

  const filteredTeachers = teacherProfiles.filter(teacher =>
    teacher.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, teacherName?: string) => {
    if (confirm('Are you sure you want to remove this teacher?')) {
      await deleteTeacher.mutateAsync(id);
      logAction({ actionType: 'DELETE', module: 'Staff', recordAffected: `Teacher: ${teacherName || id}` });
    }
  };

  const handleStep1Next = () => {
    const errors: Record<string, string> = {};
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) errors.phone = 'Enter a valid 10-digit phone number';
    if (!formData.qualification.trim()) errors.qualification = 'Qualification is required';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    setStep(2);
  };

  const handleAdd = async () => {
    if (!docUpload.requiredComplete) {
      toast.error('Please upload all required documents');
      return;
    }

    try {
      const result = await createTeacher.mutateAsync({
        fullName: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employee_id || undefined,
        subject: formData.subject,
        qualification: formData.qualification,
        experienceYears: formData.experience_years || 0,
        salaryAmount: formData.salary_amount || 0,
        joiningDate: formData.joining_date,
      });

      // Save documents linked to teacher
      if (result.id) {
        await docUpload.saveDocuments(result.id);
        
        // Log activities
        logActivity.mutate({
          action_type: 'CREATE_TEACHER',
          description: `Admin created teacher account for ${formData.full_name}`,
          performed_by: user?.id,
          role: 'admin',
          reference_id: result.id,
        });
        logAction({ actionType: 'CREATE', module: 'Staff', recordAffected: `Teacher: ${formData.full_name}, Email: ${formData.email}` });

        Object.keys(docUpload.uploadedDocs).forEach(docType => {
          logActivity.mutate({
            action_type: 'UPLOAD_TEACHER_DOC',
            description: `Teacher ${formData.full_name} uploaded ${DOC_LABELS[docType as DocType]}`,
            performed_by: user?.id,
            role: 'admin',
            reference_id: result.id,
          });
        });
      }

      setCreatedTeacher(result);
      setIsAddDialogOpen(false);
      setIsCredentialsDialogOpen(true);
      setFormData(initialFormData);
      setStep(1);
      setFieldErrors({});
    } catch (error: any) {
      // Map error codes to field-specific errors
      const errData = error?.message || '';
      if (errData.includes('email already exists') || errData.includes('EMAIL_EXISTS')) {
        setFieldErrors(prev => ({ ...prev, email: 'A teacher with this email already exists.' }));
        setStep(1);
      } else if (errData.includes('WEAK_PASSWORD')) {
        toast.error('Password must be at least 8 characters and include a number.');
      } else {
        toast.error(errData || 'Something went wrong. Please try again.');
      }
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    await updateTeacher.mutateAsync({
      id: selectedTeacher.id,
      subject: formData.subject,
      qualification: formData.qualification,
      experience_years: formData.experience_years,
      salary_amount: formData.salary_amount,
    });
    logAction({ actionType: 'UPDATE', module: 'Staff', recordAffected: `Teacher: ${formData.full_name}, Subject: ${formData.subject}` });
    setIsEditDialogOpen(false);
    setSelectedTeacher(null);
    setFormData(initialFormData);
  };

  const openEditDialog = (teacher: any) => {
    setSelectedTeacher(teacher);
    setFormData({
      employee_id: teacher.employee_id, subject: teacher.subject,
      qualification: teacher.qualification || '', experience_years: teacher.experience_years || 0,
      salary_amount: teacher.salary_amount || 0, joining_date: teacher.joining_date,
      full_name: teacher.profile?.full_name || '', email: teacher.profile?.email || '',
      phone: teacher.profile?.phone || '',
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsViewDialogOpen(true);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportCSV = () => {
    if (createdTeacher) {
      exportSingleTeacherCSV(createdTeacher);
      toast.success('Credentials exported to CSV');
    }
  };

  const handleDocFileSelect = async (docType: DocType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use a temp ID for uploads before teacher is created
    await docUpload.uploadFile(file, docType, 'temp-' + Date.now());
    if (fileInputRefs.current[docType]) fileInputRefs.current[docType]!.value = '';
  };

  if (isLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderFieldError = (field: string) => {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{fieldErrors[field]}</p>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Teachers</h1>
          <p className="text-muted-foreground mt-1">Manage teaching staff and assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) { setStep(1); setFieldErrors({}); }
        }}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="gap-2"><Plus className="w-4 h-4" />Add Teacher</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {step === 1 ? 'Step 1: Basic Information' : 'Step 2: Document Upload'}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? 'Enter teacher details. A secure password will be generated automatically.'
                  : 'Upload required documents before creating the account.'}
              </DialogDescription>
            </DialogHeader>

            {step === 1 ? (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Full Name *</Label>
                    <Input value={formData.full_name} onChange={(e) => { setFormData({ ...formData, full_name: e.target.value }); setFieldErrors(prev => { const n = {...prev}; delete n.full_name; return n; }); }} placeholder="Enter full name" className={cn("mt-1.5", fieldErrors.full_name && "border-destructive")} />
                    {renderFieldError('full_name')}
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFieldErrors(prev => { const n = {...prev}; delete n.email; return n; }); }} placeholder="teacher@school.com" className={cn("mt-1.5", fieldErrors.email && "border-destructive")} />
                    {renderFieldError('email')}
                  </div>
                  <div>
                    <Label>Phone <span className="text-destructive">*</span></Label>
                    <Input type="tel" value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setFieldErrors(prev => { const n = {...prev}; delete n.phone; return n; }); }} placeholder="10-digit number" className={cn("mt-1.5", fieldErrors.phone && "border-destructive")} />
                    {renderFieldError('phone')}
                  </div>
                  <div>
                    <Label>Employee ID</Label>
                    <Input value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} placeholder="Auto-generated if empty" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Input value={formData.subject} onChange={(e) => { setFormData({ ...formData, subject: e.target.value }); setFieldErrors(prev => { const n = {...prev}; delete n.subject; return n; }); }} placeholder="e.g., Mathematics" className={cn("mt-1.5", fieldErrors.subject && "border-destructive")} />
                    {renderFieldError('subject')}
                  </div>
                  <div>
                    <Label>Qualification <span className="text-destructive">*</span></Label>
                    <Input value={formData.qualification} onChange={(e) => { setFormData({ ...formData, qualification: e.target.value }); setFieldErrors(prev => { const n = {...prev}; delete n.qualification; return n; }); }} placeholder="e.g., M.Sc., B.Ed." className={cn("mt-1.5", fieldErrors.qualification && "border-destructive")} />
                    {renderFieldError('qualification')}
                  </div>
                  <div>
                    <Label>Experience (Years)</Label>
                    <Input type="number" min="0" value={formData.experience_years} onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Salary (₹)</Label>
                    <Input type="number" min="0" value={formData.salary_amount} onChange={(e) => setFormData({ ...formData, salary_amount: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Joining Date</Label>
                    <Input type="date" value={formData.joining_date} onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} className="mt-1.5" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button type="button" variant="gradient" onClick={handleStep1Next} className="gap-2">
                    Next: Upload Documents <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  {docUpload.uploadedCount} of {REQUIRED_DOCS.length} required documents uploaded
                  {docUpload.requiredComplete && ' ✓'}
                </p>

                {ALL_DOCS.map((docType) => {
                  const isRequired = REQUIRED_DOCS.includes(docType);
                  const uploaded = docUpload.uploadedDocs[docType];
                  const isUploading = docUpload.uploading[docType];
                  const progressVal = docUpload.progress[docType] || 0;

                  return (
                    <div key={docType} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">
                          {DOC_LABELS[docType]} {isRequired && <span className="text-destructive">*</span>}
                        </Label>
                        {uploaded && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => docUpload.removeFile(docType)}>
                            <X className="w-3 h-3 mr-1" /> Remove
                          </Button>
                        )}
                      </div>

                      {uploaded ? (
                        <div className="flex items-center gap-2 p-2 bg-success/5 rounded border border-success/20">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          <span className="text-sm truncate">{uploaded.file_name}</span>
                        </div>
                      ) : isUploading ? (
                        <div className="space-y-2 p-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <Progress value={progressVal} className="h-1.5" />
                        </div>
                      ) : (
                        <>
                          <input
                            ref={(el) => { fileInputRefs.current[docType] = el; }}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleDocFileSelect(docType, e)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full gap-2 text-sm"
                            onClick={() => fileInputRefs.current[docType]?.click()}
                          >
                            <Upload className="w-4 h-4" />
                            Upload {docType === 'profile_photo' ? 'Photo' : 'Document'}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            {docType === 'profile_photo' ? 'JPG, PNG' : 'PDF, JPG, PNG'} – Max 5 MB
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-between gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    variant="gradient"
                    disabled={!docUpload.requiredComplete || createTeacher.isPending}
                    onClick={handleAdd}
                  >
                    {createTeacher.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Teacher Account
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, subject, or employee ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 input-focus" />
        </div>
      </div>

      {/* Teachers Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-up">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No teachers found</h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery ? 'Try adjusting your search query.' : 'Click "Add Teacher" to create the first teacher account.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher, index) => (
            <div key={teacher.id} className="glass-card overflow-hidden opacity-0 animate-fade-up hover-lift" style={{ animationDelay: `${index * 100 + 200}ms` }}>
              <div className="h-20 relative" style={{ background: 'var(--gradient-primary)' }}>
                <div className="absolute -bottom-8 left-6">
                  <div className="w-16 h-16 rounded-xl bg-card shadow-lg flex items-center justify-center border-4 border-card">
                    <span className="text-xl font-display font-bold text-primary">
                      {teacher.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || teacher.employee_id.slice(0, 2)}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-primary-foreground hover:bg-primary-foreground/20">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openViewDialog(teacher)}><Eye className="w-4 h-4 mr-2" />View Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(teacher)}><Edit className="w-4 h-4 mr-2" />Edit Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedTeacher(teacher); setIsPermissionsOpen(true); }}><Settings className="w-4 h-4 mr-2" />Manage Permissions</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(teacher.id, teacher.profile?.full_name)}><Trash2 className="w-4 h-4 mr-2" />Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="pt-12 pb-6 px-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{teacher.profile?.full_name || `Teacher ${teacher.employee_id}`}</h3>
                    <p className="text-xs text-muted-foreground">{teacher.employee_id}</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mt-2">
                      <BookOpen className="w-3 h-3" />{teacher.subject}
                    </span>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', teacher.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                    {teacher.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {teacher.profile?.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4" /><span className="truncate">{teacher.profile.email}</span></div>
                  )}
                  {teacher.profile?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-4 h-4" /><span>{teacher.profile.phone}</span></div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /><span>Joined {teacher.joining_date ? formatDateIndian(teacher.joining_date) : '—'}</span></div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground">Experience</p><p className="text-sm font-medium text-foreground">{teacher.experience_years || 0} years</p></div>
                    <div className="text-right"><p className="text-xs text-muted-foreground">Salary</p><p className="text-sm font-medium text-foreground">{formatCurrencyINR(teacher.salary_amount || 0)}</p></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Edit Teacher Details</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Employee ID</Label><Input disabled value={formData.employee_id} className="mt-1.5" /></div>
              <div><Label>Subject *</Label><Input required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div><Label>Qualification</Label><Input value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} className="mt-1.5" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Experience (Years)</Label><Input type="number" value={formData.experience_years} onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })} className="mt-1.5" /></div>
              <div><Label>Salary (₹)</Label><Input type="number" value={formData.salary_amount} onChange={(e) => setFormData({ ...formData, salary_amount: parseFloat(e.target.value) || 0 })} className="mt-1.5" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={updateTeacher.isPending}>
                {updateTeacher.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Teacher Profile</DialogTitle></DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-primary">
                    {selectedTeacher.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-lg">{selectedTeacher.profile?.full_name || `Teacher ${selectedTeacher.employee_id}`}</h3>
                  <p className="text-muted-foreground">{selectedTeacher.employee_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div><p className="text-xs text-muted-foreground">Subject</p><p className="font-medium text-foreground">{selectedTeacher.subject}</p></div>
                <div><p className="text-xs text-muted-foreground">Experience</p><p className="font-medium text-foreground">{selectedTeacher.experience_years || 0} years</p></div>
                <div><p className="text-xs text-muted-foreground">Qualification</p><p className="font-medium text-foreground">{selectedTeacher.qualification || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground">Salary</p><p className="font-medium text-foreground">{formatCurrencyINR(selectedTeacher.salary_amount || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-foreground truncate">{selectedTeacher.profile?.email || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium text-foreground">{selectedTeacher.profile?.phone || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground">Joining Date</p><p className="font-medium text-foreground">{selectedTeacher.joining_date ? formatDateIndian(selectedTeacher.joining_date) : '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><p className={cn('font-medium', selectedTeacher.is_active ? 'text-success' : 'text-muted-foreground')}>{selectedTeacher.is_active ? 'Active' : 'Inactive'}</p></div>
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success" />Teacher Account Created!</DialogTitle>
            <DialogDescription>Save these credentials. The password will not be shown again.</DialogDescription>
          </DialogHeader>
          {createdTeacher && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div><p className="text-xs text-muted-foreground">Full Name</p><p className="font-medium">{createdTeacher.fullName}</p></div>
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">Employee ID</p><p className="font-medium">{createdTeacher.employeeId}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdTeacher.employeeId, 'employeeId')}>
                    {copiedField === 'employeeId' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{createdTeacher.email}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdTeacher.email, 'email')}>
                    {copiedField === 'email' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between bg-yellow-50 p-2 rounded border border-yellow-200">
                  <div><p className="text-xs text-yellow-700">Default Password (one-time view)</p><p className="font-mono font-bold text-yellow-900">{createdTeacher.defaultPassword}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdTeacher.defaultPassword, 'password')}>
                    {copiedField === 'password' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleExportCSV}><Download className="w-4 h-4" />Export CSV</Button>
                <Button variant="gradient" className="flex-1" onClick={() => { setIsCredentialsDialogOpen(false); setCreatedTeacher(null); }}>Done</Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">The teacher will be required to change their password on first login.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedTeacher && (
        <TeacherPermissionsManager teacherId={selectedTeacher.id} teacherName={selectedTeacher.profile?.full_name || selectedTeacher.employee_id} open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen} />
      )}
    </div>
  );
}
