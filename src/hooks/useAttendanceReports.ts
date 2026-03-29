import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  students?: {
    full_name: string;
    admission_number: string;
  };
}

interface AttendanceReportData {
  date: string;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  total: number;
  percentage: number;
}

interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  admission_number: string;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  total_days: number;
  attendance_percentage: number;
}

export function useAttendanceReports(classId: string, period: ReportPeriod, date: Date) {
  const getDateRange = () => {
    switch (period) {
      case 'daily':
        return { start: date, end: date };
      case 'weekly':
        return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(date), end: endOfMonth(date) };
    }
  };

  const { start, end } = getDateRange();
  const startDate = format(start, 'yyyy-MM-dd');
  const endDate = format(end, 'yyyy-MM-dd');

  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ['attendance-report', classId, period, startDate, endDate],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*, students(full_name, admission_number)')
        .eq('class_id', classId)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // Generate daily breakdown
  const dailyBreakdown: AttendanceReportData[] = eachDayOfInterval({ start, end }).map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayRecords = attendanceData.filter(r => r.date === dayStr);
    const total = dayRecords.length;
    const present = dayRecords.filter(r => r.status === 'present').length;
    const absent = dayRecords.filter(r => r.status === 'absent').length;
    const late = dayRecords.filter(r => r.status === 'late').length;
    const half_day = dayRecords.filter(r => r.status === 'half_day').length;
    
    return {
      date: dayStr,
      present,
      absent,
      late,
      half_day,
      total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });

  // Generate student-wise summary
  const studentSummary: StudentAttendanceSummary[] = [];
  const studentMap = new Map<string, StudentAttendanceSummary>();
  
  attendanceData.forEach(record => {
    if (!studentMap.has(record.student_id)) {
      studentMap.set(record.student_id, {
        student_id: record.student_id,
        student_name: record.students?.full_name || 'Unknown',
        admission_number: record.students?.admission_number || '',
        present: 0,
        absent: 0,
        late: 0,
        half_day: 0,
        total_days: 0,
        attendance_percentage: 0,
      });
    }
    
    const summary = studentMap.get(record.student_id)!;
    summary.total_days++;
    summary[record.status]++;
  });

  studentMap.forEach(summary => {
    summary.attendance_percentage = summary.total_days > 0 
      ? Math.round((summary.present / summary.total_days) * 100) 
      : 0;
    studentSummary.push(summary);
  });

  // Overall stats
  const overallStats = {
    totalRecords: attendanceData.length,
    present: attendanceData.filter(r => r.status === 'present').length,
    absent: attendanceData.filter(r => r.status === 'absent').length,
    late: attendanceData.filter(r => r.status === 'late').length,
    half_day: attendanceData.filter(r => r.status === 'half_day').length,
    averageAttendance: dailyBreakdown.length > 0 
      ? Math.round(dailyBreakdown.reduce((sum, d) => sum + d.percentage, 0) / dailyBreakdown.length)
      : 0,
  };

  return {
    attendanceData,
    dailyBreakdown,
    studentSummary: studentSummary.sort((a, b) => a.student_name.localeCompare(b.student_name)),
    overallStats,
    isLoading,
    dateRange: { start: startDate, end: endDate },
  };
}

// Generate CSV content for export
export function generateAttendanceCSV(
  studentSummary: StudentAttendanceSummary[],
  dateRange: { start: string; end: string }
): string {
  const headers = ['Admission No', 'Student Name', 'Present', 'Absent', 'Late', 'Half Day', 'Total Days', 'Attendance %'];
  const rows = studentSummary.map(s => [
    s.admission_number,
    s.student_name,
    s.present,
    s.absent,
    s.late,
    s.half_day,
    s.total_days,
    `${s.attendance_percentage}%`,
  ]);

  const csv = [
    `Attendance Report: ${dateRange.start} to ${dateRange.end}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csv;
}

// Download helper
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
