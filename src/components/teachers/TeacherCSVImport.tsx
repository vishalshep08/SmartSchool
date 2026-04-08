import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Download,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateTeacher, CreatedTeacher, exportTeachersToCSV } from '@/hooks/useCreateTeacher';

interface ImportResult {
  success: boolean;
  row: number;
  name: string;
  email: string;
  error?: string;
  teacher?: CreatedTeacher;
}

interface TeacherCSVImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherCSVImport({ open, onOpenChange }: TeacherCSVImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [createdTeachers, setCreatedTeachers] = useState<CreatedTeacher[]>([]);
  const { createTeacher } = useCreateTeacher();

  const downloadTemplate = () => {
    const template = `Full Name,Email,Phone,Employee ID,Subject,Qualification,Experience Years,Salary,Joining Date
John Doe,john@example.com,9876543210,EMP001,Mathematics,M.Sc. B.Ed,5,35000,2024-01-15
Jane Smith,jane@example.com,9876543211,EMP002,English,M.A. B.Ed,3,32000,2024-02-01`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResults([]);
    setCreatedTeachers([]);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error('CSV file must have a header row and at least one data row');
        setIsProcessing(false);
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
      const dataRows = rows.slice(1);

      const newResults: ImportResult[] = [];
      const newCreatedTeachers: CreatedTeacher[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // Account for header and 0-index

        const getValue = (key: string) => {
          const idx = headers.indexOf(key);
          return idx >= 0 ? row[idx] : '';
        };

        const fullName = getValue('full_name');
        const email = getValue('email');
        const phone = getValue('phone');
        const employeeId = getValue('employee_id');
        const subject = getValue('subject');
        const qualification = getValue('qualification');
        const experienceYears = parseInt(getValue('experience_years')) || 0;
        const salary = parseFloat(getValue('salary')) || 0;
        const joiningDate = getValue('joining_date');

        // Validation
        if (!fullName || !email || !subject) {
          newResults.push({
            success: false,
            row: rowNum,
            name: fullName || 'Unknown',
            email: email || 'Unknown',
            error: 'Missing required fields (Full Name, Email, or Subject)',
          });
          continue;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          newResults.push({
            success: false,
            row: rowNum,
            name: fullName,
            email,
            error: 'Invalid email format',
          });
          continue;
        }

        try {
          const teacher = await createTeacher.mutateAsync({
            fullName,
            email,
            phone: phone || undefined,
            employeeId: employeeId || undefined,
            subject,
            qualification: qualification || undefined,
            experienceYears,
            salaryAmount: salary,
            joiningDate: joiningDate || new Date().toISOString().split('T')[0],
          });

          newResults.push({
            success: true,
            row: rowNum,
            name: fullName,
            email,
            teacher,
          });
          newCreatedTeachers.push(teacher);
        } catch (error: any) {
          newResults.push({
            success: false,
            row: rowNum,
            name: fullName,
            email,
            error: error.message || 'Failed to create teacher',
          });
        }
      }

      setResults(newResults);
      setCreatedTeachers(newCreatedTeachers);

      const successCount = newResults.filter(r => r.success).length;
      const failCount = newResults.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} teacher(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} teacher(s)`);
      }
    } catch (error: any) {
      toast.error('Failed to process CSV file: ' + error.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportCredentials = () => {
    if (createdTeachers.length > 0) {
      exportTeachersToCSV(createdTeachers);
      toast.success('Credentials exported to CSV');
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Import Teachers from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import teachers. A secure password will be generated for each teacher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Template Download */}
          <Alert>
            <FileText className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Download the CSV template to see the required format</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Template
              </Button>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing CSV file...</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  Click to upload or drag and drop
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select CSV File
                </Button>
              </>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="font-medium">{successCount} Success</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="font-medium">{failCount} Failed</span>
                </div>
                {createdTeachers.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportCredentials}
                    className="ml-auto gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Credentials
                  </Button>
                )}
              </div>

              {/* Detailed Results */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {results.map((result, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.success ? 'bg-success/10' : 'bg-destructive/10'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        Row {result.row}: {result.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.email}
                      </p>
                    </div>
                    {!result.success && (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
