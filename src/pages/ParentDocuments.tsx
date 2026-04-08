import { useState } from 'react';
import { useParentData } from '@/hooks/useParentData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderOpen, Send, Download, Loader2, FileText, CheckCircle2, Clock,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Stage config ────────────────────────────────────────────────────────────
const STAGE_CONFIG: Record<string, { label: string; parentLabel: string; color: string; step: number }> = {
  submitted:        { label: 'Submitted',        parentLabel: 'Submitted',        color: 'bg-muted text-muted-foreground border-muted-foreground/30',       step: 0 },
  clerk_review:     { label: 'Under Review',     parentLabel: 'Under Review',     color: 'bg-yellow-100 text-yellow-800 border-yellow-300',                  step: 1 },
  principal_review: { label: 'With Principal',   parentLabel: 'With Principal',   color: 'bg-orange-100 text-orange-800 border-orange-300',                  step: 2 },
  clerk_issuing:    { label: 'Being Prepared',   parentLabel: 'Being Prepared',   color: 'bg-blue-100 text-blue-800 border-blue-300',                        step: 3 },
  ready:            { label: 'Ready to Download', parentLabel: 'Ready to Download', color: 'bg-green-100 text-green-800 border-green-300',                   step: 4 },
  downloaded:       { label: 'Downloaded',       parentLabel: 'Downloaded',       color: 'bg-teal-100 text-teal-800 border-teal-300',                         step: 5 },
};

const STAGE_STEPS = [
  { key: 'submitted',        label: 'Submitted' },
  { key: 'clerk_review',     label: 'Under Review' },
  { key: 'principal_review', label: 'With Principal' },
  { key: 'clerk_issuing',    label: 'Being Prepared' },
  { key: 'ready',            label: 'Ready' },
  { key: 'downloaded',       label: 'Downloaded' },
];

const docTypes = [
  'Bonafide Certificate',
  'Leaving Certificate',
  'NOC',
  'Character Certificate',
  'Other',
];

export default function ParentDocuments() {
  const { linkedStudents, parentRecord, isLoading: loadingParent } = useParentData();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const selectedChild = linkedStudents[selectedChildIndex] || null;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ document_type: '', other_description: '', purpose: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch requests — include stage history if needed
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['parent-doc-requests', selectedChild?.id, parentRecord?.id],
    queryFn: async () => {
      if (!selectedChild?.id || !parentRecord?.id) return [];
      const { data, error } = await supabase
        .from('document_requests')
        .select('*')
        .eq('student_id', selectedChild.id)
        .eq('parent_id', parentRecord.id)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedChild?.id && !!parentRecord?.id,
  });

  // Submit request
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!selectedChild?.id || !parentRecord?.id) throw new Error('Missing data');

      // Step 1: Find the active Administration Clerk via edge function (bypasses RLS)
      const { data: clerkResponse } = await supabase.functions.invoke('find-clerk');
      const clerkData = clerkResponse?.clerk || null;

      console.log('[DOC REQUEST] Clerk found:', clerkData);

      const stage = clerkData ? 'clerk_review' : 'submitted';

      // Step 3: Create the document request
      const { data: newRequest, error: insertError } = await supabase
        .from('document_requests')
        .insert({
          student_id: selectedChild.id,
          parent_id: parentRecord.id,
          document_type: form.document_type,
          other_description: form.document_type === 'Other' ? form.other_description : null,
          purpose: form.purpose,
          assigned_clerk_id: clerkData?.id || null,
          current_stage: stage,
          status: stage,
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('[DOC REQUEST] Insert error:', insertError);
        throw insertError;
      }

      console.log('[DOC REQUEST] Created:', newRequest);

      // Step 4: Insert into document_request_history
      await supabase
        .from('document_request_history')
        .insert({
          document_request_id: newRequest.id,
          stage_from: 'none',
          stage_to: stage,
          action_taken_by_user_id: parentRecord.user_id,
          action_taken_by_name: 'Parent',
          action_taken_by_role: 'parent',
          note: 'Request submitted by parent',
        });

      // Step 5: Send notification to clerk if found
      if (clerkData?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: clerkData.user_id, // clerk's auth user_id
            title: 'New Document Request',
            message: `New ${form.document_type} request from parent for ${selectedChild.full_name}`,
            type: 'document_request',
            is_read: false,
            created_at: new Date().toISOString(),
          });
      }
    },
    onSuccess: () => {
      toast.success('Document request submitted. The administration clerk will review it shortly.');
      setForm({ document_type: '', other_description: '', purpose: '' });
      setFormErrors({});
      queryClient.invalidateQueries({ queryKey: ['parent-doc-requests'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mark as downloaded
  const markDownloaded = useMutation({
    mutationFn: async (req: any) => {
      const { error } = await supabase
        .from('document_requests')
        .update({
          status: 'downloaded',
          current_stage: 'downloaded',
          downloaded_by_parent_at: new Date().toISOString(),
          downloaded_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) throw error;

      // History entry
      await supabase.from('document_request_history').insert({
        document_request_id: req.id,
        stage_from: 'ready',
        stage_to: 'downloaded',
        action_taken_by_name: 'Parent',
        action_taken_by_role: 'parent',
        note: 'Document downloaded by parent',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-doc-requests'] }),
  });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.document_type) errors.document_type = 'Please select a document type';
    if (form.document_type === 'Other' && !form.other_description.trim()) errors.other_description = 'Please describe the document needed';
    if (!form.purpose.trim()) errors.purpose = 'Purpose is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) submitRequest.mutate();
  };

  const handleDownload = async (req: any) => {
    if (!req.document_url) {
      toast.error('Document not available yet.');
      return;
    }

    // Open the real Supabase Storage URL
    window.open(req.document_url, '_blank');

    if (req.current_stage === 'ready' || req.status === 'ready') {
      markDownloaded.mutate(req);
    }
  };

  if (loadingParent) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Documents — {selectedChild?.full_name || 'Select Child'}
      </h1>

      {linkedStudents.length > 1 && (
        <Tabs value={selectedChildIndex.toString()} onValueChange={v => setSelectedChildIndex(parseInt(v))}>
          <TabsList>
            {linkedStudents.map((child: any, idx: number) => (
              <TabsTrigger key={child.id} value={idx.toString()}>{child.full_name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {selectedChild ? (
        <Tabs defaultValue="request">
          <TabsList>
            <TabsTrigger value="request">Request Document</TabsTrigger>
            <TabsTrigger value="my-requests">
              My Requests
              {requests.filter((r: any) => r.current_stage === 'ready').length > 0 && (
                <Badge className="ml-1.5 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-green-600 text-white">
                  {requests.filter((r: any) => r.current_stage === 'ready').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Request Form */}
          <TabsContent value="request">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Request a Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50/50 text-sm text-blue-800">
                  <p className="font-medium mb-1">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>You submit the request below</li>
                    <li>The Administration Clerk reviews it</li>
                    <li>The Principal digitally signs the document</li>
                    <li>The Clerk prepares and issues the document</li>
                    <li>You receive a download notification here</li>
                  </ol>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                  <div>
                    <Label>Document Type *</Label>
                    <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {docTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {formErrors.document_type && <p className="text-xs text-destructive mt-1">{formErrors.document_type}</p>}
                  </div>

                  {form.document_type === 'Other' && (
                    <div>
                      <Label>Please describe the document needed *</Label>
                      <Textarea
                        value={form.other_description}
                        onChange={e => setForm(p => ({ ...p, other_description: e.target.value }))}
                        className="mt-1" rows={2}
                      />
                      {formErrors.other_description && <p className="text-xs text-destructive mt-1">{formErrors.other_description}</p>}
                    </div>
                  )}

                  <div>
                    <Label>Purpose *</Label>
                    <Textarea
                      value={form.purpose}
                      onChange={e => setForm(p => ({ ...p, purpose: e.target.value.slice(0, 300) }))}
                      placeholder="Why do you need this document?"
                      rows={3} className="mt-1"
                    />
                    <div className="flex justify-between mt-1">
                      {formErrors.purpose && <p className="text-xs text-destructive">{formErrors.purpose}</p>}
                      <p className="text-xs text-muted-foreground ml-auto">{form.purpose.length}/300</p>
                    </div>
                  </div>

                  <Button type="submit" disabled={submitRequest.isPending}>
                    {submitRequest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Requests */}
          <TabsContent value="my-requests">
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-44" />)}</div>
            ) : requests.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No document requests yet.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {requests.map((req: any) => {
                  const stage = req.current_stage || req.status || 'submitted';
                  const stageCfg = STAGE_CONFIG[stage] || STAGE_CONFIG.submitted;
                  const isReady = stage === 'ready';
                  const isDownloaded = stage === 'downloaded';
                  const currentStep = stageCfg.step;

                  return (
                    <Card key={req.id} className={cn('border', isReady && 'border-green-300 bg-green-50/30')}>
                      <CardContent className="py-5">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-foreground">{req.document_type}</span>
                              <Badge className={cn('text-xs border', stageCfg.color)}>{stageCfg.parentLabel}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{req.purpose}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {format(new Date(req.requested_at), 'dd MMM yyyy')}
                            </p>
                            {isReady && req.issued_at && (
                              <p className="text-xs text-green-700 font-medium">
                                Issued: {format(new Date(req.issued_at), 'dd MMM yyyy')}
                                {req.principal_signed_at && ` • Signed by Principal`}
                              </p>
                            )}
                            {req.clerk_note && !req.clerk_note.startsWith('Returned') && (
                              <p className="text-xs p-2 rounded bg-muted mt-2">
                                <span className="font-medium">Note:</span> {req.clerk_note}
                              </p>
                            )}
                          </div>

                          {/* Download Button */}
                          {(isReady || isDownloaded) && req.document_url && (
                            <Button
                              onClick={() => handleDownload(req)}
                              className={cn('shrink-0', isReady ? 'bg-green-600 hover:bg-green-700' : 'variant-outline')}
                              variant={isDownloaded ? 'outline' : 'default'}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {isDownloaded ? 'Re-download' : 'Download'}
                            </Button>
                          )}
                        </div>

                        {/* Stage Progress Tracker */}
                        <div className="mt-2">
                          <div className="flex items-center gap-0">
                            {STAGE_STEPS.map((step, idx) => {
                              const done = idx <= currentStep;
                              const active = idx === currentStep;
                              return (
                                <div key={step.key} className="flex items-center flex-1">
                                  <div className="flex flex-col items-center">
                                    <div className={cn(
                                      'w-3 h-3 rounded-full flex-shrink-0 border-2 transition-all',
                                      done
                                        ? active
                                          ? 'bg-primary border-primary scale-125'
                                          : 'bg-primary border-primary'
                                        : 'bg-background border-muted-foreground/40'
                                    )} />
                                  </div>
                                  {idx < STAGE_STEPS.length - 1 && (
                                    <div className={cn(
                                      'h-0.5 flex-1 mx-0.5 transition-all',
                                      done && idx < currentStep ? 'bg-primary' : 'bg-muted'
                                    )} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-1.5">
                            {STAGE_STEPS.map((step, idx) => {
                              const active = idx === currentStep;
                              return (
                                <span key={step.key} className={cn(
                                  'text-[9px] font-medium text-center leading-tight flex-1 px-0.5',
                                  active ? 'text-primary' : 'text-muted-foreground'
                                )}>
                                  {step.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>
      )}
    </div>
  );
}
