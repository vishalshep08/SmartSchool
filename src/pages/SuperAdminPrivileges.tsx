import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useStaffPermissions,
  usePermissionHistory,
  ALL_PERMISSIONS,
  PERMISSION_SECTIONS,
  PERMISSION_TEMPLATES,
  getDefaultTemplateName,
} from '@/hooks/useStaffPermissions';
import {
  Lock,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Users,
  UserCog,
  History,
  Check,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function SuperAdminPrivileges() {
  const {
    staffList,
    isLoading,
    getEmployeePermissions,
    hasCustomPermissions,
    togglePermission,
    applyTemplate,
  } = useStaffPermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    attendance: true, homework: true, students: true,
    leave: true, remarks: true, reports: true,
    salary: true, announcements: true, documents: true, fee: true,
  });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [activeTab, setActiveTab] = useState('permissions');

  // Bulk edit state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkTemplateDialogOpen, setBulkTemplateDialogOpen] = useState(false);
  const [bulkTemplateName, setBulkTemplateName] = useState('');

  // Saved indicator
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Get unique departments and employee types
  const departments = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach(s => {
      if ((s as any).department) set.add((s as any).department);
    });
    return Array.from(set);
  }, [staffList]);

  const employeeTypes = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach(s => {
      if ((s as any).employee_type) set.add((s as any).employee_type);
    });
    return Array.from(set);
  }, [staffList]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const name = (s.profile?.full_name || s.employee_id || '').toLowerCase();
      const empId = (s.employee_id || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || name.includes(q) || empId.includes(q);

      const empType = ((s as any).employee_type || '').toLowerCase();
      const matchType = typeFilter === 'all' || empType === typeFilter.toLowerCase();

      const dept = ((s as any).department || '').toLowerCase();
      const matchDept = departmentFilter === 'all' || dept === departmentFilter.toLowerCase();

      return matchSearch && matchType && matchDept;
    });
  }, [staffList, searchQuery, typeFilter, departmentFilter]);

  const selectedStaff = staffList.find(s => s.id === selectedEmployeeId);
  const selectedPermissions = selectedEmployeeId ? getEmployeePermissions(selectedEmployeeId) : {};
  const selectedIsCustom = selectedEmployeeId
    ? hasCustomPermissions(selectedEmployeeId, (selectedStaff as any)?.employee_type, (selectedStaff as any)?.is_class_teacher)
    : false;
  const selectedDefaultTemplate = getDefaultTemplateName(
    (selectedStaff as any)?.employee_type,
    (selectedStaff as any)?.is_class_teacher
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTogglePermission = async (permissionKey: string, newValue: boolean) => {
    if (!selectedEmployeeId || !selectedStaff) return;
    setSavedKey(permissionKey);
    await togglePermission.mutateAsync({
      employeeId: selectedEmployeeId,
      userId: selectedStaff.user_id,
      permissionKey,
      newValue,
    });
    setTimeout(() => setSavedKey(null), 1500);
  };

  const handleApplyTemplate = async () => {
    if (!selectedEmployeeId || !selectedStaff || !selectedTemplate) return;
    await applyTemplate.mutateAsync({
      employeeIds: [selectedEmployeeId],
      userIds: [selectedStaff.user_id],
      templateName: selectedTemplate,
    });
    setTemplateDialogOpen(false);
  };

  const handleBulkApplyTemplate = async () => {
    if (bulkSelected.length === 0 || !bulkTemplateName) return;
    const employees = staffList.filter(s => bulkSelected.includes(s.id));
    await applyTemplate.mutateAsync({
      employeeIds: employees.map(e => e.id),
      userIds: employees.map(e => e.user_id),
      templateName: bulkTemplateName,
    });
    setBulkTemplateDialogOpen(false);
    setBulkSelected([]);
    setBulkMode(false);
  };

  const isPermissionCustom = (permissionKey: string): boolean => {
    if (!selectedEmployeeId || !selectedStaff) return false;
    const template = PERMISSION_TEMPLATES[selectedDefaultTemplate] || {};
    const defaultVal = template[permissionKey] ?? false;
    const currentVal = selectedPermissions[permissionKey] ?? false;
    return defaultVal !== currentVal;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Privilege Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage permissions for all staff members — changes take effect immediately
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
        {/* Left Panel — Staff List */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Staff Members
              </CardTitle>
              <Button
                variant={bulkMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setBulkMode(!bulkMode);
                  setBulkSelected([]);
                }}
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                {bulkMode ? 'Cancel Bulk' : 'Bulk Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {employeeTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="All Depts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk actions */}
            {bulkMode && bulkSelected.length > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-xs font-medium">{bulkSelected.length} selected</span>
                <Button
                  variant="default"
                  size="sm"
                  className="ml-auto text-xs h-7"
                  onClick={() => setBulkTemplateDialogOpen(true)}
                >
                  Apply Template
                </Button>
              </div>
            )}

            {/* Staff List */}
            <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
              <div className="space-y-1 pr-2">
                {filteredStaff.map(staff => {
                  const isSelected = selectedEmployeeId === staff.id;
                  const isCustom = hasCustomPermissions(
                    staff.id,
                    (staff as any).employee_type,
                    (staff as any).is_class_teacher
                  );

                  return (
                    <div
                      key={staff.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                        isSelected
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted border border-transparent'
                      )}
                      onClick={() => {
                        if (bulkMode) {
                          setBulkSelected(prev =>
                            prev.includes(staff.id)
                              ? prev.filter(id => id !== staff.id)
                              : [...prev, staff.id]
                          );
                        } else {
                          setSelectedEmployeeId(staff.id);
                          setActiveTab('permissions');
                        }
                      }}
                    >
                      {bulkMode && (
                        <Checkbox
                          checked={bulkSelected.includes(staff.id)}
                          onCheckedChange={() => {
                            setBulkSelected(prev =>
                              prev.includes(staff.id)
                                ? prev.filter(id => id !== staff.id)
                                : [...prev, staff.id]
                            );
                          }}
                        />
                      )}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {(staff.profile?.full_name || staff.employee_id)
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {staff.profile?.full_name || staff.employee_id}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(staff as any).designation || (staff as any).employee_type || 'Staff'} • {(staff as any).department || 'General'}
                        </p>
                      </div>
                      {isCustom && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200">
                          Custom
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No staff found matching your search
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel — Permission Editor */}
        <Card className="lg:col-span-8">
          {selectedEmployeeId && selectedStaff ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                      <UserCog className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedStaff.profile?.full_name || selectedStaff.employee_id}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(selectedStaff as any).designation || (selectedStaff as any).employee_type || 'Staff'}</span>
                        <span>•</span>
                        <span>{(selectedStaff as any).department || 'General'}</span>
                        {(selectedStaff as any).is_class_teacher && (
                          <Badge variant="secondary" className="text-[10px]">Class Teacher</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setTemplateDialogOpen(true)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Apply Template
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="permissions" className="gap-1.5">
                      <Shield className="w-4 h-4" />
                      Permissions
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                      <History className="w-4 h-4" />
                      History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="permissions">
                    <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px] pr-4">
                      <div className="space-y-3">
                        {Object.entries(PERMISSION_SECTIONS).map(([sectionKey, sectionLabel]) => {
                          const sectionPerms = ALL_PERMISSIONS.filter(p => p.section === sectionKey);
                          if (sectionPerms.length === 0) return null;
                          const isExpanded = expandedSections[sectionKey] ?? true;

                          return (
                            <Collapsible
                              key={sectionKey}
                              open={isExpanded}
                              onOpenChange={() => toggleSection(sectionKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <button className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-sm">{sectionLabel}</span>
                                    <Badge variant="outline" className="text-[10px] ml-1">
                                      {sectionPerms.filter(p => selectedPermissions[p.key]).length}/{sectionPerms.length}
                                    </Badge>
                                  </div>
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-6 mt-2 space-y-2">
                                  {sectionPerms.map(perm => {
                                    const isEnabled = selectedPermissions[perm.key] ?? false;
                                    const isCustom = isPermissionCustom(perm.key);
                                    const isSaved = savedKey === perm.key;

                                    return (
                                      <div
                                        key={perm.key}
                                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <Label className="text-sm font-medium cursor-pointer">
                                              {perm.label}
                                            </Label>
                                            {isCustom && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200"
                                              >
                                                Custom
                                              </Badge>
                                            )}
                                            {isSaved && (
                                              <span className="text-xs text-green-600 flex items-center gap-0.5 animate-fade-up">
                                                <Check className="w-3 h-3" /> Saved
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {perm.description}
                                          </p>
                                        </div>
                                        <Switch
                                          checked={isEnabled}
                                          onCheckedChange={(checked) =>
                                            handleTogglePermission(perm.key, checked)
                                          }
                                          disabled={togglePermission.isPending}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="history">
                    <PermissionHistoryPanel employeeId={selectedEmployeeId} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <Shield className="w-16 h-16 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground">Select a Staff Member</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Click on a staff member from the list to view and edit their permissions.
                Changes take effect immediately — no re-login required.
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Apply Template Dialog (Single) */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Apply Permission Template
            </DialogTitle>
            <DialogDescription>
              This will reset all custom permissions for{' '}
              <strong>{selectedStaff?.profile?.full_name || 'this staff member'}</strong>{' '}
              to the selected template defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PERMISSION_TEMPLATES).map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || applyTemplate.isPending}
            >
              {applyTemplate.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Apply Template Dialog */}
      <Dialog open={bulkTemplateDialogOpen} onOpenChange={setBulkTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Bulk Apply Template
            </DialogTitle>
            <DialogDescription>
              Apply template permissions to <strong>{bulkSelected.length}</strong> selected staff members.
              This will override their current custom permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Select Template</Label>
            <Select value={bulkTemplateName} onValueChange={setBulkTemplateName}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PERMISSION_TEMPLATES).map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkApplyTemplate}
              disabled={!bulkTemplateName || applyTemplate.isPending}
            >
              {applyTemplate.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Apply to {bulkSelected.length} Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Permission History Sub-component
function PermissionHistoryPanel({ employeeId }: { employeeId: string }) {
  const { data: history = [], isLoading } = usePermissionHistory(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>No permission changes recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
      <div className="space-y-2 pr-4">
        {history.map((item: any, i: number) => (
          <div key={item.id || i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <History className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {item.permission_key || item.record_affected || 'Permission changed'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {item.old_value !== undefined && (
                  <>
                    <Badge variant={item.old_value ? 'default' : 'outline'} className="text-[10px]">
                      {item.old_value ? 'ON' : 'OFF'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge variant={item.new_value ? 'default' : 'outline'} className="text-[10px]">
                      {item.new_value ? 'ON' : 'OFF'}
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {item.changed_by_name || item.performed_by_name || 'Super Admin'} •{' '}
                {item.created_at
                  ? (() => {
                    try {
                      return format(parseISO(item.created_at), 'dd/MM/yyyy hh:mm a');
                    } catch {
                      return item.created_at;
                    }
                  })()
                  : 'Unknown date'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
