import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailNotification } from '@/hooks/useEmailNotification';
import { useStudents, useClasses } from '@/hooks/useStudents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Mail,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  AtSign,
  FileText,
  AlertTriangle,
  Bell,
  Shield,
  X,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

type SelectionMode = 'all' | 'by_class' | 'by_student' | 'individual';

export default function EmailCenter() {
  const { role } = useAuth();
  const { sendNoticeNotification, sendEmergencyAlert, isLoading } = useEmailNotification();
  const { students } = useStudents();
  const { classes } = useClasses();

  const [messageType, setMessageType] = useState<'notice' | 'emergency' | 'announcement'>('notice');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Selection state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [emailSearch, setEmailSearch] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const activeStudents = useMemo(
    () => students.filter(s => s.is_active && s.parent_email),
    [students]
  );

  // Compute recipients based on mode
  const recipients = useMemo(() => {
    let list: { email: string; studentName: string; parentName: string }[] = [];

    if (selectionMode === 'all') {
      list = activeStudents.map(s => ({
        email: s.parent_email!,
        studentName: s.full_name,
        parentName: s.parent_name || 'Parent',
      }));
    } else if (selectionMode === 'by_class') {
      list = activeStudents
        .filter(s => s.class_id === selectedClassId)
        .map(s => ({
          email: s.parent_email!,
          studentName: s.full_name,
          parentName: s.parent_name || 'Parent',
        }));
    } else if (selectionMode === 'by_student') {
      list = activeStudents
        .filter(s => selectedStudentIds.has(s.id))
        .map(s => ({
          email: s.parent_email!,
          studentName: s.full_name,
          parentName: s.parent_name || 'Parent',
        }));
    } else if (selectionMode === 'individual') {
      list = activeStudents
        .filter(s => selectedEmails.has(s.parent_email!))
        .map(s => ({
          email: s.parent_email!,
          studentName: s.full_name,
          parentName: s.parent_name || 'Parent',
        }));
    }

    // Dedupe by email
    const seen = new Map<string, typeof list[0]>();
    list.forEach(r => { if (!seen.has(r.email)) seen.set(r.email, r); });
    return Array.from(seen.values());
  }, [selectionMode, activeStudents, selectedClassId, selectedStudentIds, selectedEmails]);

  const filteredStudentsForSearch = useMemo(
    () => activeStudents.filter(s =>
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
    ),
    [activeStudents, studentSearch]
  );

  const allEmails = useMemo(() => {
    const map = new Map<string, string>();
    activeStudents.forEach(s => { if (!map.has(s.parent_email!)) map.set(s.parent_email!, s.parent_name || s.full_name); });
    return Array.from(map.entries())
      .filter(([email]) => email.toLowerCase().includes(emailSearch.toLowerCase()));
  }, [activeStudents, emailSearch]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const handleSendClick = () => {
    if (recipients.length === 0) {
      toast.error('No recipients selected');
      return;
    }
    if (messageType !== 'emergency' && (!noticeTitle.trim() || !noticeContent.trim())) {
      toast.error('Please enter title and content');
      return;
    }
    if (messageType === 'emergency' && !noticeContent.trim()) {
      toast.error('Please enter the emergency message');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirm(false);
    const emails = recipients.map(r => r.email);
    try {
      if (messageType === 'emergency') {
        await sendEmergencyAlert(emails, noticeContent);
      } else {
        await sendNoticeNotification(emails, noticeTitle, noticeContent, priority);
      }
      setNoticeTitle('');
      setNoticeContent('');
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  if (role !== 'principal') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">Only principals can access the Email Notifications center.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          Email Notifications
        </h1>
        <p className="text-muted-foreground mt-2">Send official school notices and emergency alerts to parents via email</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><AtSign className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{recipients.length}</p>
                <p className="text-xs text-muted-foreground">Selected Recipients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><CheckCircle className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">Active</p>
                <p className="text-xs text-muted-foreground">Integration Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><Users className="w-5 h-5 text-secondary-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{activeStudents.length}</p>
                <p className="text-xs text-muted-foreground">Students with Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <Card className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5" />Compose Official Email</CardTitle>
            <CardDescription>Select recipients and compose your message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Parent Selection */}
            <div>
              <Label>Recipient Selection Mode</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                {([
                  { value: 'all', label: 'All Parents', icon: Users },
                  { value: 'by_class', label: 'By Class', icon: Users },
                  { value: 'by_student', label: 'By Student', icon: Search },
                  { value: 'individual', label: 'Individual', icon: AtSign },
                ] as const).map(m => (
                  <Button
                    key={m.value}
                    variant={selectionMode === m.value ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectionMode(m.value);
                      setSelectedStudentIds(new Set());
                      setSelectedEmails(new Set());
                      setSelectedClassId('');
                    }}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Mode-specific UI */}
            {selectionMode === 'by_class' && (
              <div>
                <Label>Select Class</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose a class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.section && `- ${cls.section}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectionMode === 'by_student' && (
              <div className="space-y-2">
                <Label>Search & Select Students</Label>
                <Input
                  placeholder="Search by student name..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="mt-1.5"
                />
                {selectedStudentIds.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selectedStudentIds).map(id => {
                      const s = activeStudents.find(st => st.id === id);
                      return s ? (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          {s.full_name}
                          <button onClick={() => toggleStudent(id)} className="ml-1 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedStudentIds(new Set())}>
                      Clear All
                    </Button>
                  </div>
                )}
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredStudentsForSearch.slice(0, 50).map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm hover:bg-muted/80 transition-colors ${selectedStudentIds.has(s.id) ? 'bg-primary/10 text-primary font-medium' : ''}`}
                      >
                        {s.full_name} <span className="text-xs text-muted-foreground">— {s.parent_email}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {selectionMode === 'individual' && (
              <div className="space-y-2">
                <Label>Search & Select Parent Emails</Label>
                <Input
                  placeholder="Search by email..."
                  value={emailSearch}
                  onChange={e => setEmailSearch(e.target.value)}
                  className="mt-1.5"
                />
                {selectedEmails.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selectedEmails).map(email => (
                      <Badge key={email} variant="secondary" className="gap-1 pr-1">
                        {email}
                        <button onClick={() => toggleEmail(email)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedEmails(new Set())}>
                      Clear All
                    </Button>
                  </div>
                )}
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-2 space-y-1">
                    {allEmails.slice(0, 50).map(([email, name]) => (
                      <button
                        key={email}
                        onClick={() => toggleEmail(email)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm hover:bg-muted/80 transition-colors ${selectedEmails.has(email) ? 'bg-primary/10 text-primary font-medium' : ''}`}
                      >
                        {email} <span className="text-xs text-muted-foreground">({name})</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Recipient preview */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Selected Recipients</span>
                <Badge variant="secondary">{recipients.length} parent{recipients.length !== 1 ? 's' : ''}</Badge>
              </div>
              {recipients.length > 0 && (
                <ScrollArea className="max-h-32">
                  <div className="space-y-0.5">
                    {recipients.slice(0, 30).map(r => (
                      <p key={r.email} className="text-xs text-muted-foreground">{r.email} — {r.studentName}</p>
                    ))}
                    {recipients.length > 30 && <p className="text-xs text-muted-foreground">...and {recipients.length - 30} more</p>}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            {/* Message Type */}
            <div>
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notice"><span className="flex items-center gap-2"><FileText className="w-4 h-4" />Notice / Circular</span></SelectItem>
                  <SelectItem value="announcement"><span className="flex items-center gap-2"><Bell className="w-4 h-4" />Announcement</span></SelectItem>
                  <SelectItem value="emergency"><span className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4" />Emergency Alert</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {messageType === 'emergency' ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Emergency emails are sent immediately</span>
                  </div>
                </div>
                <div>
                  <Label>Emergency Message</Label>
                  <Textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} placeholder="Describe the emergency situation..." className="mt-1.5 min-h-32" />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label>Subject / Title</Label>
                  <Input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder="Enter notice title..." className="mt-1.5" />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} placeholder="Enter notice content..." className="mt-1.5 min-h-24" />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High (Important)</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              onClick={handleSendClick}
              disabled={isLoading}
              className={`w-full gap-2 ${messageType === 'emergency' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
              variant={messageType === 'emergency' ? 'destructive' : 'default'}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : messageType === 'emergency' ? <AlertTriangle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {messageType === 'emergency' ? 'Send Emergency Alert' : 'Send Email Notice'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Templates */}
        <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Quick Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Holiday Notice', description: 'School closure notification', title: 'Holiday Notice', content: 'Dear Parents,\n\nThis is to inform you that the school will remain closed tomorrow.\n\nRegards,\nSchool Management', priority: 'normal' as const },
              { label: 'PTM Notice', description: 'Parent-Teacher meeting', title: 'Parent-Teacher Meeting', content: 'Dear Parents,\n\nPTM (Parent-Teacher Meeting) is scheduled for this Saturday. Your presence is requested.\n\nRegards,\nSchool Management', priority: 'high' as const },
              { label: 'Fee Reminder', description: 'Fee payment reminder', title: 'Fee Reminder', content: 'Dear Parents,\n\nThis is a gentle reminder regarding pending school fees. Please ensure payment by the due date.\n\nRegards,\nSchool Management', priority: 'normal' as const },
              { label: 'Exam Notice', description: 'Examination schedule', title: 'Examination Schedule', content: 'Dear Parents,\n\nExaminations are scheduled to begin from next week. Please ensure your child is well prepared.\n\nRegards,\nSchool Management', priority: 'high' as const },
            ].map(tpl => (
              <Button key={tpl.label} variant="outline" className="w-full justify-start text-left h-auto py-3" onClick={() => { setMessageType('notice'); setNoticeTitle(tpl.title); setNoticeContent(tpl.content); setPriority(tpl.priority); }}>
                <div><p className="font-medium">{tpl.label}</p><p className="text-xs text-muted-foreground">{tpl.description}</p></div>
              </Button>
            ))}
            <Separator className="my-2" />
            <Button variant="outline" className="w-full justify-start text-left h-auto py-3 border-destructive/30 hover:border-destructive/50" onClick={() => { setMessageType('emergency'); setNoticeContent(''); }}>
              <div><p className="font-medium text-destructive">Emergency Template</p><p className="text-xs text-muted-foreground">For urgent situations only</p></div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">You are about to send an email to <span className="font-bold text-foreground">{recipients.length}</span> parent{recipients.length !== 1 ? 's' : ''}.</p>
            {messageType !== 'emergency' && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="text-sm font-medium">{noticeTitle}</p>
              </div>
            )}
            {messageType === 'emergency' && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">⚠️ This is an emergency alert</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleConfirmSend} variant={messageType === 'emergency' ? 'destructive' : 'default'}>
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
