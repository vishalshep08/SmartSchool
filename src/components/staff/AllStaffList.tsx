import { useState, useMemo } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
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
import { Search, Eye, Edit, UserX, UserCheck, Download, Loader2 } from 'lucide-react';
import { formatDateIndian } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface AllStaffListProps {
  onViewProfile: (id: string) => void;
}

export function AllStaffList({ onViewProfile }: AllStaffListProps) {
  const { staff, isLoading } = useStaff();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
  });

  const departments = useMemo(() => {
    const depts = new Set(staff.map(s => s.department).filter(Boolean));
    return Array.from(depts);
  }, [staff.length]);

  const filtered = useMemo(() => {
    return staff.filter(s => {
      const matchSearch = !search || 
        s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.employee_id.toLowerCase().includes(search.toLowerCase()) ||
        s.profile?.email?.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || s.employee_type === typeFilter;
      const matchDept = deptFilter === 'all' || s.department === deptFilter;
      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'Active' ? s.is_active : !s.is_active);
      return matchSearch && matchType && matchDept && matchStatus;
    });
  }, [staff.length, search, typeFilter, deptFilter, statusFilter]);

  const handleExport = () => {
    const headers = ['Employee ID', 'Name', 'Designation', 'Department', 'Type', 'Status', 'Email'];
    const rows = filtered.map(s => [
      s.employee_id,
      s.profile?.full_name || '',
      s.designation || '',
      s.department || '',
      s.employee_type || '',
      s.is_active ? 'Active' : 'Inactive',
      s.profile?.email || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Employee Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Teaching">Teaching</SelectItem>
              <SelectItem value="Non-Teaching">Non-Teaching</SelectItem>
              <SelectItem value="Management">Management</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d!}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {staff.length} staff members
        </p>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(emp => (
                <TableRow key={emp.id} className="cursor-pointer" onClick={() => onViewProfile(emp.id)}>
                  <TableCell className="font-mono text-sm">{emp.employee_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {emp.profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{emp.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{emp.profile?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{emp.designation || emp.subject || '—'}</TableCell>
                  <TableCell>{emp.department || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{emp.employee_type || 'Teaching'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      'text-xs',
                      emp.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'
                    )}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onViewProfile(emp.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
