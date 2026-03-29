import { useState, useRef } from 'react';
import { StudentDocumentsPanel } from '@/components/documents/StudentDocumentsPanel';
import { StudentAvatar } from '@/components/common/StudentAvatar';
import { StudentCreateDialog } from '@/components/students/StudentCreateDialog';
import { useStudents, useClasses } from '@/hooks/useStudents';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminActionLogger } from '@/hooks/useAdminActionLogger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search, 
  Plus, 
  Filter,
  MoreHorizontal,
  Phone,
  GraduationCap,
  Loader2,
  Users,
  Upload,
  Download,
  FileSpreadsheet,
  Mail,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  FolderOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDateIndian } from '@/lib/dateUtils';
import { ClassManagement } from '@/components/classes/ClassManagement';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
export default function Students() {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [documentsStudent, setDocumentsStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    admission_number: '',
    class_id: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    gender: '',
    date_of_birth: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { students, isLoading, createStudent, updateStudent, deleteStudent } = useStudents(selectedClass);
  const { classes } = useClasses();
  const { logAction } = useAdminActionLogger();

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    let profilePhotoUrl = selectedStudent.profile_photo_url;

    // Upload photo if selected
    if (photoFile) {
      setUploadingPhoto(true);
      try {
        const ext = photoFile.name.split('.').pop();
        const filePath = `${selectedStudent.id}/profile.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('student-profile-photos')
          .upload(filePath, photoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from('student-profile-photos')
          .getPublicUrl(filePath);
        profilePhotoUrl = urlData.publicUrl;
      } catch (err: any) {
        toast.error('Photo upload failed', { description: err.message });
        setUploadingPhoto(false);
        return;
      }
      setUploadingPhoto(false);
    }
    
    await updateStudent.mutateAsync({
      id: selectedStudent.id,
      ...formData,
      class_id: formData.class_id || null,
      date_of_birth: formData.date_of_birth || null,
      profile_photo_url: profilePhotoUrl,
    });
    logAction({
      actionType: 'UPDATE',
      module: 'Students',
      recordAffected: `Student: ${formData.full_name}, Admission No: ${formData.admission_number}`,
    });
    setIsEditDialogOpen(false);
    setSelectedStudent(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    resetForm();
  };

  const handleDelete = async (id: string, studentName: string) => {
    const confirmMessage = `⚠️ PERMANENT DELETION WARNING ⚠️\n\nAre you sure you want to permanently delete ${studentName}?\n\nThis action will:\n• Remove the student from all records\n• Delete all attendance history\n• Remove from all class rosters\n• Cannot be undone\n\nType 'DELETE' to confirm:`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput === 'DELETE') {
      await deleteStudent.mutateAsync(id);
      logAction({
        actionType: 'DELETE',
        module: 'Students',
        recordAffected: `Student: ${studentName}`,
      });
    } else if (userInput !== null) {
      alert('Deletion cancelled. Please type DELETE exactly to confirm.');
    }
  };

  const handleViewProfile = (student: any) => {
    setSelectedStudent(student);
    setIsViewProfileOpen(true);
  };

  const handleEditProfile = (student: any) => {
    setSelectedStudent(student);
    setFormData({
      full_name: student.full_name || '',
      admission_number: student.admission_number || '',
      class_id: student.class_id || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
      gender: student.gender || '',
      date_of_birth: student.date_of_birth || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleViewAttendance = (student: any) => {
    setSelectedStudent(student);
    setIsAttendanceDialogOpen(true);
  };

  const handleViewDocuments = (student: any) => {
    setDocumentsStudent(student);
    setIsDocumentsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      admission_number: '',
      class_id: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      gender: '',
      date_of_birth: '',
    });
  };

  const handleFileImport = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    setImportErrors([]);

    try {
      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            await processImportData(results.data);
          },
          error: (error) => {
            setImportErrors([`CSV parsing error: ${error.message}`]);
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        await processImportData(jsonData);
      } else {
        setImportErrors(['Unsupported file format. Please use CSV or Excel files.']);
      }
    } catch (error) {
      setImportErrors([`Import error: ${error.message}`]);
    }
  };

  const processImportData = async (data: any[]) => {
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        if (!row.full_name || !row.admission_number) {
          errors.push(`Row ${rowNum}: Missing required fields (full_name or admission_number)`);
          continue;
        }

        let classId = null;
        if (row.class_name) {
          const matchingClass = classes.find(c => 
            c.name === row.class_name && (!row.section || c.section === row.section)
          );
          classId = matchingClass?.id || null;
        }

        await createStudent.mutateAsync({
          full_name: row.full_name.trim(),
          admission_number: row.admission_number.trim(),
          class_id: classId,
          parent_name: row.parent_name?.trim() || '',
          parent_phone: row.parent_phone?.toString().trim() || '',
          parent_email: row.parent_email?.trim() || '',
          gender: row.gender?.toLowerCase() || '',
          date_of_birth: row.date_of_birth || null,
        });

        successCount++;
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      setImportErrors(errors);
    } else {
      setImportErrors([]);
      setIsImportDialogOpen(false);
      alert(`Successfully imported ${successCount} students!`);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        full_name: 'Rahul Kumar',
        admission_number: 'STU001',
        class_name: 'Class 10',
        section: 'A',
        gender: 'male',
        date_of_birth: '2010-05-15',
        parent_name: 'Rajesh Kumar',
        parent_phone: '9876543210',
        parent_email: 'rajesh.kumar@example.com'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
    XLSX.writeFile(wb, 'students_template.xlsx');
  };

  const downloadSampleCSV = () => {
    const csvContent = `full_name,admission_number,class_name,section,gender,date_of_birth,parent_name,parent_phone,parent_email
Rahul Kumar,STU001,Class 10,A,male,2010-05-15,Rajesh Kumar,9876543210,rajesh.kumar@example.com
Priya Sharma,STU002,Class 10,A,female,2010-08-22,Amit Sharma,9876543211,amit.sharma@example.com
Arjun Patel,STU003,Class 9,B,male,2011-03-10,Suresh Patel,9876543212,suresh.patel@example.com`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'students_sample.csv';
    link.click();
  };

  const exportStudentsToCSV = () => {
    if (filteredStudents.length === 0) {
      alert('No students to export!');
      return;
    }

    const headers = [
      'Full Name',
      'Admission Number',
      'Class',
      'Section',
      'Gender',
      'Date of Birth',
      'Parent Name',
      'Parent Phone',
      'Parent Email',
      'Status'
    ];

    const csvData = filteredStudents.map((student: any) => [
      student.full_name,
      student.admission_number,
      student.classes?.name || '',
      student.classes?.section || '',
      student.gender || '',
      student.date_of_birth || '',
      student.parent_name || '',
      student.parent_phone || '',
      student.parent_email || '',
      student.is_active ? 'Active' : 'Inactive'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Students exported successfully!', {
      description: `Exported ${filteredStudents.length} students to CSV`,
    });
    logAction({ actionType: 'EXPORT', module: 'Reports', recordAffected: `Exported ${filteredStudents.length} students to CSV` });
  };

  const exportStudentsToExcel = () => {
    if (filteredStudents.length === 0) {
      alert('No students to export!');
      return;
    }

    const exportData = filteredStudents.map((student: any) => ({
      'Full Name': student.full_name,
      'Admission Number': student.admission_number,
      'Class': student.classes?.name || '',
      'Section': student.classes?.section || '',
      'Gender': student.gender || '',
      'Date of Birth': student.date_of_birth || '',
      'Parent Name': student.parent_name || '',
      'Parent Phone': student.parent_phone || '',
      'Parent Email': student.parent_email || '',
      'Status': student.is_active ? 'Active' : 'Inactive'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    
    // Auto-size columns
    const maxWidth = 30;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('Students exported successfully!', {
      description: `Exported ${filteredStudents.length} students to Excel`,
    });
    logAction({ actionType: 'EXPORT', module: 'Reports', recordAffected: `Exported ${filteredStudents.length} students to Excel` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Students & Classes</h1>
          <p className="text-muted-foreground mt-1">Manage student records and class information</p>
        </div>
      </div>

      {/* View Profile Dialog */}
      <Dialog open={isViewProfileOpen} onOpenChange={setIsViewProfileOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Student Profile</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <StudentAvatar
                  photoUrl={selectedStudent.profile_photo_url}
                  name={selectedStudent.full_name}
                  size="lg"
                />
                <div>
                  <h3 className="text-xl font-semibold">{selectedStudent.full_name}</h3>
                  <p className="text-muted-foreground">Adm. No: {selectedStudent.admission_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">
                    {selectedStudent.classes 
                      ? `${selectedStudent.classes.name} ${selectedStudent.classes.section ? `- ${selectedStudent.classes.section}` : ''}`
                      : 'Not assigned'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{selectedStudent.gender || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {selectedStudent.date_of_birth 
                      ? formatDateIndian(new Date(selectedStudent.date_of_birth))
                      : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    selectedStudent.is_active 
                      ? 'bg-success/10 text-success' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {selectedStudent.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h4 className="font-semibold">Parent Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedStudent.parent_name || '-'}</p>
                    </div>
                  </div>
                  {selectedStudent.parent_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedStudent.parent_phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedStudent.parent_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedStudent.parent_email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Parent Account Section */}
              <div className="pt-4 border-t space-y-4">
                <h4 className="font-semibold">Parent Account</h4>
                <ParentAccountSection student={selectedStudent} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Student Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Photo Upload */}
            <div className="flex items-center gap-4">
              <div className="relative cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <StudentAvatar
                  photoUrl={photoPreview || selectedStudent?.profile_photo_url}
                  name={formData.full_name || 'S'}
                  size="lg"
                />
                <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Upload className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP • Max 2MB</p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Only JPG, PNG, WebP allowed'); return; }
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }}
                />
                {photoFile && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 text-destructive" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Admission Number *</Label>
                <Input
                  required
                  value={formData.admission_number}
                  onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Class</Label>
                <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                  <SelectTrigger className="mt-1.5">
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
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="mt-1.5"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Parent Name</Label>
                <Input
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Parent Phone</Label>
                <Input
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Parent Email</Label>
              <Input
                type="email"
                value={formData.parent_email}
                onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                className="mt-1.5"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStudent} variant="gradient" disabled={updateStudent.isPending}>
                {updateStudent.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Attendance Record</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.classes 
                      ? `${selectedStudent.classes.name} ${selectedStudent.classes.section ? `- ${selectedStudent.classes.section}` : ''}`
                      : 'No class assigned'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Admission No.</p>
                  <p className="font-mono font-medium">{selectedStudent.admission_number}</p>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Days</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                  <p className="text-2xl font-bold text-success">0</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                  <p className="text-2xl font-bold text-destructive">0</p>
                </div>
              </div>

              {/* Attendance Records */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3">
                  <h4 className="font-semibold">Recent Attendance</h4>
                </div>
                <div className="p-4 text-center text-muted-foreground">
                  No attendance records found for this student.
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tabs for Principal */}
      {role === 'principal' ? (
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsList 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              isCreateDialogOpen={isCreateDialogOpen}
              setIsCreateDialogOpen={setIsCreateDialogOpen}
              isImportDialogOpen={isImportDialogOpen}
              setIsImportDialogOpen={setIsImportDialogOpen}
              importErrors={importErrors}
              students={students}
              filteredStudents={filteredStudents}
              classes={classes}
              handleDelete={handleDelete}
              handleViewProfile={handleViewProfile}
              handleEditProfile={handleEditProfile}
              handleViewAttendance={handleViewAttendance}
              handleViewDocuments={handleViewDocuments}
              handleFileImport={handleFileImport}
              downloadTemplate={downloadTemplate}
              downloadSampleCSV={downloadSampleCSV}
              exportStudentsToCSV={exportStudentsToCSV}
              exportStudentsToExcel={exportStudentsToExcel}
            />
          </TabsContent>

          <TabsContent value="classes">
            <ClassManagement />
          </TabsContent>
        </Tabs>
      ) : (
        <StudentsList 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          isCreateDialogOpen={isCreateDialogOpen}
          setIsCreateDialogOpen={setIsCreateDialogOpen}
          isImportDialogOpen={isImportDialogOpen}
          setIsImportDialogOpen={setIsImportDialogOpen}
          importErrors={importErrors}
          students={students}
          filteredStudents={filteredStudents}
          classes={classes}
          handleDelete={handleDelete}
          handleViewProfile={handleViewProfile}
          handleEditProfile={handleEditProfile}
          handleViewAttendance={handleViewAttendance}
          handleViewDocuments={handleViewDocuments}
          handleFileImport={handleFileImport}
          downloadTemplate={downloadTemplate}
          downloadSampleCSV={downloadSampleCSV}
          exportStudentsToCSV={exportStudentsToCSV}
          exportStudentsToExcel={exportStudentsToExcel}
        />
      )}

      {/* Documents Panel */}
      {documentsStudent && (
        <StudentDocumentsPanel
          open={isDocumentsOpen}
          onOpenChange={(open) => {
            setIsDocumentsOpen(open);
            if (!open) setDocumentsStudent(null);
          }}
          studentId={documentsStudent.id}
          studentName={documentsStudent.full_name}
        />
      )}
    </div>
  );
}

// Extract students list to a separate component
function StudentsList({
  searchQuery,
  setSearchQuery,
  selectedClass,
  setSelectedClass,
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  isImportDialogOpen,
  setIsImportDialogOpen,
  importErrors,
  students,
  filteredStudents,
  classes,
  handleDelete,
  handleViewProfile,
  handleEditProfile,
  handleViewAttendance,
  handleViewDocuments,
  handleFileImport,
  downloadTemplate,
  downloadSampleCSV,
  exportStudentsToCSV,
  exportStudentsToExcel,
}: any) {
  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Students
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportStudentsToCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportStudentsToExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Templates
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={downloadSampleCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Sample CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadTemplate}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import Students
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Import Students</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-2">Upload CSV or Excel file</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supported formats: .csv, .xlsx, .xls
                </p>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileImport(file);
                  }}
                  className="max-w-xs mx-auto"
                />
              </div>

              {importErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium mb-2">Import Errors:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {importErrors.slice(0, 10).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {importErrors.length > 10 && (
                        <li>... and {importErrors.length - 10} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Required Columns:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>full_name</strong> (required)</li>
                  <li>• <strong>admission_number</strong> (required)</li>
                  <li>• class_name, section, gender, date_of_birth</li>
                  <li>• parent_name, parent_phone, parent_email</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="gradient" className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Student
        </Button>

        <StudentCreateDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          classes={classes}
        />
      </div>

      {/* Filters */}
      <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-focus"
            />
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.section && `- ${cls.section}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-card overflow-hidden animate-fade-up" style={{ animationDelay: '200ms' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Admission No.</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No students found. Add your first student to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student: any, index: number) => (
                <TableRow 
                  key={student.id} 
                  className="table-row-hover opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50 + 300}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <StudentAvatar
                        photoUrl={student.profile_photo_url}
                        name={student.full_name}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-foreground">{student.full_name}</p>
                        {student.date_of_birth && (
                          <p className="text-xs text-muted-foreground">
                            DOB: {formatDateIndian(new Date(student.date_of_birth))}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{student.admission_number}</span>
                  </TableCell>
                  <TableCell>
                    {student.classes ? (
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {student.classes.name} {student.classes.section && `- ${student.classes.section}`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground">{student.parent_name || '-'}</p>
                      {student.parent_phone && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{student.parent_phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                      student.is_active 
                        ? 'bg-success/10 text-success' 
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(student)}>
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProfile(student)}>
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewAttendance(student)}>
                          View Attendance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDocuments(student)}>
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Documents
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(student.id, student.full_name)}
                        >
                          Permanently Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredStudents.length}</span> of{' '}
          <span className="font-medium text-foreground">{students.length}</span> students
        </p>
      </div>
    </div>
  )
}

function ParentAccountSection({ student }: { student: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const [parentInfo, setParentInfo] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  const checkParent = async () => {
    if (!student.parent_email || checked) return;
    setChecked(true);
    try {
      const { data } = await supabase
        .from('parents')
        .select('*')
        .eq('email', student.parent_email.toLowerCase())
        .maybeSingle();
      setParentInfo(data);
    } catch {}
  };

  if (!checked) {
    checkParent();
  }

  const handleResendEmail = async () => {
    if (!student.parent_email) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-parent', {
        body: {
          studentId: student.id,
          studentName: student.full_name,
          studentAdmissionNumber: student.admission_number,
          className: student.classes?.name || '',
          parentName: student.parent_name || '',
          parentEmail: student.parent_email,
          parentPhone: student.parent_phone || '',
          loginUrl: window.location.origin + '/login',
        },
      });
      if (error) throw error;
      toast.success('Credentials email sent!');
    } catch (err: any) {
      toast.error('Failed to send email', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCard = () => {
    const content = `
==========================================
       SMARTSCHOOL - PARENT PORTAL
       LOGIN CREDENTIALS CARD
==========================================

Student Name:    ${student.full_name}
Admission No:    ${student.admission_number}
Class:           ${student.classes?.name || 'N/A'}

Login Email:     ${student.parent_email}
Login URL:       ${window.location.origin}/login

Note: Password was sent via email.
Please contact admin if you need a reset.

Date:            ${new Date().toLocaleDateString('en-IN')}
==========================================
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parent_credentials_${student.admission_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Credentials card downloaded!');
  };

  if (!student.parent_email) {
    return <p className="text-sm text-muted-foreground">No parent email configured.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm"><span className="text-muted-foreground">Email:</span> {student.parent_email}</p>
          <p className="text-sm"><span className="text-muted-foreground">Name:</span> {student.parent_name || '-'}</p>
        </div>
        <span className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium',
          parentInfo ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        )}>
          {parentInfo ? 'Active' : 'Not Created'}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleResendEmail} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />}
          Resend Credentials
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadCard}>
          <Download className="w-3 h-3 mr-1" />
          Download Card
        </Button>
      </div>
    </div>
  );
}
