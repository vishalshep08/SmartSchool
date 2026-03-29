import { useState, useEffect, useRef } from 'react';
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
import { Loader2, FileText, CheckCircle, Upload, ArrowLeft } from 'lucide-react';
import { formatDateIndian } from '@/lib/dateUtils';
import SignatureCanvas from 'react-signature-canvas';

export default function PrincipalDocumentApprovals() {
  const { user, profile, role } = useAuth();
  
  const [tab, setTab] = useState('pending');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);

  // Dialog states
  const [signDialog, setSignDialog] = useState<any>(null);
  const [returnDialog, setReturnDialog] = useState<any>(null);
  
  const [principalNote, setPrincipalNote] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Signature states
  const [sigType, setSigType] = useState('draw');
  const sigCanvasRef = useRef<any>(null);
  const [typedName, setTypedName] = useState(profile?.fullName || '');
  const [fontStyle, setFontStyle] = useState('font-["Great_Vibes"] text-4xl');
  const [uploadedSig, setUploadedSig] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchEmployeeAndRequests = async () => {
      if (!user?.id) return;
      try {
        const { data: emp } = await (supabase as any)
          .from('employees')
          .select('id, full_name, designation, department')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (!cancelled) {
          if (emp) setEmployeeDetails(emp);
          // Always load requests for principal regardless of employee record
          fetchRequests();
        }
      } catch (err) {
        console.error('[PRINCIPAL] Employee record fetch error:', err);
        // Still load requests even on error
        if (!cancelled) fetchRequests();
      }
    };
    fetchEmployeeAndRequests();
    return () => { cancelled = true; };
  }, [user?.id]);

  const fetchRequests = async () => {
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
        .order('forwarded_to_principal_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load document requests');
    } finally {
      setLoading(false);
    }
  };

  const getSignatureAsBase64 = () => {
    if (sigType === 'draw') {
      if (sigCanvasRef.current?.isEmpty()) return null;
      return sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
    } else if (sigType === 'type') {
      if (!typedName) return null;
      // create a canvas and draw the typed name
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let fontFace = 'cursive'; // fallback
        if (fontStyle.includes('Great_Vibes')) fontFace = '"Great Vibes", cursive';
        else if (fontStyle.includes('Dancing_Script')) fontFace = '"Dancing Script", cursive';
        else if (fontStyle.includes('Pacifico')) fontFace = '"Pacifico", cursive';

        ctx.font = `italic 36px ${fontFace}`;
        ctx.fillStyle = '#1e3a8a'; // dark blue signature ink
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 200, 50);
      }
      return canvas.toDataURL('image/png');
    } else if (sigType === 'upload') {
      return uploadedSig;
    }
    return null;
  };

  const handleSignDocument = async () => {
    if (!signDialog) return;
    
    const signatureData = getSignatureAsBase64();
    if (!signatureData) {
      toast.error('Please provide a valid signature');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('document_requests')
        .update({
          current_stage: 'clerk_issuing',
          status: 'pending', // internal status backward compatibility
          principal_signed_at: new Date().toISOString(),
          principal_id: employeeDetails?.id || null,
          principal_note: principalNote.trim() || null,
          principal_signature_data: signatureData,
          returned_to_clerk_at: new Date().toISOString(),
        })
        .eq('id', signDialog.id);

      if (error) throw error;

      await (supabase as any).from('document_request_history').insert({
        document_request_id: signDialog.id,
        stage_from: 'principal_review',
        stage_to: 'clerk_issuing',
        action_taken_by_user_id: user?.id,
        action_taken_by_name: employeeDetails?.full_name || profile?.fullName || 'Principal',
        action_taken_by_role: 'principal',
        note: principalNote.trim() || 'Document signed and returned to clerk',
      });
      
      await (supabase as any).from('notifications').insert({
        user_id: signDialog.assigned_clerk_id, 
        title: `Principal signed ${signDialog.document_type}`,
        message: `The document for ${signDialog.students?.full_name} is ready to issue.`,
        type: 'document_signed'
      });

      toast.success('Document signed successfully');
      setSignDialog(null);
      setPrincipalNote('');
      if (sigCanvasRef.current) sigCanvasRef.current.clear();
      setUploadedSig(null);
      fetchRequests();
    } catch (error) {
      console.error('Error signing:', error);
      toast.error('Failed to sign document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToClerk = async () => {
    if (!returnDialog || !returnReason.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('document_requests')
        .update({
          current_stage: 'clerk_review',
          clerk_note: `Returned by Principal: ${returnReason}`,
        })
        .eq('id', returnDialog.id);

      if (error) throw error;
      
      await (supabase as any).from('document_request_history').insert({
        document_request_id: returnDialog.id,
        stage_from: 'principal_review',
        stage_to: 'clerk_review',
        action_taken_by_user_id: user?.id,
        action_taken_by_name: employeeDetails?.full_name || profile?.fullName || 'Principal',
        action_taken_by_role: 'principal',
        note: returnReason,
      });
      
      await (supabase as any).from('notifications').insert({
        user_id: returnDialog.assigned_clerk_id, 
        title: `Principal returned ${returnDialog.document_type}`,
        message: `Reason: ${returnReason}`,
        type: 'document_returned'
      });

      toast.success('Request returned to Clerk');
      setReturnDialog(null);
      setReturnReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error returning:', error);
      toast.error('Failed to return request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSig(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Access check — based on role from AuthContext only
  if (role !== 'principal') {
    return (
      <div className="p-8 text-center bg-muted/30 rounded-lg border">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only the Principal can approve document requests.</p>
      </div>
    );
  }

  const pendingSignature = requests.filter(r => r.current_stage === 'principal_review');
  const previouslySigned = requests.filter(r => r.principal_signed_at != null && r.current_stage !== 'principal_review');

  return (
    <div className="space-y-6 animate-fade-up max-w-[1200px] mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Document Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and digitally sign document certificates requested by parents.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="pending">
            Pending Signature {pendingSignature.length > 0 && <Badge variant="destructive" className="ml-2">{pendingSignature.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history">Previously Signed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {loading ? (
             <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : pendingSignature.length === 0 ? (
            <div className="py-16 text-center bg-muted/30 rounded-lg border border-dashed">
              <CheckCircle className="w-16 h-16 text-muted-foreground mb-4 mx-auto opacity-50" />
              <h3 className="font-medium text-lg text-foreground mb-1">All Caught Up!</h3>
              <p className="text-muted-foreground">No documents pending your signature.</p>
            </div>
          ) : (
            pendingSignature.map(request => (
              <Card key={request.id} className="overflow-hidden border-orange-200">
                <div className="h-1 bg-orange-400 w-full" />
                <CardContent className="p-5 flex flex-col md:flex-row gap-5 items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 uppercase tracking-widest text-[10px]">Awaiting Signature</Badge>
                      <h3 className="font-bold text-lg">{request.students?.full_name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Class: {request.students?.classes?.name} {request.students?.classes?.section} • Admn: {request.students?.admission_number}</p>
                    <div className="p-3 bg-muted/30 rounded border text-sm max-w-lg">
                      <p><span className="font-medium">Document:</span> {request.document_type}</p>
                      <p><span className="font-medium">Purpose:</span> {request.purpose}</p>
                      {request.clerk_note && (
                        <p className="mt-2 text-blue-700 bg-blue-50 p-2 rounded italic text-xs border border-blue-100">
                          <span className="font-bold">Clerk Note:</span> {request.clerk_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-36">
                    <Button onClick={() => setSignDialog(request)} className="w-full bg-green-600 hover:bg-green-700">Review & Sign</Button>
                    <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setReturnDialog(request)}>Return to Clerk</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
           {loading ? (
             <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : previouslySigned.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-lg border border-dashed">
              <p className="font-medium text-muted-foreground">No signing history found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {previouslySigned.map(request => (
                <Card key={request.id} className="opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4 flex gap-4 items-center">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{request.students?.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{request.document_type} • Signed: {new Date(request.principal_signed_at).toLocaleDateString()}</p>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-[10px]">{request.current_stage.replace('_', ' ').toUpperCase()}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sign Dialog (Full Screen or Large) */}
      <Dialog open={!!signDialog} onOpenChange={(open) => !open && setSignDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Review & Digitally Sign Document</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            <div className="space-y-6">
              <div className="border bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3">Request Details</h4>
                <div className="space-y-2 text-sm">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b pb-2">
                     <span className="text-muted-foreground">Student:</span>
                     <span className="col-span-2 font-medium">{signDialog?.students?.full_name} (Class {signDialog?.students?.classes?.name} {signDialog?.students?.classes?.section})</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b pb-2">
                     <span className="text-muted-foreground">Document:</span>
                     <span className="col-span-2 font-medium">{signDialog?.document_type}</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-1">
                     <span className="text-muted-foreground">Purpose:</span>
                     <span className="col-span-2">{signDialog?.purpose}</span>
                   </div>
                   {signDialog?.clerk_note && (
                     <div className="p-2 bg-blue-100 text-blue-900 rounded mt-2 italic text-xs border border-blue-200">
                       <span className="font-bold">Clerk writes: </span>{signDialog?.clerk_note}
                     </div>
                   )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Principal's Note on Document: (Optional)</Label>
                <Textarea 
                  placeholder="E.g., Cleared all dues."
                  value={principalNote}
                  onChange={e => setPrincipalNote(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="border rounded-lg bg-white overflow-hidden shadow-sm h-[320px] flex flex-col items-center p-6 text-center select-none">
                 <h2 className="text-xl font-bold font-serif uppercase tracking-widest text-slate-800 mb-6 border-b-2 border-slate-800 pb-2 inline-block">
                   {signDialog?.document_type}
                 </h2>
                 <p className="text-sm font-serif leading-relaxed text-slate-700 text-justify">
                   This is to certify that <span className="font-bold underline">{signDialog?.students?.full_name}</span> is a bona fide 
                   student of this institution studying in Class <span className="font-bold underline">{signDialog?.students?.classes?.name} {signDialog?.students?.classes?.section}</span>.
                   This document is issued for the purpose of {signDialog?.purpose}.
                 </p>
                 <div className="w-full flex justify-between items-end mt-auto h-24">
                   <div className="text-left">
                     <p className="text-xs text-slate-400">Date</p>
                     <p className="text-sm border-b border-black w-24">__/__/____</p>
                   </div>
                   <div className="text-center relative">
                     {/* Signature placeholder in preview */}
                     <div className="h-16 w-32 border border-dashed border-red-300 bg-red-50 flex items-center justify-center opacity-70">
                       <span className="text-[10px] text-red-500 uppercase font-bold">Sign Here</span>
                     </div>
                     <p className="border-t border-black w-32 mt-1 text-xs font-bold uppercase tracking-wide">Principal</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
             <h4 className="font-semibold mb-3">Your Digital Signature</h4>
             <Tabs value={sigType} onValueChange={setSigType} className="w-full">
               <TabsList className="w-full justify-start border-b rounded-none px-0 bg-transparent h-auto pb-0">
                 <TabsTrigger value="draw" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-2 font-medium">Draw Signature</TabsTrigger>
                 <TabsTrigger value="type" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-2 font-medium">Type Name</TabsTrigger>
                 <TabsTrigger value="upload" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-2 font-medium">Upload Image</TabsTrigger>
               </TabsList>

               <div className="p-4 border border-t-0 rounded-b bg-slate-50 min-h-[160px]">
                 <TabsContent value="draw" className="mt-0">
                    <div className="border bg-white rounded flex flex-col h-full h-[140px] relative w-fit mx-auto">
                      <span className="absolute left-2 top-2 text-xs text-muted-foreground pointer-events-none">Sign here</span>
                      <SignatureCanvas 
                        ref={sigCanvasRef}
                        penColor="#1e3a8a"
                        canvasProps={{width: 400, height: 130, className: 'sigCanvas cursor-crosshair'}} 
                      />
                      <Button variant="ghost" size="sm" className="absolute top-1 right-1 text-[10px] h-6 px-2 hover:bg-slate-100" onClick={() => sigCanvasRef.current?.clear()}>Clear</Button>
                    </div>
                 </TabsContent>
                 
                 <TabsContent value="type" className="mt-0 space-y-4 max-w-lg mx-auto">
                    <div className="grid grid-cols-[1fr,150px] gap-4">
                      <div>
                        <Label>Type your full name</Label>
                        <Input value={typedName} onChange={e => setTypedName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Font Style</Label>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          value={fontStyle}
                          onChange={e => setFontStyle(e.target.value)}
                        >
                          <option value='font-["Great_Vibes"] text-3xl'>Great Vibes</option>
                          <option value='font-["Dancing_Script"] text-3xl'>Dancing Script</option>
                          <option value='font-["Pacifico"] text-3xl'>Pacifico</option>
                        </select>
                      </div>
                    </div>
                    {typedName && (
                      <div className="border bg-white rounded p-4 flex items-center justify-center min-h-[100px]">
                        <span className={`text-[#1e3a8a] ${fontStyle}`} style={{ fontFamily: fontStyle.includes('Great_Vibes') ? 'cursive' : undefined }}>{typedName}</span>
                      </div>
                    )}
                 </TabsContent>

                 <TabsContent value="upload" className="mt-0 max-w-md mx-auto">
                    <div className="border border-dashed rounded bg-white p-6 flex flex-col items-center justify-center text-center">
                      <Input type="file" accept="image/png, image/jpeg" className="max-w-[250px] mb-4" onChange={handleFileUpload} />
                      {uploadedSig && <img src={uploadedSig} alt="Signature Uploaded" className="h-16 object-contain" />}
                    </div>
                 </TabsContent>
               </div>
             </Tabs>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="ghost" onClick={() => setSignDialog(null)}>Cancel</Button>
            <Button 
              size="lg"
              className="bg-green-600 hover:bg-green-700 font-bold px-8"
              onClick={handleSignDocument} 
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Sign & Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return to Clerk Dialog */}
      <Dialog open={!!returnDialog} onOpenChange={(open) => !open && setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Clerk</DialogTitle>
            <DialogDescription className="text-red-600">
              Return this document to the clerk without signing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-red-600">Reason for returning (required) *</Label>
              <Textarea
                placeholder="E.g., Missing parent's signature on the physical application."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReturnToClerk} disabled={submitting || !returnReason.trim()}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Return to Clerk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
