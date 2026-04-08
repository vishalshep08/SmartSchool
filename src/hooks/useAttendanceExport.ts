import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminActionLogger } from './useAdminActionLogger';
import { useSchoolName } from './useSchoolSettings';
import { format, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';
export type ExportFormat = 'xlsx' | 'pdf' | 'csv';
export type AttendanceStatusFilter = 'all' | 'present' | 'absent' | 'half_day' | 'late';

export interface ExportFilters {
    classId: string;
    studentId: string;
    dateRangePreset: DateRangePreset;
    customFrom: string;
    customTo: string;
    statusFilter: AttendanceStatusFilter;
    exportFormat: ExportFormat;
}

interface AttendanceExportRecord {
    student_id: string;
    student_name: string;
    admission_number: string;
    roll_no: string;
    date: string;
    status: string;
}

function getDateRange(preset: DateRangePreset, customFrom: string, customTo: string): { from: string; to: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
        case 'today':
            return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
        case 'yesterday': {
            const yd = subDays(today, 1);
            return { from: format(yd, 'yyyy-MM-dd'), to: format(yd, 'yyyy-MM-dd') };
        }
        case 'this_week': {
            const ws = startOfWeek(today, { weekStartsOn: 1 });
            return { from: format(ws, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
        }
        case 'last_week': {
            const pw = subWeeks(today, 1);
            const ws = startOfWeek(pw, { weekStartsOn: 1 });
            const we = endOfWeek(pw, { weekStartsOn: 1 });
            return { from: format(ws, 'yyyy-MM-dd'), to: format(we, 'yyyy-MM-dd') };
        }
        case 'this_month': {
            const ms = startOfMonth(today);
            return { from: format(ms, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
        }
        case 'last_month': {
            const pm = subMonths(today, 1);
            const ms = startOfMonth(pm);
            const me = endOfMonth(pm);
            return { from: format(ms, 'yyyy-MM-dd'), to: format(me, 'yyyy-MM-dd') };
        }
        case 'custom':
            return { from: customFrom, to: customTo };
        default:
            return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    }
}

export function useAttendanceExport() {
    const { profile, role } = useAuth();
    const { logAction } = useAdminActionLogger();
    const schoolName = useSchoolName();
    const [isExporting, setIsExporting] = useState(false);
    const [previewCount, setPreviewCount] = useState<number | null>(null);

    const fetchExportData = async (filters: ExportFilters) => {
        const { from, to } = getDateRange(filters.dateRangePreset, filters.customFrom, filters.customTo);

        let query = supabase
            .from('student_attendance')
            .select('student_id, date, status, students(full_name, admission_number)')
            .gte('date', from)
            .lte('date', to);

        if (filters.classId && filters.classId !== 'all') {
            query = query.eq('class_id', filters.classId);
        }

        if (filters.studentId && filters.studentId !== 'all') {
            query = query.eq('student_id', filters.studentId);
        }

        if (filters.statusFilter && filters.statusFilter !== 'all') {
            query = query.eq('status', filters.statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
            records: (data || []).map((r: any) => ({
                student_id: r.student_id,
                student_name: r.students?.full_name || 'Unknown',
                admission_number: r.students?.admission_number || '',
                roll_no: r.students?.admission_number || '',
                date: r.date,
                status: r.status,
            })) as AttendanceExportRecord[],
            from,
            to,
        };
    };

    const getPreviewCount = async (filters: ExportFilters) => {
        try {
            const { records } = await fetchExportData(filters);
            setPreviewCount(records.length);
            return records.length;
        } catch {
            setPreviewCount(0);
            return 0;
        }
    };

    const getClassName = async (classId: string) => {
        if (!classId || classId === 'all') return 'All Classes';
        const { data } = await supabase.from('classes').select('name, section').eq('id', classId).single();
        return data ? `${data.name}${data.section ? ` - ${data.section}` : ''}` : 'Unknown';
    };

    const buildPivotData = (records: AttendanceExportRecord[], from: string, to: string) => {
        const dates = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });

        // Group by student
        const studentsMap = new Map<string, { name: string; roll: string; attendance: Map<string, string> }>();

        records.forEach(r => {
            if (!studentsMap.has(r.student_id)) {
                studentsMap.set(r.student_id, {
                    name: r.student_name,
                    roll: r.roll_no,
                    attendance: new Map(),
                });
            }
            studentsMap.get(r.student_id)!.attendance.set(r.date, r.status);
        });

        const rows: Array<{
            rollNo: string;
            name: string;
            dailyStatus: string[];
            totalPresent: number;
            percentage: number;
        }> = [];

        studentsMap.forEach(student => {
            const dailyStatus = dates.map(d => {
                const key = format(d, 'yyyy-MM-dd');
                const st = student.attendance.get(key);
                if (!st) return '-';
                if (st === 'present') return 'P';
                if (st === 'absent') return 'A';
                if (st === 'half_day') return 'H';
                if (st === 'late') return 'L';
                return '-';
            });

            const totalPresent = dailyStatus.filter(s => s === 'P').length;
            const totalDays = dailyStatus.filter(s => s !== '-').length;

            rows.push({
                rollNo: student.roll,
                name: student.name,
                dailyStatus,
                totalPresent,
                percentage: totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0,
            });
        });

        // Sort by roll number
        rows.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }));

        return { rows, dates };
    };

    const exportExcel = async (filters: ExportFilters) => {
        setIsExporting(true);
        try {
            const { records, from, to } = await fetchExportData(filters);
            const className = await getClassName(filters.classId);
            const { rows, dates } = buildPivotData(records, from, to);
            const dateHeaders = dates.map(d => format(d, 'dd/MM'));

            // Build worksheet data
            const wsData: any[][] = [];

            // Header rows
            wsData.push([schoolName]);
            wsData.push(['Attendance Report']);
            wsData.push([
                `Class: ${className}`,
                '',
                `Date Range: ${format(parseISO(from), 'dd/MM/yyyy')} to ${format(parseISO(to), 'dd/MM/yyyy')}`,
                '',
                `Generated by: ${profile?.fullName || 'Admin'} (${role || 'admin'})`,
                '',
                `Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`,
            ]);
            wsData.push([]); // spacer

            // Column headers
            wsData.push(['Roll No', 'Student Name', ...dateHeaders, 'Total Present', 'Attendance %']);

            // Data rows
            rows.forEach(row => {
                wsData.push([row.rollNo, row.name, ...row.dailyStatus, row.totalPresent, `${row.percentage}%`]);
            });

            // Summary row
            const totalStudents = rows.length;
            const avgAttendance = totalStudents > 0
                ? Math.round(rows.reduce((s, r) => s + r.percentage, 0) / totalStudents)
                : 0;
            wsData.push([]);
            wsData.push([`Total Students: ${totalStudents}`, '', ...Array(dateHeaders.length).fill(''), '', `Avg Attendance: ${avgAttendance}%`]);

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Merge header cells
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: dateHeaders.length + 3 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: dateHeaders.length + 3 } },
            ];

            // Column widths
            ws['!cols'] = [
                { wch: 10 }, // Roll No
                { wch: 22 }, // Name
                ...dateHeaders.map(() => ({ wch: 7 })),
                { wch: 14 }, // Total Present
                { wch: 14 }, // %
            ];

            // Apply cell styles (background colors for status)
            const dataStartRow = 4; // Row 5 is index 4 (0-based)
            for (let ri = 0; ri < rows.length; ri++) {
                for (let ci = 0; ci < dates.length; ci++) {
                    const cellRef = XLSX.utils.encode_cell({ r: dataStartRow + 1 + ri, c: ci + 2 });
                    const cell = ws[cellRef];
                    if (cell) {
                        const val = cell.v;
                        if (val === 'P') cell.s = { fill: { fgColor: { rgb: 'C6EFCE' } }, font: { color: { rgb: '006100' } } };
                        else if (val === 'A') cell.s = { fill: { fgColor: { rgb: 'FFC7CE' } }, font: { color: { rgb: '9C0006' } } };
                        else if (val === 'H') cell.s = { fill: { fgColor: { rgb: 'FFEB9C' } }, font: { color: { rgb: '9C6500' } } };
                        else if (val === 'L') cell.s = { fill: { fgColor: { rgb: 'BDD7EE' } }, font: { color: { rgb: '1F4E79' } } };
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
            XLSX.writeFile(wb, `Attendance_Report_${className.replace(/\s+/g, '_')}_${from}_to_${to}.xlsx`);

            await logAction({
                actionType: 'EXPORT',
                module: 'Attendance',
                recordAffected: `Attendance export — Class ${className}, ${from} to ${to}, Format: Excel, by ${profile?.fullName || 'Admin'}`,
            });
        } finally {
            setIsExporting(false);
        }
    };

    const exportPDF = async (filters: ExportFilters) => {
        setIsExporting(true);
        try {
            const { records, from, to } = await fetchExportData(filters);
            const className = await getClassName(filters.classId);
            const { rows, dates } = buildPivotData(records, from, to);
            const dateHeaders = dates.map(d => format(d, 'dd/MM'));

            const doc = new jsPDF({ orientation: dates.length > 10 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

            const pageWidth = doc.internal.pageSize.getWidth();
            // Explicitly coerce to string — jsPDF doc.text() throws if it receives a non-string
            const safeSchoolName = typeof schoolName === 'string' && schoolName ? schoolName : '';
            const generatedBy = typeof (profile as any)?.fullName === 'string' ? (profile as any).fullName : (typeof (profile as any)?.full_name === 'string' ? (profile as any).full_name : 'Admin');
            const generatedOn = format(new Date(), 'dd/MM/yyyy hh:mm a');

            // Header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(safeSchoolName, pageWidth / 2, 15, { align: 'center' });

            doc.setFontSize(14);
            doc.text('Student Attendance Report', pageWidth / 2, 23, { align: 'center' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Class: ${className}  |  Date Range: ${format(parseISO(from), 'dd/MM/yyyy')} to ${format(parseISO(to), 'dd/MM/yyyy')}  |  Generated by: ${generatedBy}  |  ${generatedOn}`,
                pageWidth / 2, 30, { align: 'center' }
            );

            // Table data
            const head = [['Roll No', 'Student Name', ...dateHeaders, 'Total Present', 'Attendance %']];
            const body = rows.map(row => [
                row.rollNo,
                row.name,
                ...row.dailyStatus,
                row.totalPresent.toString(),
                `${row.percentage}%`,
            ]);

            // Summary row
            const totalStudents = rows.length;
            const avgAttendance = totalStudents > 0
                ? Math.round(rows.reduce((s, r) => s + r.percentage, 0) / totalStudents)
                : 0;
            body.push([
                `Total: ${totalStudents}`,
                '',
                ...Array(dateHeaders.length).fill(''),
                '',
                `Avg: ${avgAttendance}%`,
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 35,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], fontSize: 7, halign: 'center' },
                bodyStyles: { fontSize: 7, halign: 'center' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 12 },
                    1: { halign: 'left', cellWidth: 30 },
                },
                styles: { cellPadding: 1.5, overflow: 'linebreak' },
                didDrawPage: (data: any) => {
                    // Footer
                    const pageCount = (doc as any).internal.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
                    doc.text(`Generated on ${generatedOn} by ${generatedBy}`, 14, doc.internal.pageSize.getHeight() - 10);
                    doc.text(safeSchoolName, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
                },
            });

            doc.save(`Attendance_Report_${className.replace(/\s+/g, '_')}_${from}_to_${to}.pdf`);

            await logAction({
                actionType: 'EXPORT',
                module: 'Attendance',
                recordAffected: `Attendance export — Class ${className}, ${from} to ${to}, Format: PDF, by ${profile?.fullName || 'Admin'}`,
            });
        } finally {
            setIsExporting(false);
        }
    };

    const exportCSV = async (filters: ExportFilters) => {
        setIsExporting(true);
        try {
            const { records, from, to } = await fetchExportData(filters);
            const className = await getClassName(filters.classId);
            const { rows, dates } = buildPivotData(records, from, to);
            const dateHeaders = dates.map(d => format(d, 'dd/MM'));

            const generatedBy = profile?.fullName || 'Admin';
            const generatedOn = format(new Date(), 'dd/MM/yyyy hh:mm a');

            const csvLines: string[] = [];

            // Metadata rows
            csvLines.push(`"${schoolName}","Attendance Report","${className}","${from} to ${to}","${generatedBy}","${generatedOn}"`);
            csvLines.push('');

            // Column headers
            csvLines.push(['Roll No', 'Student Name', ...dateHeaders, 'Total Present', 'Attendance %'].map(h => `"${h}"`).join(','));

            // Data rows
            rows.forEach(row => {
                csvLines.push([
                    `"${row.rollNo}"`,
                    `"${row.name}"`,
                    ...row.dailyStatus.map(s => `"${s}"`),
                    `"${row.totalPresent}"`,
                    `"${row.percentage}%"`,
                ].join(','));
            });

            const csvContent = csvLines.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Attendance_Report_${className.replace(/\s+/g, '_')}_${from}_to_${to}.csv`;
            link.click();

            await logAction({
                actionType: 'EXPORT',
                module: 'Attendance',
                recordAffected: `Attendance export — Class ${className}, ${from} to ${to}, Format: CSV, by ${profile?.fullName || 'Admin'}`,
            });
        } finally {
            setIsExporting(false);
        }
    };

    const doExport = async (filters: ExportFilters) => {
        switch (filters.exportFormat) {
            case 'xlsx':
                return exportExcel(filters);
            case 'pdf':
                return exportPDF(filters);
            case 'csv':
                return exportCSV(filters);
        }
    };

    return {
        doExport,
        getPreviewCount,
        previewCount,
        isExporting,
    };
}
