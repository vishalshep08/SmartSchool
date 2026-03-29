import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, X, FileText, Image, CheckCircle2, AlertCircle, Download, Eye, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ALL_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, validateFile, type DocumentType } from '@/hooks/useStudentDocuments';
import { Progress } from '@/components/ui/progress';

interface StudentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: any[];
}

interface FormErrors {
  [key: string]: string;
}

interface ParentResult {
  isNewParent: boolean;
  email?: string;
  defaultPassword?: string;
  message?: string;
  siblingNames?: string[];
}

interface CreatedStudentInfo {
  fullName: string;
  admissionNumber: string;
  className: string;
  parentEmail: string;
  parentResult: ParentResult | null;
}

export function StudentCreateDialog({ open, onOpenChange, classes }: StudentCreateDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudentInfo, setCreatedStudentInfo] = useState<CreatedStudentInfo | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    admission_number: '',
    class_id: '',
    gender: '',
    date_of_birth: '',
    blood_group: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  });

  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(ALL_DOCUMENT_TYPES.map(dt => [dt, null]))
  );
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2)
      newErrors.full_name = 'Full name is required (min 2 characters)';
    if (!formData.admission_number.trim())
      newErrors.admission_number = 'Admission number is required';
    if (!formData.class_id)
      newErrors.class_id = 'Please select a class';
    if (!formData.gender)
      newErrors.gender = 'Please select gender';
    if (!formData.date_of_birth)
      newErrors.date_of_birth = 'Date of birth is required';
    if (!formData.parent_name.trim())
      newErrors.parent_name = 'Parent/Guardian name is required';
    if (!formData.parent_email.trim())
      newErrors.parent_email = 'Parent email is required';
    if (formData.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent_email))
      newErrors.parent_email = 'Please enter a valid email';
    if (!formData.parent_phone.trim())
      newErrors.parent_phone = 'Parent phone is required';
    if (formData.parent_phone && !/^\d{10}$/.test(formData.parent_phone.replace(/\D/g, '')))
      newErrors.parent_phone = 'Please enter a valid 10-digit phone number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newDocErrors: Record<string, string> = {};
    for (const docType of ALL_DOCUMENT_TYPES) {
      const file = documentFiles[docType];
      if (!file) {
        newDocErrors[docType] = 'This document is required';
      } else {
        const error = validateFile(file);
        if (error) newDocErrors[docType] = error;
      }
    }
    setDocErrors(newDocErrors);
    return Object.keys(newDocErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    } else {
      toast.error('Please fill all required fields');
    }
  };

  const handleFileSelect = (docType: string, file: File | null) => {
    if (file) {
      const error = validateFile(file);
      if (error) {
        setDocErrors(prev => ({ ...prev, [docType]: error }));
        return;
      }
      setDocErrors(prev => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
    }
    setDocumentFiles(prev => ({ ...prev, [docType]: file }));
  };

  const getClassName = (): string => {
    const cls = classes.find((c: any) => c.id === formData.class_id);
    if (!cls) return '';
    return `${cls.name}${cls.section ? ` - ${cls.section}` : ''}`;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      toast.error('Please upload all required documents');
      return;
    }
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Step 1: Create student record
      const { data: student, error: createError } = await supabase
        .from('students')
        .insert({
          full_name: formData.full_name.trim(),
          admission_number: formData.admission_number.trim(),
          class_id: formData.class_id || null,
          gender: formData.gender || null,
          date_of_birth: formData.date_of_birth || null,
          blood_group: formData.blood_group || null,
          address: formData.address || null,
          parent_name: formData.parent_name.trim() || null,
          parent_phone: formData.parent_phone.trim() || null,
          parent_email: formData.parent_email.trim() || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 2: Upload all documents
      const totalDocs = ALL_DOCUMENT_TYPES.length;
      let uploaded = 0;
      const failedDocs: string[] = [];

      for (const docType of ALL_DOCUMENT_TYPES) {
        const file = documentFiles[docType];
        if (!file) continue;

        setUploadingDoc(DOCUMENT_TYPE_LABELS[docType as DocumentType]);

        try {
          const ext = file.name.split('.').pop();
          const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const filePath = `${student.id}/${docType}/${uniqueName}`;

          const { error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(filePath, file, { contentType: file.type });

          if (uploadError) throw uploadError;

          const { error: insertError } = await supabase
            .from('student_documents')
            .insert({
              student_id: student.id,
              document_type: docType as DocumentType,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              file_mime_type: file.type,
              uploaded_by: user.id,
            });

          if (insertError) throw insertError;
        } catch (err: any) {
          failedDocs.push(DOCUMENT_TYPE_LABELS[docType as DocumentType]);
          console.error(`Failed to upload ${docType}:`, err);
        }

        uploaded++;
        setUploadProgress(Math.round((uploaded / totalDocs) * 100));
      }

      // Step 3: Auto-create parent account
      let parentResult: ParentResult | null = null;
      if (formData.parent_email.trim()) {
        try {
          const { data: parentData, error: parentError } = await supabase.functions.invoke('create-parent', {
            body: {
              studentId: student.id,
              studentName: formData.full_name.trim(),
              studentAdmissionNumber: formData.admission_number.trim(),
              className: getClassName(),
              parentName: formData.parent_name.trim(),
              parentEmail: formData.parent_email.trim(),
              parentPhone: formData.parent_phone.trim(),
              loginUrl: window.location.origin + '/login',
            },
          });

          if (parentError) {
            console.error('Parent creation error:', parentError);
            toast.warning('Student created but parent account creation failed', {
              description: parentError.message,
            });
          } else {
            parentResult = parentData as ParentResult;
          }
        } catch (err) {
          console.error('Parent creation exception:', err);
        }
      }

      // Log action
      try {
        await supabase.from('super_admin_activity_log' as any).insert({
          performed_by_user_id: user?.id,
          performed_by_name: 'Admin',
          performed_by_role: 'principal',
          action_type: 'CREATE',
          module: 'Students',
          record_affected: `Student: ${formData.full_name.trim()}, Admission No: ${formData.admission_number.trim()}`,
          ip_address: 'N/A',
        });
      } catch (_) { /* non-critical */ }

      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-documents'] });

      // Show success modal instead of closing
      setCreatedStudentInfo({
        fullName: formData.full_name.trim(),
        admissionNumber: formData.admission_number.trim(),
        className: getClassName(),
        parentEmail: formData.parent_email.trim(),
        parentResult,
      });
      setShowSuccessModal(true);

    } catch (err: any) {
      toast.error('Failed to create student', { description: err.message });
    } finally {
      setIsSubmitting(false);
      setUploadingDoc(null);
      setUploadProgress(0);
    }
  };

  const downloadCredentialsCard = () => {
    if (!createdStudentInfo?.parentResult?.isNewParent) return;
    const info = createdStudentInfo;
    const pr = info.parentResult!;

    const content = `
==========================================
       SMARTSCHOOL - PARENT PORTAL
       LOGIN CREDENTIALS CARD
==========================================

Student Name:    ${info.fullName}
Admission No:    ${info.admissionNumber}
Class:           ${info.className}

------------------------------------------
         LOGIN DETAILS
------------------------------------------

Login Email:     ${pr.email}
Default Password: ${pr.defaultPassword}
Login URL:       ${window.location.origin}/login

------------------------------------------
⚠️ IMPORTANT: Please change your password
   on first login for security.
------------------------------------------

Date of Issue:   ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

==========================================
    SmartSchool ERP System
==========================================
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parent_credentials_${info.admissionNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Credentials card downloaded!');
  };

  const handleCreateAnother = () => {
    setShowSuccessModal(false);
    setCreatedStudentInfo(null);
    resetForm();
  };

  const handleCloseAll = () => {
    setShowSuccessModal(false);
    setCreatedStudentInfo(null);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({
      full_name: '', admission_number: '', class_id: '', gender: '',
      date_of_birth: '', blood_group: '', address: '',
      parent_name: '', parent_phone: '', parent_email: '',
    });
    setDocumentFiles(Object.fromEntries(ALL_DOCUMENT_TYPES.map(dt => [dt, null])));
    setDocErrors({});
    setErrors({});
    setStep(1);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      resetForm();
      setShowSuccessModal(false);
      setCreatedStudentInfo(null);
    }
    onOpenChange(o);
  };

  const selectedDocCount = Object.values(documentFiles).filter(Boolean).length;

  // Success Modal
  if (showSuccessModal && createdStudentInfo) {
    const info = createdStudentInfo;
    const pr = info.parentResult;
    const isNewParent = pr?.isNewParent ?? false;

    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">Student Created Successfully</h2>

            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Student Name</span>
                <span className="font-medium">{info.fullName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Admission No</span>
                <span className="font-medium">{info.admissionNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Class</span>
                <span className="font-medium">{info.className}</span>
              </div>
            </div>

            {isNewParent ? (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-left space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Parent Account Created</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Credentials sent to <strong>{pr?.email}</strong>
                </p>
              </div>
            ) : pr ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                <p className="text-sm text-amber-800">
                  {pr.message || `Linked to existing parent account. No new credentials created.`}
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-2">
              {isNewParent && (
                <Button variant="outline" onClick={downloadCredentialsCard} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Parent Credentials Card
                </Button>
              )}
              <Button variant="gradient" onClick={handleCreateAnother} className="w-full">
                Create Another Student
              </Button>
              <Button variant="ghost" onClick={handleCloseAll} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            Add New Student — Step {step} of 2
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Fill in student and parent details' : 'Upload all required documents'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-2">
          <div className={cn('h-1.5 flex-1 rounded-full', step >= 1 ? 'bg-primary' : 'bg-muted')} />
          <div className={cn('h-1.5 flex-1 rounded-full', step >= 2 ? 'bg-primary' : 'bg-muted')} />
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {/* Personal Information */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Student full name"
                  className={cn('mt-1.5', errors.full_name && 'border-destructive')}
                />
                {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <Label>Admission Number <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.admission_number}
                  onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                  placeholder="e.g., STU001"
                  className={cn('mt-1.5', errors.admission_number && 'border-destructive')}
                />
                {errors.admission_number && <p className="text-xs text-destructive mt-1">{errors.admission_number}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Class <span className="text-destructive">*</span></Label>
                <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                  <SelectTrigger className={cn('mt-1.5', errors.class_id && 'border-destructive')}>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.section && `- ${cls.section}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.class_id && <p className="text-xs text-destructive mt-1">{errors.class_id}</p>}
              </div>
              <div>
                <Label>Gender <span className="text-destructive">*</span></Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger className={cn('mt-1.5', errors.gender && 'border-destructive')}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-destructive mt-1">{errors.gender}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className={cn('mt-1.5', errors.date_of_birth && 'border-destructive')}
                />
                {errors.date_of_birth && <p className="text-xs text-destructive mt-1">{errors.date_of_birth}</p>}
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select value={formData.blood_group} onValueChange={(v) => setFormData({ ...formData, blood_group: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Student address"
                className="mt-1.5"
              />
            </div>

            {/* Parent Information */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Parent / Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Parent Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="Parent/Guardian name"
                  className={cn('mt-1.5', errors.parent_name && 'border-destructive')}
                />
                {errors.parent_name && <p className="text-xs text-destructive mt-1">{errors.parent_name}</p>}
              </div>
              <div>
                <Label>Parent Phone <span className="text-destructive">*</span></Label>
                <Input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  placeholder="10-digit number"
                  className={cn('mt-1.5', errors.parent_phone && 'border-destructive')}
                />
                {errors.parent_phone && <p className="text-xs text-destructive mt-1">{errors.parent_phone}</p>}
              </div>
            </div>
            <div>
              <Label>Parent Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={formData.parent_email}
                onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                placeholder="parent@example.com"
                className={cn('mt-1.5', errors.parent_email && 'border-destructive')}
              />
              {errors.parent_email && <p className="text-xs text-destructive mt-1">{errors.parent_email}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext} variant="gradient">
                Next: Upload Documents
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                All 8 documents are required. Accepted: PDF, JPG, PNG (max 5MB each)
              </p>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                {selectedDocCount}/{ALL_DOCUMENT_TYPES.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_DOCUMENT_TYPES.map((docType) => {
                const file = documentFiles[docType];
                const error = docErrors[docType];
                const label = DOCUMENT_TYPE_LABELS[docType as DocumentType];

                return (
                  <div
                    key={docType}
                    className={cn(
                      'border rounded-lg p-3 transition-colors',
                      file ? 'border-primary/40 bg-primary/5' : error ? 'border-destructive/40 bg-destructive/5' : 'border-border'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium">
                        {label} <span className="text-destructive">*</span>
                      </Label>
                      {file && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>

                    {file ? (
                      <div className="flex items-center gap-2">
                        {file.type.startsWith('image/') ? (
                          <Image className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs truncate flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleFileSelect(docType, null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border border-dashed border-muted-foreground/30 rounded p-2 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRefs.current[docType]?.click()}
                      >
                        <Upload className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Click to upload</p>
                        <input
                          ref={(el) => { fileInputRefs.current[docType] = el; }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            handleFileSelect(docType, f);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 text-destructive" />
                        <p className="text-xs text-destructive">{error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isSubmitting && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {uploadingDoc ? `Uploading: ${uploadingDoc}...` : 'Creating student...'}
                  </span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                Back
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} variant="gradient" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Student & Upload Documents
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
