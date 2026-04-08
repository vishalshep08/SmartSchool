import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStaff } from '@/hooks/useStaff';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText, PenTool, Type, Upload, CheckCircle2, RotateCcw, Loader2,
  Calendar, User, Pen,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DocRequest {
  id: string;
  document_type: string;
  purpose: string;
  other_description: string | null;
  current_stage: string;
  clerk_note: string | null;
  principal_note: string | null;
  requested_at: string;
  forwarded_to_principal_at: string | null;
  principal_signed_at: string | null;
  students?: { full_name: string; admission_number: string; classes?: { name: string; section?: string | null } | null } | null;
}

type SigMethod = 'draw' | 'type' | 'upload';

const SIGNATURE_FONTS = [
  { label: 'Cursive', value: 'cursive' },
  { label: 'Serif', value: 'serif' },
  { label: 'Dancing Script', value: "'Dancing Script', cursive" },
];

export function PrincipalDocumentApprovals() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const queryClient = useQueryClient();

  const [signDialog, setSignDialog] = useState<DocRequest | null>(null);
  const [returnDialog, setReturnDialog] = useState<DocRequest | null>(null);
  const [principalNote, setPrincipalNote] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [sigMethod, setSigMethod] = useState<SigMethod>('draw');
  const [typedSig, setTypedSig] = useState('');
  const [sigFont, setSigFont] = useState(SIGNATURE_FONTS[0].value);
  const [uploadedSigUrl, setUploadedSigUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const principalEmployee = staff.find(s => s.user_id === user?.id);

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ['principal-doc-requests-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_requests')
        .select('*, students:student_id (full_name, admission_number, classes:class_id (name, section))')
        .eq('current_stage', 'principal_review')
        .order('forwarded_to_principal_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as DocRequest[];
    },
  });

  const { data: signedRequests = [], isLoading: loadingSigned } = useQuery({
    queryKey: ['principal-doc-requests-signed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_requests')
        .select('*, students:student_id (full_name, admission_number, classes:class_id (name, section))')
        .not('principal_signed_at', 'is', null)
        .order('principal_signed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DocRequest[];
    },
  });

  // Canvas drawing setup
  useEffect(() => {
    if (!signDialog || sigMethod !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [signDialog, sigMethod]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setLastPos(getPos(e));
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureData = (): string => {
    if (sigMethod === 'draw') {
      return canvasRef.current?.toDataURL('image/png') || '';
    }
    if (sigMethod === 'type') {
      // Render typed text to canvas as base64
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e293b';
      ctx.font = `36px ${sigFont}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSig, 20, 50);
      return canvas.toDataURL('image/png');
    }
    return uploadedSigUrl;
  };

  const signAndApprove = useMutation({
    mutationFn: async (req: DocRequest) => {
      if (!user?.id) throw new Error('Not authenticated');
      const signatureData = getSignatureData();
      if (!signatureData) throw new Error('Please provide your signature');

      // Find the assigned clerk to notify
      const { data: reqFull } = await supabase
        .from('document_requests')
        .select('assigned_clerk_id, teachers!assigned_clerk_id (user_id)')
        .eq('id', req.id)
        .maybeSingle();

      const { error } = await supabase
        .from('document_requests')
        .update({
          current_stage: 'clerk_issuing',
          principal_signed_at: new Date().toISOString(),
          principal_reviewed_at: new Date().toISOString(),
          principal_employee_id: principalEmployee?.id || null,
          principal_signature_data: signatureData,
          principal_note: principalNote.trim() || null,
          returned_to_clerk_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) throw error;

      await supabase.from('document_request_history').insert({
        document_request_id: req.id,
        stage_from: 'principal_review',
        stage_to: 'clerk_issuing',
        action_taken_by_user_id: user.id,
        action_taken_by_name: principalEmployee?.full_name || 'Principal',
        action_taken_by_role: 'principal',
        note: `Signed & approved. ${principalNote.trim() || ''}`.trim(),
      });

      // Notify clerk
      const clerkUserRaw = (reqFull as any)?.teachers;
      const clerkUserId = Array.isArray(clerkUserRaw) ? clerkUserRaw[0]?.user_id : clerkUserRaw?.user_id;
      if (clerkUserId) {
        await supabase.from('notifications').insert({
          user_id: clerkUserId,
          title: 'Principal Signed Document',
          message: `Principal has signed the ${req.document_type} for ${req.students?.full_name || 'a student'}. Please issue the document.`,
          type: 'document_request',
        });
      }
    },
    onSuccess: () => {
      toast.success('Document signed and returned to Clerk');
      setSignDialog(null);
      setPrincipalNote('');
      setTypedSig('');
      setUploadedSigUrl('');
      clearCanvas();
      queryClient.invalidateQueries({ queryKey: ['principal-doc-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['principal-doc-requests-signed'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const returnToClerk = useMutation({
    mutationFn: async (req: DocRequest) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!returnReason.trim()) throw new Error('Please enter a reason');

      const { data: reqFull } = await supabase
        .from('document_requests')
        .select('assigned_clerk_id, teachers!assigned_clerk_id (user_id)')
        .eq('id', req.id)
        .maybeSingle();

      const { error } = await supabase
        .from('document_requests')
        .update({
          current_stage: 'clerk_review',
          clerk_note: `Returned by Principal: ${returnReason.trim()}`,
        })
        .eq('id', req.id);
      if (error) throw error;

      await supabase.from('document_request_history').insert({
        document_request_id: req.id,
        stage_from: 'principal_review',
        stage_to: 'clerk_review',
        action_taken_by_user_id: user.id,
        action_taken_by_name: principalEmployee?.full_name || 'Principal',
        action_taken_by_role: 'principal',
        note: `Returned: ${returnReason.trim()}`,
      });

      const clerkUserRaw = (reqFull as any)?.teachers;
      const clerkUserId = Array.isArray(clerkUserRaw) ? clerkUserRaw[0]?.user_id : clerkUserRaw?.user_id;
      if (clerkUserId) {
        await supabase.from('notifications').insert({
          user_id: clerkUserId,
          title: 'Document Returned by Principal',
          message: `Principal returned ${req.document_type} for ${req.students?.full_name || 'a student'}: ${returnReason.trim()}`,
          type: 'document_request',
        });
      }
    },
    onSuccess: () => {
      toast.success('Request returned to Clerk');
      setReturnDialog(null);
      setReturnReason('');
      queryClient.invalidateQueries({ queryKey: ['principal-doc-requests-pending'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
          Document Approvals
          {pendingRequests.length > 0 && (
            <Badge className="bg-orange-500 text-white">{pendingRequests.length} pending</Badge>
          )}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Review and digitally sign document requests from parents</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending Signatures
            {pendingRequests.length > 0 && (
              <Badge className="h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-orange-500 text-white">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="signed">All Signed</TabsTrigger>
        </TabsList>

        {/* Pending Signatures Tab */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {loadingPending ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-44" />)}</div>
          ) : pendingRequests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No documents pending your signature.</p>
            </CardContent></Card>
          ) : (
            pendingRequests.map(req => (
              <Card key={req.id} className="border border-orange-200 bg-orange-50/20">
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4 text-orange-600 shrink-0" />
                        <span className="font-semibold text-foreground">{req.document_type}</span>
                        <Badge className="text-xs border bg-orange-100 text-orange-800 border-orange-300">With Principal</Badge>
                      </div>
                      {req.students && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">{req.students.full_name}</span>
                          {req.students.classes && (
                            <span className="text-muted-foreground">
                              — {req.students.classes.name}{req.students.classes.section ? ` ${req.students.classes.section}` : ''} • #{req.students.admission_number}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">{req.purpose}</p>
                      {req.clerk_note && (
                        <p className="text-xs p-2 rounded bg-muted">
                          <span className="font-medium">Clerk's note:</span> {req.clerk_note}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Requested: {format(new Date(req.requested_at), 'dd MMM yyyy')}</span>
                        {req.forwarded_to_principal_at && (
                          <span>Forwarded: {format(new Date(req.forwarded_to_principal_at), 'dd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setReturnDialog(req); setReturnReason(''); }}
                      >
                        <RotateCcw className="h-4 w-4 mr-1.5" />
                        Return
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setSignDialog(req); setPrincipalNote(''); setSigMethod('draw'); setTypedSig(''); setUploadedSigUrl(''); }}
                      >
                        <Pen className="h-4 w-4 mr-1.5" />
                        Review & Sign
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* All Signed Tab */}
        <TabsContent value="signed" className="space-y-4 mt-4">
          {loadingSigned ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : signedRequests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No signed documents yet.</CardContent></Card>
          ) : (
            signedRequests.map(req => (
              <Card key={req.id} className="border border-border/60">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{req.document_type} — {req.students?.full_name}</p>
                      {req.principal_signed_at && (
                        <p className="text-xs text-muted-foreground">Signed on {format(new Date(req.principal_signed_at), 'dd MMM yyyy, HH:mm')}</p>
                      )}
                      {req.principal_note && <p className="text-xs text-muted-foreground mt-0.5">Note: {req.principal_note}</p>}
                    </div>
                    <Badge className="text-xs bg-green-100 text-green-800 border border-green-300">Signed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Sign Dialog */}
      <Dialog open={!!signDialog} onOpenChange={open => !open && setSignDialog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pen className="h-5 w-5 text-primary" />
              Review & Sign Document
            </DialogTitle>
            <DialogDescription>
              Add your digital signature and approve this document request.
            </DialogDescription>
          </DialogHeader>
          {signDialog && (
            <div className="space-y-5">
              {/* Request Details */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                <p><span className="font-medium">Student:</span> {signDialog.students?.full_name} • #{signDialog.students?.admission_number}</p>
                <p><span className="font-medium">Class:</span> {signDialog.students?.classes?.name} {signDialog.students?.classes?.section}</p>
                <p><span className="font-medium">Document:</span> {signDialog.document_type}</p>
                <p><span className="font-medium">Purpose:</span> {signDialog.purpose}</p>
                {signDialog.clerk_note && <p><span className="font-medium text-blue-700">Clerk's note:</span> {signDialog.clerk_note}</p>}
              </div>

              {/* Principal's Note */}
              <div>
                <Label>Principal's Note (optional — appears on the issued document)</Label>
                <Textarea
                  value={principalNote}
                  onChange={e => setPrincipalNote(e.target.value)}
                  placeholder="e.g., Approved for the purpose stated..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>

              {/* Signature Section */}
              <div className="space-y-3">
                <Label>Digital Signature</Label>
                <RadioGroup value={sigMethod} onValueChange={v => setSigMethod(v as SigMethod)} className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="draw" id="sig-draw" />
                    <Label htmlFor="sig-draw" className="flex items-center gap-1.5 cursor-pointer"><PenTool className="h-4 w-4" />Draw</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="type" id="sig-type" />
                    <Label htmlFor="sig-type" className="flex items-center gap-1.5 cursor-pointer"><Type className="h-4 w-4" />Type</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="upload" id="sig-upload" />
                    <Label htmlFor="sig-upload" className="flex items-center gap-1.5 cursor-pointer"><Upload className="h-4 w-4" />Upload Image</Label>
                  </div>
                </RadioGroup>

                {sigMethod === 'draw' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Draw your signature below using mouse or touch:</p>
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={150}
                        className="w-full touch-none cursor-crosshair bg-white"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={() => setIsDrawing(false)}
                        onMouseLeave={() => setIsDrawing(false)}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={() => setIsDrawing(false)}
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>Clear</Button>
                  </div>
                )}

                {sigMethod === 'type' && (
                  <div className="space-y-3">
                    <Input
                      value={typedSig}
                      onChange={e => setTypedSig(e.target.value)}
                      placeholder="Type your name..."
                      className="text-lg"
                    />
                    <div className="flex gap-3 flex-wrap">
                      {SIGNATURE_FONTS.map(f => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setSigFont(f.value)}
                          className={cn(
                            'px-4 py-2 rounded border text-xl transition-all',
                            sigFont === f.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                          )}
                          style={{ fontFamily: f.value }}
                        >
                          {typedSig || 'Principal'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sigMethod === 'upload' && (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setUploadedSigUrl(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                    {uploadedSigUrl && <img src={uploadedSigUrl} alt="Signature preview" className="max-h-24 border rounded" />}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialog(null)}>Cancel</Button>
            <Button
              onClick={() => signDialog && signAndApprove.mutate(signDialog)}
              disabled={signAndApprove.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {signAndApprove.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Sign & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return to Clerk Dialog */}
      <Dialog open={!!returnDialog} onOpenChange={open => !open && setReturnDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              Return to Clerk
            </DialogTitle>
            <DialogDescription>
              Explain why this request needs to be revised before you can sign it.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason for returning <span className="text-destructive">*</span></Label>
            <Textarea
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              placeholder="e.g., Incorrect student details, missing documents..."
              rows={3}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => returnDialog && returnToClerk.mutate(returnDialog)}
              disabled={returnToClerk.isPending || !returnReason.trim()}
            >
              {returnToClerk.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Return to Clerk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
