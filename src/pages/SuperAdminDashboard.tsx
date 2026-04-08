import { useState } from 'react';
import { useSuperAdminActivityLog } from '@/hooks/useSuperAdminActivityLog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, ScrollText, Filter } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_TYPES = ['all', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'];
const MODULES = ['all', 'Students', 'Staff', 'Attendance', 'Fee', 'Reports', 'Auth', 'Homework', 'Settings', 'Events', 'Notices', 'Documents', 'Email'];

const actionBadgeColor: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  EXPORT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function SuperAdminDashboard() {
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('all');
  const [module, setModule] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useSuperAdminActivityLog({
    search,
    actionType,
    module,
    dateFrom,
    dateTo,
    page,
    pageSize,
  });

  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-primary" />
          Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Read-only audit trail of all admin actions
        </p>
      </div>

      {/* Filters */}
      <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, action, module..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={actionType} onValueChange={(v) => { setActionType(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(a => (
                  <SelectItem key={a} value={a}>{a === 'all' ? 'All Actions' : a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map(m => (
                  <SelectItem key={m} value={m}>{m === 'all' ? 'All Modules' : m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              placeholder="To"
            />
          </div>
        </CardContent>
      </Card>

      {/* Count */}
      <div className="text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: '150ms' }}>
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <span>Total entries: <strong className="text-foreground">{data?.totalCount ?? 0}</strong></span>
        )}
      </div>

      {/* Table */}
      <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="min-w-[200px]">Record Affected</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell className="font-medium">{log.performed_by_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{log.performed_by_role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${actionBadgeColor[log.action_type] || 'bg-muted text-muted-foreground'}`}>
                        {log.action_type}
                      </span>
                    </TableCell>
                    <TableCell>{log.module}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate" title={log.record_affected}>
                      {log.record_affected}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.ip_address}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
