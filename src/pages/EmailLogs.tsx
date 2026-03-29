import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailLogs, EmailType, EmailStatus } from '@/hooks/useEmailNotification';
import { formatDateIndian, formatTimeFromDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  AlertTriangle,
  BookOpen,
  Bell,
  Calendar,
  Star,
  Loader2,
  Filter,
  AlertCircle,
} from 'lucide-react';

const typeConfig: Record<EmailType, { label: string; icon: React.ElementType; color: string }> = {
  attendance: { label: 'Attendance', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  homework: { label: 'Homework', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
  notice: { label: 'Notice', icon: Bell, color: 'bg-yellow-100 text-yellow-700' },
  leave: { label: 'Leave', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
  remark: { label: 'Remark', icon: Star, color: 'bg-orange-100 text-orange-700' },
  event: { label: 'Event', icon: Calendar, color: 'bg-pink-100 text-pink-700' },
  alert: { label: 'Alert', icon: AlertTriangle, color: 'bg-red-200 text-red-800' },
  custom: { label: 'Custom', icon: Mail, color: 'bg-muted text-muted-foreground' },
};

const statusConfig: Record<EmailStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Sent', icon: Send, color: 'bg-blue-100 text-blue-700' },
  failed: { label: 'Failed', icon: XCircle, color: 'bg-red-100 text-red-700' },
};

export default function EmailLogs() {
  const { role } = useAuth();
  const [filterType, setFilterType] = useState<EmailType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<EmailStatus | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { logs, isLoading, stats, statsByType } = useEmailLogs({
    type: filterType === 'all' ? undefined : filterType,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  if (role !== 'principal') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only principals can view email logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-foreground">Email Logs</h1>
        <p className="text-muted-foreground mt-1">Track all email notifications sent to parents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By type */}
      <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Emails by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {(Object.entries(statsByType) as [EmailType, number][]).map(([type, count]) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              return (
                <div key={type} className={`p-3 rounded-lg ${cfg.color} text-center`}>
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs font-medium">{cfg.label}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={filterType} onValueChange={(v) => setFilterType(v as EmailType | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Email Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.entries(typeConfig) as [EmailType, (typeof typeConfig)[EmailType]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as EmailStatus | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {(Object.entries(statusConfig) as [EmailStatus, (typeof statusConfig)[EmailStatus]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Message History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No emails found</h3>
              <p className="text-muted-foreground text-sm">
                Email notifications will appear here once sent.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const tCfg = typeConfig[log.type] || typeConfig.custom;
                    const sCfg = statusConfig[log.status] || statusConfig.pending;
                    const TypeIcon = tCfg.icon;
                    const StatusIcon = sCfg.icon;

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className={tCfg.color}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {tCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.recipient_email}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{log.subject}</TableCell>
                        <TableCell>
                          <Badge className={sCfg.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {sCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateIndian(new Date(log.created_at))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-mono font-medium break-all">{selectedLog.recipient_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <Badge className={typeConfig[selectedLog.type as EmailType]?.color}>
                    {typeConfig[selectedLog.type as EmailType]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedLog.status as EmailStatus]?.color}>
                    {statusConfig[selectedLog.status as EmailStatus]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Sent At</p>
                  <p className="font-medium">{formatDateIndian(new Date(selectedLog.created_at))}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm">Subject</p>
                <p className="font-medium mt-1">{selectedLog.subject}</p>
              </div>

              {selectedLog.failure_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{selectedLog.failure_reason}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-sm mb-2">Email Body</p>
                <ScrollArea className="h-48 rounded-lg border p-3">
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                  />
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
