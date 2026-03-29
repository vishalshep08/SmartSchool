import { useState, useRef } from 'react';
import { useCreateTeacher, exportSingleTeacherCSV, CreatedTeacher } from '@/hooks/useCreateTeacher';
import { useTeacherDocumentUpload, REQUIRED_DOCS, ALL_DOCS, DOC_LABELS, type DocType } from '@/hooks/useTeacherDocuments';
import { useAdminActionLogger } from '@/hooks/useAdminActionLogger';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CreateEmployeeFormProps {
  onSuccess: () => void;
}

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

export function CreateEmployeeForm({ onSuccess }: CreateEmployeeFormProps) {
  const { user } = useAuth();
  const { logAction } = useAdminActionLogger();
  const { logActivity } = useLogActivity();
  const { createTeacher } = useCreateTeacher();
  const docUpload = useTeacherDocumentUpload();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdEmployee, setCreatedEmployee] = useState<CreatedTeacher | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Step 2 fields
  const [employeeType, setEmployeeType] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [employmentMode, setEmploymentMode] = useState('');
  const [salaryGrade, setSalaryGrade] = useState('');

  // Step 3 fields (teaching only)
  const [subject, setSubject] = useState('');
  const [experienceType, setExperienceType] = useState('');
  const [qualification, setQualification] = useState('');
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Step 4 fields
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
  });

  // Fetch classes that already have a class teacher assigned
  const { data: assignedClassIds } = useQuery({
    queryKey: ['assigned-class-teacher-classes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('teacher_class_assignments')
        .select('class_id')
        .eq('is_class_teacher', true);
      return (data || []).map(a => a.class_id);
    },
  });

  const vacantClasses = (classes || []).filter(c => !(assignedClassIds || []).includes(c.id));

  const isTeaching = employeeType === 'Teaching';
  const totalSteps = isTeaching ? 5 : 4;
  const reviewStep = isTeaching ? 5 : 4;
  const docsStep = isTeaching ? 4 : 3;

  const validateStep = (stepNum: number): boolean => {
    const errs: Record<string, string> = {};

    if (stepNum === 1) {
      if (!fullName.trim() || !/^[a-zA-Z\s]{2,80}$/.test(fullName.trim())) errs.fullName = 'Name must be 2-80 characters, letters only';
      if (!dob) errs.dob = 'Date of birth is required';
      else {
        const age = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 18) errs.dob = 'Employee must be at least 18 years old';
      }
      if (!gender) errs.gender = 'Gender is required';
      if (!/^\d{10}$/.test(contactNumber)) errs.contactNumber = 'Enter a valid 10-digit number';
      if (!personalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) errs.personalEmail = 'Valid email required';
      if (!address || address.length < 10) errs.address = 'Address must be at least 10 characters';
      if (!/^\d{12}$/.test(aadhaarNumber)) errs.aadhaarNumber = 'Invalid ID format (12 digits)';
    }

    if (stepNum === 2) {
      if (!employeeType) errs.employeeType = 'Required';
      if (!department) errs.department = 'Required';
      if (!designation) errs.designation = 'Required';
      if (!joiningDate) errs.joiningDate = 'Required';
      else if (new Date(joiningDate) > new Date()) errs.joiningDate = 'Joining date cannot be in the future';
      if (!employmentMode) errs.employmentMode = 'Required';
      if (!salaryGrade) errs.salaryGrade = 'Required';
    }

    if (stepNum === 3 && isTeaching) {
      if (!subject.trim()) errs.subject = 'Required';
      if (!experienceType) errs.experienceType = 'Required';
      if (!qualification) errs.qualification = 'Required';
      if (isClassTeacher && !selectedClassId) errs.selectedClassId = 'Please select a class to assign';
    }

    if (stepNum === docsStep) {
      if (!/^\d{9,18}$/.test(bankAccount)) errs.bankAccount = 'Invalid bank account number';
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) errs.ifscCode = 'Invalid IFSC code';
      if (!docUpload.requiredComplete) errs.docs = 'Please upload all required documents';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      // Skip step 3 for non-teaching
      if (step === 2 && !isTeaching) setStep(docsStep);
      else setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === docsStep && !isTeaching) setStep(2);
    else setStep(step - 1);
  };

  const generateDefaultPassword = (name: string) => {
    return 'Pwd@' + name.replace(/\s+/g, '').slice(0, 4) + Math.floor(1000 + Math.random() * 9000);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const { data, error } = await supabase.functions.invoke(
        'create-employee',
        {
          body: {
            fullName,
            dateOfBirth: dob,
            gender,
            contactNumber,
            personalEmail,
            officialEmail,
            address,
            aadhaarNumber,
            employeeType,
            department,
            designation,
            dateOfJoining: joiningDate,
            employmentMode,
            salaryGrade,
            bankAccountNumber: bankAccount,
            ifscCode,
            // Teaching specific
            isClassTeacher,
            assignedClassId: selectedClassId || null,
            experienceType,
            qualification,
            subject,
          }
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Creation failed');
      }

      // Create class teacher assignment manually if needed (edge function doesn't do this)
      if (isClassTeacher && selectedClassId) {
        await supabase.from('teacher_class_assignments').insert({
          teacher_id: data.employeeId,
          class_id: selectedClassId,
          is_class_teacher: true,
          assigned_by: user?.id || null,
        });
      }

      await docUpload.saveDocuments(data.employeeId);

      logAction({ actionType: 'CREATE', module: 'Staff', recordAffected: `Employee: ${fullName}, Type: ${employeeType}` });
      logActivity.mutate({
        action_type: 'CREATE_EMPLOYEE',
        description: `Admin created ${employeeType} employee: ${fullName}`,
        performed_by: user?.id,
        role: 'admin',
        reference_id: data.employeeId,
      });

      // Show success modal with credentials
      setCreatedEmployee({
        id: data.employeeId,
        userId: data.userId,
        employeeId: `EMP-${Date.now().toString().slice(-6)}`,
        fullName,
        email: data.loginEmail,
        phone: contactNumber,
        subject: designation,
        qualification: qualification || null,
        experienceYears: 0,
        salaryAmount: 0,
        joiningDate,
        defaultPassword: data.defaultPassword,
        status: 'Active'
      } as any);
      setShowSuccessModal(true);

    } catch (err: any) {
      console.error('Employee creation error:', err);
      if (err?.message?.includes('EMAIL_EXISTS') || err?.message?.includes('email already exists') || err?.message?.includes('User already registered')) {
        setErrors({ personalEmail: 'Email already registered in the system' });
        setStep(1);
      } else {
        toast.error(`Failed to create employee: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocFileSelect = async (docType: DocType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await docUpload.uploadFile(file, docType, 'temp-' + Date.now());
    if (fileInputRefs.current[docType]) fileInputRefs.current[docType]!.value = '';
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetForm = () => {
    setStep(1);
    setFullName(''); setDob(''); setGender(''); setContactNumber('');
    setPersonalEmail(''); setOfficialEmail(''); setAddress(''); setAadhaarNumber('');
    setEmployeeType(''); setDepartment(''); setDesignation('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setEmploymentMode(''); setSalaryGrade('');
    setSubject(''); setExperienceType(''); setQualification('');
    setIsClassTeacher(false); setSelectedClassId('');
    setBankAccount(''); setIfscCode('');
    setErrors({});
    setCreatedEmployee(null);
    setShowSuccessModal(false);
  };

  const renderError = (field: string) => {
    if (!errors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{errors[field]}</p>;
  };

  // Step progress
  const stepLabels = isTeaching
    ? ['Basic Info', 'Employment', 'Teaching', 'Documents', 'Review']
    : ['Basic Info', 'Employment', 'Documents', 'Review'];

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-2">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const adjustedStep = !isTeaching && stepNum >= 3 ? stepNum + 1 : stepNum;
            const isActive = step === (isTeaching ? stepNum : (stepNum <= 2 ? stepNum : stepNum === 3 ? docsStep : reviewStep));
            const isCompleted = isTeaching ? step > stepNum : (stepNum <= 2 ? step > stepNum : step > (stepNum === 3 ? docsStep : reviewStep));
            
            return (
              <div key={label} className="flex-1 text-center">
                <div className={cn(
                  'w-8 h-8 rounded-full mx-auto flex items-center justify-center text-sm font-medium mb-1',
                  isActive ? 'bg-primary text-primary-foreground' :
                  isCompleted ? 'bg-success text-success-foreground' :
                  'bg-muted text-muted-foreground'
                )}>
                  {isCompleted ? '✓' : i + 1}
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1 - Basic Info */}
      {step === 1 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Step 1: Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter full name" className={cn("mt-1.5", errors.fullName && "border-destructive")} />
              {renderError('fullName')}
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className={cn("mt-1.5", errors.dob && "border-destructive")} />
              {renderError('dob')}
            </div>
            <div>
              <Label>Gender *</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className={cn("mt-1.5", errors.gender && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              {renderError('gender')}
            </div>
            <div>
              <Label>Contact Number *</Label>
              <Input value={contactNumber} onChange={e => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" className={cn("mt-1.5", errors.contactNumber && "border-destructive")} />
              {renderError('contactNumber')}
            </div>
            <div>
              <Label>Personal Email *</Label>
              <Input type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} placeholder="email@example.com" className={cn("mt-1.5", errors.personalEmail && "border-destructive")} />
              {renderError('personalEmail')}
            </div>
            <div>
              <Label>Official Email</Label>
              <Input type="email" value={officialEmail} onChange={e => setOfficialEmail(e.target.value)} placeholder="Optional" className="mt-1.5" />
            </div>
            <div>
              <Label>Aadhaar Number *</Label>
              <Input value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12-digit number" className={cn("mt-1.5", errors.aadhaarNumber && "border-destructive")} />
              {renderError('aadhaarNumber')}
            </div>
            <div className="md:col-span-2">
              <Label>Address *</Label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address (min 10 characters)" className={cn("mt-1.5", errors.address && "border-destructive")} />
              {renderError('address')}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleNext} className="gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 - Employment Details */}
      {step === 2 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Step 2: Employment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Employee Type *</Label>
              <Select value={employeeType} onValueChange={v => { setEmployeeType(v); setDesignation(''); }}>
                <SelectTrigger className={cn("mt-1.5", errors.employeeType && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {renderError('employeeType')}
            </div>
            <div>
              <Label>Department *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className={cn("mt-1.5", errors.department && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {renderError('department')}
            </div>
            <div>
              <Label>Designation *</Label>
              <Select value={designation} onValueChange={setDesignation}>
                <SelectTrigger className={cn("mt-1.5", errors.designation && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(DESIGNATIONS[employeeType] || DESIGNATIONS.Teaching).map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderError('designation')}
            </div>
            <div>
              <Label>Date of Joining *</Label>
              <Input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className={cn("mt-1.5", errors.joiningDate && "border-destructive")} />
              {renderError('joiningDate')}
            </div>
            <div>
              <Label>Employment Mode *</Label>
              <Select value={employmentMode} onValueChange={setEmploymentMode}>
                <SelectTrigger className={cn("mt-1.5", errors.employmentMode && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              {renderError('employmentMode')}
            </div>
            <div>
              <Label>Salary Grade *</Label>
              <Select value={salaryGrade} onValueChange={setSalaryGrade}>
                <SelectTrigger className={cn("mt-1.5", errors.salaryGrade && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {SALARY_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              {renderError('salaryGrade')}
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={handleNext} className="gap-2">Next <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 3 - Teaching Details (only for Teaching type) */}
      {step === 3 && isTeaching && (
        <div className="glass-card p-6 space-y-6">
          <h2 className="font-display text-xl font-semibold">Step 3: Teaching Details</h2>
          
          {/* Section A: Teaching Assignment */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">A</div>
              <h3 className="font-semibold text-foreground">Teaching Assignment</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Subject to Teach *</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Mathematics" className={cn("mt-1.5", errors.subject && "border-destructive")} />
                {renderError('subject')}
              </div>
              <div>
                <Label>Experience Type *</Label>
                <Select value={experienceType} onValueChange={setExperienceType}>
                  <SelectTrigger className={cn("mt-1.5", errors.experienceType && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fresher">Fresher</SelectItem>
                    <SelectItem value="Experienced">Experienced</SelectItem>
                  </SelectContent>
                </Select>
                {renderError('experienceType')}
              </div>
              <div>
                <Label>Qualification *</Label>
                <Select value={qualification} onValueChange={setQualification}>
                  <SelectTrigger className={cn("mt-1.5", errors.qualification && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
                {renderError('qualification')}
              </div>
            </div>
          </div>

          {/* Section B: Class Teacher Assignment */}
          <div className="border-2 border-primary/20 rounded-lg p-4 space-y-4 bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">B</div>
              <div>
                <h3 className="font-semibold text-foreground">Class Teacher Assignment</h3>
                <p className="text-xs text-muted-foreground">Assign this teacher as the primary Class Teacher of a class</p>
              </div>
            </div>

            {/* YES / NO Toggle Cards */}
            <div>
              <p className="text-sm font-medium mb-3">Will this teacher be a Class Teacher?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 flex items-start gap-3 transition-all",
                  !isClassTeacher
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-muted-foreground/40"
                )}>
                  <input
                    type="radio"
                    name="classTeacher"
                    checked={!isClassTeacher}
                    onChange={() => { setIsClassTeacher(false); setSelectedClassId(''); }}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className={cn("text-sm font-semibold", !isClassTeacher ? "text-primary" : "text-foreground")}>
                      NO — Subject Teacher only
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Default</p>
                  </div>
                </label>

                <label className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 flex items-start gap-3 transition-all",
                  isClassTeacher
                    ? "border-green-500 bg-green-50"
                    : "border-border bg-background hover:border-muted-foreground/40"
                )}>
                  <input
                    type="radio"
                    name="classTeacher"
                    checked={isClassTeacher}
                    onChange={() => setIsClassTeacher(true)}
                    className="mt-0.5 accent-green-600"
                  />
                  <div>
                    <p className={cn("text-sm font-semibold", isClassTeacher ? "text-green-700" : "text-foreground")}>
                      YES — Assign as Class Teacher
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Requires class selection</p>
                  </div>
                </label>
              </div>
            </div>

            {isClassTeacher ? (
              <div className="space-y-3">
                {vacantClasses.length > 0 ? (
                  <>
                    <div>
                      <Label className="flex items-center gap-1">
                        Select Class to Assign <span className="text-destructive">*</span>
                      </Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className={cn("mt-1.5", errors.selectedClassId && "border-destructive")}>
                          <SelectValue placeholder="Select a class..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vacantClasses.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.section ? `(${c.section})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderError('selectedClassId')}
                    </div>
                    {selectedClassId ? (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
                        <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-green-600" />
                        <strong>Selected:</strong>{' '}
                        {vacantClasses.find(c => c.id === selectedClassId)?.name}{' '}
                        {vacantClasses.find(c => c.id === selectedClassId)?.section
                          ? `(${vacantClasses.find(c => c.id === selectedClassId)?.section})`
                          : ''}
                        {' '}— this teacher will have full Class Teacher privileges for this class.
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        This teacher will be the Class Teacher of the selected class. They will manage attendance,
                        approve leave requests, and post remarks for students in that class.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800 mb-1">⚠ No Vacant Classes Available</p>
                    <p className="text-xs text-orange-700">
                      All classes currently have a Class Teacher assigned. To assign this teacher as a Class Teacher,
                      first remove an existing assignment from the Staff Management panel.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
                This teacher will be a <strong>Subject Teacher</strong>. They can post homework and remarks
                for their assigned subjects and classes. They cannot mark attendance or approve leave requests.
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={handleNext} className="gap-2">Next <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Step: Documents */}
      {step === docsStep && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Step {isTeaching ? 4 : 3}: Documents & Banking</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Bank Account Number *</Label>
              <Input value={bankAccount} onChange={e => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 18))} placeholder="9-18 digits" className={cn("mt-1.5", errors.bankAccount && "border-destructive")} />
              {renderError('bankAccount')}
            </div>
            <div>
              <Label>IFSC Code *</Label>
              <Input value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase().slice(0, 11))} placeholder="e.g., SBIN0001234" className={cn("mt-1.5", errors.ifscCode && "border-destructive")} />
              {renderError('ifscCode')}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {docUpload.uploadedCount} of {REQUIRED_DOCS.length} required documents uploaded
            {docUpload.requiredComplete && ' ✓'}
          </p>
          {renderError('docs')}

          {ALL_DOCS.map(docType => {
            const isRequired = REQUIRED_DOCS.includes(docType);
            const uploaded = docUpload.uploadedDocs[docType];
            const isUploading = docUpload.uploading[docType];

            return (
              <div key={docType} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">{DOC_LABELS[docType]} {isRequired && <span className="text-destructive">*</span>}</Label>
                  {uploaded && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => docUpload.removeFile(docType)}>
                      <X className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                {uploaded ? (
                  <div className="flex items-center gap-2 p-2 bg-success/5 rounded border border-success/20">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-sm truncate">{uploaded.file_name}</span>
                  </div>
                ) : isUploading ? (
                  <div className="p-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /><Progress value={docUpload.progress[docType] || 0} className="h-1.5 mt-2" /></div>
                ) : (
                  <>
                    <input ref={el => { fileInputRefs.current[docType] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleDocFileSelect(docType, e)} />
                    <Button type="button" variant="outline" className="w-full gap-2 text-sm" onClick={() => fileInputRefs.current[docType]?.click()}>
                      <Upload className="w-4 h-4" /> Upload
                    </Button>
                  </>
                )}
              </div>
            );
          })}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={handleNext} className="gap-2">Next: Review <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === reviewStep && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Review & Submit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Basic Information</h3>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {fullName}</p>
                <p><span className="text-muted-foreground">DOB:</span> {dob}</p>
                <p><span className="text-muted-foreground">Gender:</span> {gender}</p>
                <p><span className="text-muted-foreground">Contact:</span> {contactNumber}</p>
                <p><span className="text-muted-foreground">Email:</span> {personalEmail}</p>
                <p><span className="text-muted-foreground">Aadhaar:</span> {aadhaarNumber}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Employment Details</h3>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <p><span className="text-muted-foreground">Type:</span> {employeeType}</p>
                <p><span className="text-muted-foreground">Department:</span> {department}</p>
                <p><span className="text-muted-foreground">Designation:</span> {designation}</p>
                <p><span className="text-muted-foreground">Joining:</span> {joiningDate}</p>
                <p><span className="text-muted-foreground">Mode:</span> {employmentMode}</p>
                <p><span className="text-muted-foreground">Grade:</span> {salaryGrade}</p>
              </div>
            </div>
            {isTeaching && (
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Teaching Details</h3>
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Subject:</span> {subject}</p>
                  <p><span className="text-muted-foreground">Experience:</span> {experienceType}</p>
                  <p><span className="text-muted-foreground">Qualification:</span> {qualification}</p>
                  <p>
                    <span className="text-muted-foreground">Class Teacher Assignment: </span>
                    {isClassTeacher
                      ? (() => {
                          const cls = vacantClasses.find(c => c.id === selectedClassId);
                          return cls
                            ? `Class ${cls.name}${cls.section ? ` Section ${cls.section}` : ''}`
                            : 'Selected class';
                        })()
                      : 'Subject Teacher only'}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Documents & Banking</h3>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <p><span className="text-muted-foreground">Bank A/C:</span> {bankAccount}</p>
                <p><span className="text-muted-foreground">IFSC:</span> {ifscCode}</p>
                <p><span className="text-muted-foreground">Docs Uploaded:</span> {docUpload.uploadedCount}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Employee
            </Button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <CheckCircle2 className="w-5 h-5 text-success" /> Employee Created Successfully
            </DialogTitle>
            <DialogDescription>Save these credentials. The password will not be shown again.</DialogDescription>
          </DialogHeader>
          {createdEmployee && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{createdEmployee.fullName}</p></div>
                <div><p className="text-xs text-muted-foreground">Employee ID</p><p className="font-medium">{createdEmployee.employeeId}</p></div>
                <div><p className="text-xs text-muted-foreground">Department</p><p className="font-medium">{department}</p></div>
                <div><p className="text-xs text-muted-foreground">Designation</p><p className="font-medium">{designation}</p></div>
                {isTeaching && (
                  <div><p className="text-xs text-muted-foreground">Assignment</p><p className="font-medium">{isClassTeacher ? `Class Teacher of ${vacantClasses.find(c => c.id === selectedClassId)?.name || 'Assigned Class'}` : 'Subject Teacher'}</p></div>
                )}
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{createdEmployee.email}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdEmployee.email, 'email')}>
                    {copiedField === 'email' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between bg-warning/10 p-2 rounded border border-warning/20">
                  <div><p className="text-xs text-warning">Default Password</p><p className="font-mono font-bold">{createdEmployee.defaultPassword}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdEmployee.defaultPassword, 'pwd')}>
                    {copiedField === 'pwd' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { if (createdEmployee) exportSingleTeacherCSV(createdEmployee); }}>
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button className="flex-1" onClick={() => { setShowSuccessModal(false); onSuccess(); }}>
                  View Profile
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={resetForm}>Create Another Employee</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
