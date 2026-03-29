import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useClasses, useStudents } from '@/hooks/useStudents';
import {
    useAttendanceExport,
    type ExportFilters,
    type DateRangePreset,
    type ExportFormat,
    type AttendanceStatusFilter,
} from '@/hooks/useAttendanceExport';
import {
    Download,
    FileSpreadsheet,
    FileText,
    FileDown,
    Eye,
    Loader2,
    Calendar,
    Users,
    Filter,
    CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceExportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** If set, locks class selection to this class ID */
    lockedClassId?: string;
}

const datePresets: { value: DateRangePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' },
];

const statusOptions: { value: AttendanceStatusFilter; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'present', label: 'Present Only' },
    { value: 'absent', label: 'Absent Only' },
    { value: 'half_day', label: 'Half Day Only' },
    { value: 'late', label: 'Late Only' },
];

const formatOptions: { value: ExportFormat; label: string; icon: React.ElementType; desc: string }[] = [
    { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, desc: 'Color-coded cells, frozen columns' },
    { value: 'pdf', label: 'PDF', icon: FileText, desc: 'Print-ready with header/footer' },
    { value: 'csv', label: 'CSV', icon: FileDown, desc: 'Plain text for external tools' },
];

export function AttendanceExportModal({ open, onOpenChange, lockedClassId }: AttendanceExportModalProps) {
    const { classes } = useClasses();
    const [selectedClassId, setSelectedClassId] = useState(lockedClassId || '');
    const { students } = useStudents(selectedClassId || undefined);
    const { doExport, getPreviewCount, previewCount, isExporting } = useAttendanceExport();

    const [filters, setFilters] = useState<ExportFilters>({
        classId: lockedClassId || '',
        studentId: 'all',
        dateRangePreset: 'this_month',
        customFrom: new Date().toISOString().split('T')[0],
        customTo: new Date().toISOString().split('T')[0],
        statusFilter: 'all',
        exportFormat: 'xlsx',
    });

    // Sync locked class
    useEffect(() => {
        if (lockedClassId) {
            setSelectedClassId(lockedClassId);
            setFilters(f => ({ ...f, classId: lockedClassId }));
        }
    }, [lockedClassId]);

    const handleClassChange = (val: string) => {
        setSelectedClassId(val);
        setFilters(f => ({ ...f, classId: val, studentId: 'all' }));
    };

    const handlePreview = async () => {
        if (!filters.classId) {
            toast.error('Please select a class');
            return;
        }
        await getPreviewCount(filters);
    };

    const handleExport = async () => {
        if (!filters.classId) {
            toast.error('Please select a class');
            return;
        }
        try {
            await doExport(filters);
            toast.success('Export completed successfully!');
            onOpenChange(false);
        } catch (err: any) {
            toast.error(`Export failed: ${err.message}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Download className="w-5 h-5 text-primary" />
                        Export Attendance Report
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Class Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            Select Class <span className="text-destructive">*</span>
                        </Label>
                        {lockedClassId ? (
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="py-1.5 px-3">
                                    {classes.find(c => c.id === lockedClassId)?.name || 'Your Class'}
                                    {classes.find(c => c.id === lockedClassId)?.section
                                        ? ` - ${classes.find(c => c.id === lockedClassId)!.section}`
                                        : ''}
                                </Badge>
                                <span className="text-xs text-muted-foreground">(Auto-selected)</span>
                            </div>
                        ) : (
                            <Select value={filters.classId} onValueChange={handleClassChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.name} {cls.section && `- ${cls.section}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Student Filter */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Select Student (optional)</Label>
                        <Select
                            value={filters.studentId}
                            onValueChange={val => setFilters(f => ({ ...f, studentId: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Students" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Students</SelectItem>
                                {students.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.full_name} ({s.admission_number})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            Date Range <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={filters.dateRangePreset}
                            onValueChange={(val: DateRangePreset) => setFilters(f => ({ ...f, dateRangePreset: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {datePresets.map(p => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {filters.dateRangePreset === 'custom' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div>
                                    <Label className="text-xs">From</Label>
                                    <Input
                                        type="date"
                                        value={filters.customFrom}
                                        onChange={e => setFilters(f => ({ ...f, customFrom: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">To</Label>
                                    <Input
                                        type="date"
                                        value={filters.customTo}
                                        onChange={e => setFilters(f => ({ ...f, customTo: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            Attendance Status
                        </Label>
                        <Select
                            value={filters.statusFilter}
                            onValueChange={(val: AttendanceStatusFilter) => setFilters(f => ({ ...f, statusFilter: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Export Format */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Export Format <span className="text-destructive">*</span></Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {formatOptions.map(opt => {
                                const Icon = opt.icon;
                                const isSelected = filters.exportFormat === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFilters(f => ({ ...f, exportFormat: opt.value }))}
                                        className={cn(
                                            'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-center',
                                            isSelected
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5'
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-xs font-medium">{opt.label}</span>
                                        <span className="text-[10px] opacity-70">{opt.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview */}
                    {previewCount !== null && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <CheckCircle className="w-4 h-4 text-primary" />
                            <span className="text-sm">
                                <strong>{previewCount}</strong> records match your filters
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={handlePreview}
                            disabled={isExporting || !filters.classId}
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </Button>
                        <Button
                            variant="gradient"
                            className="flex-1 gap-2"
                            onClick={handleExport}
                            disabled={isExporting || !filters.classId}
                        >
                            {isExporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {isExporting ? 'Exporting...' : 'Export'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
