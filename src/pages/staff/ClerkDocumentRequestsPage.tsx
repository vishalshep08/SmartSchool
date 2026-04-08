import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, FileText, CheckCircle, FileSignature, Upload, FileCheck, ArrowRight } from 'lucide-react';
import { formatDateIndian } from '@/lib/dateUtils';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';

export default function ClerkDocumentRequestsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'pending';
  const { schoolName, appSubtitle } = useSchoolSettings();
  const appFullName = [schoolName, appSubtitle].filter(Boolean).join(' ');

  const [tab, setTab] = useState(initialTab);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);

  // Dialog states
  const [forwardDialog, setForwardDialog] = useState<any>(null);
  const [infoDialog, setInfoDialog] = useState<any>(null);
  const [issueDialog, setIssueDialog] = useState<any>(null);

  const [clerkNote, setClerkNote] = useState('');
  const [parentRequestInfo, setParentRequestInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Issuing states
  const [issueMethod, setIssueMethod] = useState<'auto' | 'upload'>('auto');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchEmployeeAndRequests = async () => {
      if (!user?.id) return;
      try {
        const { data: emp } = await (supabase as any)
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (emp && !cancelled) {
          setEmployeeDetails(emp);
          fetchRequests(emp.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEmployeeAndRequests();
    return () => { cancelled = true; };
  }, [user?.id]);

  const fetchRequests = async (empId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('document_requests')
        .select(`
          *,
          students (
            full_name,
            admission_number,
            roll_number,
            class_id,
            classes (name, section)
          ),
          parents (
            name,
            email,
            contact_number
          )
        `)
        .eq('assigned_clerk_id', empId)
        .order('requested_at', { ascending: false });

      console.log('[CLERK PAGE] Employee record request id:', empId);
      console.log('[CLERK PAGE] Requests:', data);
      console.log('[CLERK PAGE] Error:', error);

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load document requests');
    } finally {
      setLoading(false);
    }
  };

  const handleForwardToPrincipal = async () => {
    if (!forwardDialog) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('document_requests')
        .update({
          current_stage: 'principal_review',
          forwarded_to_principal_at: new Date().toISOString(),
          forwarded_by_clerk_id: employeeDetails.id,
          clerk_note: clerkNote.trim() || null,
        })
        .eq('id', forwardDialog.id);

      if (error) throw error;

      await (supabase as any).from('document_request_history').insert({
        document_request_id: forwardDialog.id,
        stage_from: 'clerk_review',
        stage_to: 'principal_review',
        action_taken_by_user_id: user?.id,
        action_taken_by_name: employeeDetails.full_name,
        action_taken_by_role: 'clerk',
        note: clerkNote.trim() || null,
      });

      toast.success('Request forwarded to Principal');
      setForwardDialog(null);
      setClerkNote('');
      fetchRequests(employeeDetails.id);
    } catch (error) {
      console.error('Error forwarding:', error);
      toast.error('Failed to forward request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!infoDialog || !parentRequestInfo.trim()) return;
    setSubmitting(true);
    try {
      // In a real app, send actual notification or email here
      await (supabase as any).from('notifications').insert({
        user_id: infoDialog.parents?.user_id || infoDialog.parent_id,
        title: `Information requested for ${infoDialog.document_type}`,
        message: `Clerk requires more information: ${parentRequestInfo}`,
        type: 'document_info_request'
      });

      toast.success('Requested more info from parent');
      setInfoDialog(null);
      setParentRequestInfo('');
    } catch (error) {
      console.error('Error asking for info:', error);
      toast.error('Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const generateAndUploadDocument = async (request: any, studentData: any, currentClerkName: string) => {
    try {
      // STEP 1: Generate real PDF using jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const docSchoolName = schoolName;
      const pageWidth = doc.internal.pageSize.getWidth();
      const today = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(docSchoolName, pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Document', pageWidth / 2, 28, { align: 'center' });

      // Divider line
      doc.setLineWidth(0.5);
      doc.line(15, 32, pageWidth - 15, 32);

      // Document title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text((request.document_type || 'Document').toUpperCase(), pageWidth / 2, 45, { align: 'center' });

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${today}`, pageWidth - 15, 55, { align: 'right' });

      // Student details
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Details:', 15, 68);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // Add safety fallbacks for each field
      const studentName = studentData?.full_name || 'N/A';
      const admissionNo = studentData?.admission_number || 'N/A';
      const rollNo = studentData?.roll_number || 'N/A';
      const className = studentData?.classes?.name || ''; // 'name' not 'class_name'
      const section = studentData?.classes?.section || '';
      const grade = studentData?.classes?.grade || '';
      const fullClass = className
        ? `${className}${section ? ' ' + section : ''}${grade ? ' (Grade ' + grade + ')' : ''}`
        : 'N/A';
      const dob = studentData?.date_of_birth || '';

      console.log('[PDF GEN] Student:', { studentName, admissionNo, rollNo, fullClass });

      const details = [
        `Name:          ${studentName}`,
        `Admission No:  ${admissionNo}`,
        `Class:         ${fullClass}`,
        `Roll No:       ${rollNo}`,
      ];

      details.forEach((line: string, i: number) => {
        doc.text(line, 15, 76 + (i * 7));
      });

      // Pass correct fields to getDocumentBody
      const bodyText = getDocumentBody(
        request.document_type,
        {
          full_name: studentName,
          admission_number: admissionNo,
          classes: {
            name: className,
            section: section,
          },
        },
        request.purpose || '',
        request.principal_note || ''
      );

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const splitBody = doc.splitTextToSize(bodyText, pageWidth - 30);
      doc.text(splitBody, 15, 110);

      // Principal signature
      if (request.principal_signature_data) {
        try {
          doc.addImage(
            request.principal_signature_data,
            'PNG',
            pageWidth - 70,
            220,
            55,
            20
          );
        } catch (e) {
          console.warn('Signature image failed:', e);
        }
      }

      doc.setFontSize(10);
      doc.text('Principal Signature', pageWidth - 60, 244);
      doc.text(`Verified by: ${currentClerkName}`, 15, 244);
      doc.text(`Issued on: ${today}`, 15, 250);

      // Footer line
      doc.setLineWidth(0.3);
      doc.line(15, 255, pageWidth - 15, 255);
      doc.setFontSize(8);
      doc.text(
        'This is a computer-generated document.',
        pageWidth / 2, 260,
        { align: 'center' }
      );

      // STEP 2: Convert PDF to blob
      const pdfBlob = doc.output('blob');
      const safeDocType = request.document_type ? request.document_type.replace(/\\s+/g, '_') : 'Doc';
      const fileName = `${safeDocType}_${studentData?.admission_number || 'Unknown'}_${Date.now()}.pdf`;

      // STEP 3: Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await (supabase as any).storage
        .from('documents')
        .upload(`issued/${fileName}`, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('[DOC UPLOAD] Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // STEP 4: Get the public URL
      const { data: urlData } = (supabase as any).storage
        .from('documents')
        .getPublicUrl(`issued/${fileName}`);

      return urlData.publicUrl;
    } catch (err) {
      console.error('[DOC GENERATE] Error:', err);
      throw err;
    }
  };

  const getDocumentBody = (docType: string, student: any, purpose: string, principalNote: string) => {
    const className = student?.classes?.name || '';
    const section = student?.classes?.section || '';
    const fullClass = className
      ? `${className}${section ? ' ' + section : ''}`
      : 'the respective class';

    const name = student?.full_name || 'the student';
    const admissionNo = student?.admission_number || 'N/A';

    switch (docType) {
      case 'Bonafide Certificate':
        return `This is to certify that ${name} (Admission No: ${admissionNo}) is a bonafide student of this institution, currently studying in Class ${fullClass}. This certificate is issued for the purpose of ${purpose || 'general use'}.${principalNote ? '\\n\\nNote: ' + principalNote : ''}`;

      case 'Leaving Certificate':
        return `This is to certify that ${name} (Admission No: ${admissionNo}) was a student of this institution in Class ${fullClass}. They have left the institution. This certificate is issued for the purpose of ${purpose || 'general use'}.${principalNote ? '\\n\\nNote: ' + principalNote : ''}`;

      case 'NOC':
        return `This institution has no objection to ${name} (Admission No: ${admissionNo}) of Class ${fullClass} for the purpose of ${purpose || 'general use'}.${principalNote ? '\\n\\nNote: ' + principalNote : ''}`;

      case 'Character Certificate':
        return `This is to certify that ${name} (Admission No: ${admissionNo}) of Class ${fullClass} has been a student of this institution and has maintained good character and conduct throughout their tenure.${principalNote ? '\\n\\nNote: ' + principalNote : ''}`;

      default:
        return `This certificate is issued for ${name} (Admission No: ${admissionNo}) of Class ${fullClass} for the purpose of ${purpose || 'general use'}.${principalNote ? '\\n\\nNote: ' + principalNote : ''}`;
    }
  };

  const handleIssueDocument = async () => {
    if (!issueDialog) return;
    setSubmitting(true);
    try {
      // STEP 1: Fetch complete student data including class details
      // This must happen BEFORE calling generateAndUploadDocument
      const { data: studentData, error: studentError } = await (supabase as any)
        .from('students')
        .select(`
          full_name,
          admission_number,
          roll_number,
          date_of_birth,
          class_id,
          classes (
            name,
            section,
            grade
          )
        `)
        .eq('id', issueDialog.student_id)
        .maybeSingle(); // use maybeSingle not single to avoid PGRST116 when 0 rows

      if (studentError || !studentData) {
        console.error('[ISSUE DOC] Student fetch error:', studentError);
        toast.error('Failed to fetch student details. Cannot generate document.');
        return;
      }

      console.log('[ISSUE DOC] Student data:', studentData);

      let documentUrl = '';

      if (issueMethod === 'upload') {
        if (!fileToUpload) {
          toast.error('Please upload a file first');
          setSubmitting(false);
          return;
        }

        const fileName = `manual_${(issueDialog.document_type || 'Doc').replace(/\\s+/g, '_')}_${studentData?.admission_number || 'Unknown'}_${Date.now()}.pdf`;
        const { error: uploadError } = await (supabase as any).storage
          .from('documents')
          .upload(`issued/${fileName}`, fileToUpload, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: urlData } = (supabase as any).storage
          .from('documents')
          .getPublicUrl(`issued/${fileName}`);

        documentUrl = urlData.publicUrl;
      } else {
        documentUrl = await generateAndUploadDocument(
          issueDialog,
          studentData,
          employeeDetails.full_name
        );
      }

      const { error } = await (supabase as any)
        .from('document_requests')
        .update({
          current_stage: 'ready',
          status: 'ready', // maintain backward compatibility if status col exists
          document_url: documentUrl,
          issued_by_clerk_id: employeeDetails.id,
          issued_at: new Date().toISOString(),
          ready_at: new Date().toISOString(),
        })
        .eq('id', issueDialog.id);

      if (error) throw error;

      await (supabase as any).from('document_request_history').insert({
        document_request_id: issueDialog.id,
        stage_from: 'clerk_issuing',
        stage_to: 'ready',
        action_taken_by_user_id: user?.id,
        action_taken_by_name: employeeDetails.full_name,
        action_taken_by_role: 'clerk',
      });

      await (supabase as any).from('notifications').insert({
        user_id: issueDialog.parents?.user_id || issueDialog.parent_id,
        title: `Document Ready: ${issueDialog.document_type}`,
        message: `Your requested document for ${issueDialog.students?.full_name} is now ready to download.`,
        type: 'document_ready'
      });

      toast.success('Document issued successfully');
      setIssueDialog(null);
      setFileToUpload(null);
      fetchRequests(employeeDetails.id);
    } catch (error: any) {
      console.error('Error issuing:', error);
      toast.error(`Failed to issue document: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequests = requests.filter(r => r.current_stage === 'clerk_review');
  const readyRequests = requests.filter(r => r.current_stage === 'clerk_issuing');
  const withPrincipal = requests.filter(r => r.current_stage === 'principal_review');
  const completed = requests.filter(r => ['ready', 'downloaded'].includes(r.current_stage));

  if (!employeeDetails || (employeeDetails.department !== 'Administration' && employeeDetails.designation !== 'Clerk')) {
    return (
      <div className="p-8 text-center bg-muted/30 rounded-lg border">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only Administration Clerks can manage document requests workflow.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Document Requests</h1>
          <p className="text-muted-foreground mt-1">Review, forward, and issue student and staff document requests.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-[600px] h-auto p-1">
          <TabsTrigger value="pending" className="py-2">
            Pending Review {pendingRequests.length > 0 && <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">{pendingRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ready" className="py-2">
            Ready to Issue {readyRequests.length > 0 && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">{readyRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="principal" className="py-2">
            With Principal
          </TabsTrigger>
          <TabsTrigger value="completed" className="py-2">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-lg border border-dashed">
              <FileText className="w-12 h-12 text-muted-foreground mb-3 mx-auto opacity-50" />
              <p className="font-medium">No pending requests</p>
            </div>
          ) : (
            pendingRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                onForward={() => { setForwardDialog(request); setClerkNote(''); }}
                onInfo={() => { setInfoDialog(request); setParentRequestInfo(''); }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="ready" className="mt-4 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : readyRequests.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-lg border border-dashed">
              <FileSignature className="w-12 h-12 text-muted-foreground mb-3 mx-auto opacity-50" />
              <p className="font-medium">No documents waiting to be issued</p>
            </div>
          ) : (
            readyRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                onIssue={() => { setIssueDialog(request); setIssueMethod('auto'); setFileToUpload(null); }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="principal" className="mt-4 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : withPrincipal.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-lg border border-dashed">
              <p className="font-medium text-muted-foreground">No requests currently with the Principal.</p>
            </div>
          ) : (
            withPrincipal.map(request => (
              <RequestCard key={request.id} request={request} readOnly />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : completed.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-lg border border-dashed">
              <p className="font-medium text-muted-foreground">No issued documents found.</p>
            </div>
          ) : (
            completed.map(request => (
              <RequestCard key={request.id} request={request} readOnly showDownload />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Forward to Principal Dialog */}
      <Dialog open={!!forwardDialog} onOpenChange={(open) => !open && setForwardDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward to Principal for Signature</DialogTitle>
            <DialogDescription>
              {forwardDialog && `Forwarding ${forwardDialog.document_type} for ${forwardDialog.students?.full_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm bg-muted/50 p-3 rounded-lg border border-border">
              <p className="font-medium text-foreground mb-1">Purpose provided by parent:</p>
              <p className="text-muted-foreground">{forwardDialog?.purpose}</p>
            </div>
            <div className="space-y-2">
              <Label>Add a note for the Principal (optional)</Label>
              <Textarea
                placeholder="E.g., All fee dues cleared. Ready for signature."
                value={clerkNote}
                onChange={(e) => setClerkNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardDialog(null)}>Cancel</Button>
            <Button onClick={handleForwardToPrincipal} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Forward to Principal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ask Parent for Info Dialog */}
      <Dialog open={!!infoDialog} onOpenChange={(open) => !open && setInfoDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request More Info from Parent</DialogTitle>
            <DialogDescription>Send a notification to the parent requesting clarification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What information do you need?</Label>
              <Textarea
                placeholder="E.g., Please clarify why you need this document..."
                value={parentRequestInfo}
                onChange={(e) => setParentRequestInfo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoDialog(null)}>Cancel</Button>
            <Button variant="secondary" onClick={handleRequestMoreInfo} disabled={submitting || !parentRequestInfo.trim()}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Document Dialog */}
      <Dialog open={!!issueDialog} onOpenChange={(open) => !open && setIssueDialog(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Issue Document to Parent</DialogTitle>
            <DialogDescription>
              {issueDialog && `Prepare ${issueDialog.document_type} for ${issueDialog.students?.full_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {issueDialog?.principal_note && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
                <span className="font-bold">Principal's Note:</span> {issueDialog.principal_note}
              </div>
            )}

            <Tabs value={issueMethod} onValueChange={(v) => setIssueMethod(v as 'auto' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auto">Auto-Generate PDF</TabsTrigger>
                <TabsTrigger value="upload">Upload Document</TabsTrigger>
              </TabsList>
              <TabsContent value="auto" className="p-4 bg-muted/30 border rounded-lg mt-2 min-h-[250px]">
                <div className="text-center mb-4">
                  <div className="font-bold text-lg mb-1 whitespace-pre-wrap">{issueDialog?.document_type?.toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground">Digital Document Preview</div>
                </div>
                <div className="text-sm space-y-3 bg-white p-4 border rounded shadow-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-bold text-base">{appFullName}</span>
                    <span className="text-muted-foreground">Date: {formatDateIndian(new Date())}</span>
                  </div>
                  <div className="text-center font-semibold underline my-2">
                    {issueDialog?.document_type?.toUpperCase()}
                  </div>
                  {/* Template content per document type */}
                  {issueDialog?.document_type === 'Bonafide Certificate' && (
                    <p>This is to certify that <strong>{issueDialog?.students?.full_name}</strong> (Admission No: {issueDialog?.students?.admission_number}) is a bonafide student of this institution, studying in Class <strong>{issueDialog?.students?.classes?.name} {issueDialog?.students?.classes?.section}</strong>. {issueDialog?.purpose && <>This certificate is issued for the purpose of: <em>{issueDialog.purpose}</em>.</>}</p>
                  )}
                  {issueDialog?.document_type === 'Leaving Certificate' && (
                    <p>This is to certify that <strong>{issueDialog?.students?.full_name}</strong> (Admission No: {issueDialog?.students?.admission_number}) was a student of this institution. They have left the institution. Last class studied: <strong>{issueDialog?.students?.classes?.name} {issueDialog?.students?.classes?.section}</strong>. Date of issue: {formatDateIndian(new Date())}.</p>
                  )}
                  {issueDialog?.document_type === 'NOC' && (
                    <p>No Objection Certificate. This is to certify that this institution has no objection to <strong>{issueDialog?.students?.full_name}</strong> of Class <strong>{issueDialog?.students?.classes?.name} {issueDialog?.students?.classes?.section}</strong>{issueDialog?.purpose ? ` for the purpose of: ${issueDialog.purpose}` : ''}.</p>
                  )}
                  {issueDialog?.document_type === 'Character Certificate' && (
                    <p>This is to certify that <strong>{issueDialog?.students?.full_name}</strong> of Class <strong>{issueDialog?.students?.classes?.name} {issueDialog?.students?.classes?.section}</strong> (Admission No: {issueDialog?.students?.admission_number}) has been a student of this institution and has maintained good character and conduct throughout their tenure here.</p>
                  )}
                  {!['Bonafide Certificate', 'Leaving Certificate', 'NOC', 'Character Certificate'].includes(issueDialog?.document_type) && (
                    <p>This is to certify that <strong>{issueDialog?.students?.full_name}</strong> is a student of this institution studying in Class <strong>{issueDialog?.students?.classes?.name} {issueDialog?.students?.classes?.section}</strong>.{issueDialog?.purpose && ` Purpose: ${issueDialog.purpose}.`}</p>
                  )}
                  {issueDialog?.principal_note && (
                    <p className="mt-2 italic text-muted-foreground">Note from Principal: {issueDialog.principal_note}</p>
                  )}
                  <div className="mt-8 flex justify-between items-end">
                    <div>
                      <div className="font-semibold text-xs text-muted-foreground">Verified By</div>
                      <div className="font-bold">{employeeDetails?.full_name}</div>
                    </div>
                    <div className="text-center">
                      {issueDialog?.principal_signature_data ? (
                        <img src={issueDialog.principal_signature_data} alt="Principal Signature" className="h-12 object-contain mix-blend-multiply" />
                      ) : (
                        <div className="h-12 flex items-end justify-center text-xs text-muted-foreground italic">Digitally Signed by Principal</div>
                      )}
                      <div className="font-bold border-t mt-1 pt-1">Principal</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="upload" className="p-4 bg-muted/30 border rounded-lg mt-2">
                <div className="flex flex-col items-center justify-center py-8">
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="font-medium mb-1">Upload Scanned PDF</p>
                  <p className="text-xs text-muted-foreground mb-4">PDF only, max 10MB</p>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="max-w-xs"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialog(null)}>Cancel</Button>
            <Button onClick={handleIssueDocument} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileCheck className="w-4 h-4 mr-2" />
              Issue & Notify Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ request, onForward, onInfo, onIssue, readOnly, showDownload }: any) {
  let statusColor = "bg-secondary text-secondary-foreground";
  if (request.current_stage === 'clerk_issuing') statusColor = "bg-blue-100 text-blue-800 border-blue-200";
  if (request.current_stage === 'principal_review') statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (['ready', 'downloaded'].includes(request.current_stage)) statusColor = "bg-green-100 text-green-800 border-green-200";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{request.students?.full_name}</h3>
                <p className="text-sm text-muted-foreground">Class {request.students?.classes?.name} {request.students?.classes?.section} • Admn: {request.students?.admission_number}</p>
                <p className="text-sm text-muted-foreground mt-1">Parent: {request.parents?.name} ({request.parents?.contact_number || request.parents?.email})</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={statusColor}>{request.current_stage.replace('_', ' ').toUpperCase()}</Badge>
                <Badge variant="outline" className="font-mono">{request.document_type}</Badge>
              </div>
            </div>

            <div className="py-2">
              <div className="text-sm bg-muted/40 p-3 rounded-lg border border-border">
                <p className="font-medium text-foreground mb-1">Purpose:</p>
                <p className="text-muted-foreground">{request.purpose}</p>
                {request.other_description && <p className="text-muted-foreground mt-1">Details: {request.other_description}</p>}
              </div>
            </div>

            {request.clerk_note && request.current_stage !== 'clerk_review' && (
              <div className="text-sm italic text-muted-foreground">Your Note: {request.clerk_note}</div>
            )}

            <p className="text-xs text-muted-foreground pt-2">Requested: {new Date(request.requested_at).toLocaleString()}</p>
            {request.principal_signed_at && <p className="text-xs text-green-600 font-medium">Signed by Principal on {new Date(request.principal_signed_at).toLocaleString()}</p>}
            {request.issued_at && <p className="text-xs text-blue-600 font-medium">Issued on {new Date(request.issued_at).toLocaleString()}</p>}
          </div>

          <div className="flex md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0 md:min-w-[200px]">
            {request.current_stage === 'clerk_review' && onForward && onInfo && (
              <>
                <Button variant="default" className="flex-1 md:w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={onForward}>
                  <ArrowRight className="w-4 h-4 mr-2" /> Review & Forward
                </Button>
                <Button variant="outline" className="flex-1 md:w-full" onClick={onInfo}>
                  Request More Info
                </Button>
              </>
            )}
            {request.current_stage === 'clerk_issuing' && onIssue && (
              <Button variant="default" className="flex-1 md:w-full bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={onIssue}>
                <FileCheck className="w-4 h-4 mr-2" /> Generate & Issue
              </Button>
            )}
            {showDownload && request.document_url && (
              <Button variant="outline" className="flex-1 md:w-full" onClick={() => window.open(request.document_url, '_blank')}>
                <FileText className="w-4 h-4 mr-2" /> View Issued Doc
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
