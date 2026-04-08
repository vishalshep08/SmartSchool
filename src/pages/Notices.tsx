import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotices, NoticeType, NoticePriority, TargetAudience, CreateNoticeData } from '@/hooks/useNotices';
import { useClasses, useStudents } from '@/hooks/useStudents';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useEmailNotification } from '@/hooks/useEmailNotification';
import { formatDateIndian } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Check, 
  Trash2,
  Bell,
  AlertTriangle,
  Megaphone,
  Users,
  Loader2,
  Send,
} from 'lucide-react';

const noticeTypes: { value: NoticeType; label: string; icon: typeof Bell }[] = [
  { value: 'general', label: 'General', icon: Megaphone },
  { value: 'class', label: 'Class Notice', icon: Users },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle },
  { value: 'event', label: 'Event', icon: Bell },
];

const priorities: { value: NoticePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const priorityColors: Record<NoticePriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function Notices() {
  const { role, user } = useAuth();
  const { notices, isLoading, createNotice, approveNotice, deleteNotice, refetch } = useNotices();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { sendNoticeNotification, isLoading: isSendingEmail } = useEmailNotification();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Realtime subscription
  useRealtimeSubscription({
    table: 'notices',
    onChange: refetch,
  });

  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    notice_type: NoticeType;
    target_audience: TargetAudience;
    class_id: string;
    priority: NoticePriority;
    expires_at: string;
  }>({
    title: '',
    content: '',
    notice_type: 'general',
    target_audience: 'all',
    class_id: '',
    priority: 'normal',
    expires_at: '',
  });

  const handleSubmitNotice = async () => {
    if (!user) return;

    const noticeData: CreateNoticeData = {
      title: formData.title,
      content: formData.content,
      notice_type: formData.notice_type,
      target_audience: formData.target_audience,
      class_id: formData.class_id || undefined,
      created_by: user.id,
      priority: formData.priority,
      expires_at: formData.expires_at || undefined,
    };

    await createNotice.mutateAsync(noticeData);
    setIsDialogOpen(false);
    setFormData({
      title: '',
      content: '',
      notice_type: 'general',
      target_audience: 'all',
      class_id: '',
      priority: 'normal',
      expires_at: '',
    });
  };

  const handleApprove = async (notice: any) => {
    await approveNotice.mutateAsync(notice.id);
    
    // Send email notification to parents
    const parentEmails = students
      .filter(s => s.parent_email)
      .map(s => s.parent_email!);

    if (parentEmails.length > 0) {
      try {
        await sendNoticeNotification(
          parentEmails,
          notice.title,
          notice.content,
          notice.priority as NoticePriority
        );
      } catch (error) {
        console.error('Failed to send email notifications:', error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNotice.mutateAsync(id);
  };

  // Filter notices
  const filteredNotices = notices.filter(notice => {
    if (filter === 'pending') return !notice.is_approved;
    if (filter === 'approved') return notice.is_approved;
    return true;
  });

  const pendingCount = notices.filter(n => !n.is_approved).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Notices & Announcements
          </h1>
          <p className="text-muted-foreground">
            {role === 'principal' 
              ? 'Manage school-wide notices and announcements'
              : 'Create and view notices for your classes'
            }
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: 'all' | 'pending' | 'approved') => setFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notices</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Notice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Notice title..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={formData.notice_type}
                      onValueChange={(value: NoticeType) => 
                        setFormData(prev => ({ ...prev, notice_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {noticeTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: NoticePriority) => 
                        setFormData(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Target Audience</Label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(value: TargetAudience) => 
                        setFormData(prev => ({ ...prev, target_audience: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="teachers">Teachers Only</SelectItem>
                        <SelectItem value="students">Students Only</SelectItem>
                        <SelectItem value="class">Specific Class</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.target_audience === 'class' && (
                    <div>
                      <Label>Class</Label>
                      <Select
                        value={formData.class_id}
                        onValueChange={(value) => 
                          setFormData(prev => ({ ...prev, class_id: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} {cls.section && `- ${cls.section}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Notice content..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Expires On (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={e => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={handleSubmitNotice} 
                  className="w-full"
                  disabled={!formData.title || !formData.content}
                >
                  {role === 'principal' ? 'Publish Notice' : 'Submit for Approval'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notices Grid */}
      {filteredNotices.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notices found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotices.map(notice => (
              <Card key={notice.id} className={!notice.is_approved ? 'border-dashed border-yellow-400' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{notice.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      by {(notice as any).creator_profile?.full_name || 'Unknown'} • {formatDateIndian(new Date(notice.created_at))}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className={priorityColors[notice.priority as NoticePriority]}>
                      {notice.priority}
                    </Badge>
                    {!notice.is_approved && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                        Pending Approval
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {notice.content}
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {notice.notice_type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {notice.target_audience === 'class' 
                      ? notice.classes?.name || 'Class'
                      : notice.target_audience
                    }
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-0 gap-2">
                {role === 'principal' && !notice.is_approved && (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(notice)}
                    disabled={isSendingEmail}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve & Notify
                  </Button>
                )}
                {(role === 'principal' || notice.created_by === user?.id) && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600"
                    onClick={() => handleDelete(notice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
