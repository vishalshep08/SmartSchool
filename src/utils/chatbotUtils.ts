import { supabase } from '@/integrations/supabase/client';

/* ─── Response Sanitizer ─────────────────────────────────────────────────── */

export function sanitizeResponseText(text: string): string {
  if (!text) return 'I have retrieved the information. Is there anything specific you would like to know?';
  // Strip <function=name {args}> patterns (Groq fallback format)
  let cleaned = text.replace(/<function=\w+\s*\{[^}]*\}>/g, '').trim();
  // Strip <|python_tag|> or similar model artifacts
  cleaned = cleaned.replace(/<\|[^|]*\|>/g, '').trim();
  // Strip raw JSON tool call blocks that leak into text
  cleaned = cleaned.replace(/\{"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}/g, '').trim();
  if (!cleaned) return 'I have retrieved the information. Is there anything specific you would like to know?';
  return cleaned;
}

/* ─── Download Tool Definition ───────────────────────────────────────────── */

export const DOWNLOAD_TOOL_DEF = {
  type: 'function' as const,
  function: {
    name: 'download_student_report',
    description: 'Download attendance, fee, remarks or homework report as PDF or CSV. Can filter by date range.',
    parameters: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          enum: ['attendance', 'fee', 'remarks', 'homework'],
          description: 'Type of report to generate',
        },
        from_date: { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        to_date: { type: 'string', description: 'End date YYYY-MM-DD (optional)' },
        format: {
          type: 'string',
          enum: ['pdf', 'csv'],
          description: 'Download format — always ask user if not specified',
        },
      },
      required: ['report_type', 'format'],
    },
  },
};

/* ─── Download Report Handler ────────────────────────────────────────────── */

export async function handleDownloadReport(
  input: any,
  context: { studentId?: string; classId?: string | null; role: string },
) {
  try {
    const { report_type, format, from_date, to_date } = input;
    const today = new Date().toISOString().split('T')[0];
    const fromDate = from_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = to_date || today;

    let reportData: Record<string, string>[] = [];
    let filename = '';
    let headers: string[] = [];

    if (report_type === 'attendance') {
      // Build student scope
      let studentQuery = supabase.from('students').select('id, full_name, admission_number, roll_number');
      if (context.classId) studentQuery = studentQuery.eq('class_id', context.classId);
      if (context.studentId) studentQuery = studentQuery.eq('id', context.studentId);
      const { data: students } = await studentQuery;

      if (!students?.length) return { success: false, message: 'No students found for your scope.' };

      const studentMap = new Map(students.map((s: any) => [s.id, s]));
      const studentIds = students.map((s: any) => s.id);

      const { data: attendance } = await supabase
        .from('student_attendance')
        .select('student_id, date, status')
        .in('student_id', studentIds)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false });

      reportData = (attendance || []).map((a: any) => {
        const s = studentMap.get(a.student_id);
        return { Date: a.date, Student: s?.full_name || 'N/A', 'Adm No': s?.admission_number || '', Status: a.status };
      });
      headers = ['Date', 'Student', 'Adm No', 'Status'];
      filename = `attendance_${fromDate}_to_${toDate}`;

    } else if (report_type === 'fee') {
      let feeQuery = (supabase as any).from('student_fees').select('student_id, total_amount, paid_amount, balance_amount, status');
      if (context.studentId) feeQuery = feeQuery.eq('student_id', context.studentId);
      const { data: fees } = await feeQuery;

      const ids = [...new Set((fees || []).map((f: any) => f.student_id))] as string[];
      const { data: students } = await supabase.from('students').select('id, full_name, admission_number').in('id', ids);
      const sMap = new Map((students || []).map((s: any) => [s.id, s]));

      reportData = (fees || []).map((f: any) => {
        const s = sMap.get(f.student_id);
        return {
          Student: s?.full_name || 'N/A', 'Adm No': s?.admission_number || '',
          Total: `₹${(f.total_amount || 0).toLocaleString('en-IN')}`,
          Paid: `₹${(f.paid_amount || 0).toLocaleString('en-IN')}`,
          Balance: `₹${(f.balance_amount || 0).toLocaleString('en-IN')}`,
          Status: f.status || 'N/A',
        };
      });
      headers = ['Student', 'Adm No', 'Total', 'Paid', 'Balance', 'Status'];
      filename = `fee_report_${today}`;

    } else if (report_type === 'remarks') {
      let rQuery = supabase.from('student_remarks').select('student_id, category, description, created_at').order('created_at', { ascending: false }).limit(100);
      if (context.studentId) rQuery = rQuery.eq('student_id', context.studentId);
      const { data: remarks } = await rQuery;

      const ids = [...new Set((remarks || []).map((r: any) => r.student_id))] as string[];
      const { data: students } = await supabase.from('students').select('id, full_name').in('id', ids);
      const sMap = new Map((students || []).map((s: any) => [s.id, s]));

      reportData = (remarks || []).map((r: any) => ({
        Date: r.created_at?.split('T')[0] || '', Student: sMap.get(r.student_id)?.full_name || 'N/A',
        Category: r.category || '', Remark: r.description || '',
      }));
      headers = ['Date', 'Student', 'Category', 'Remark'];
      filename = `remarks_report_${today}`;

    } else if (report_type === 'homework') {
      let hQuery = supabase.from('homework').select('subject, title, description, due_date, created_at').order('due_date', { ascending: false }).limit(50);
      if (context.classId) hQuery = hQuery.eq('class_id', context.classId);
      const { data: hw } = await hQuery;

      reportData = (hw || []).map((h: any) => ({
        Subject: h.subject || '', Title: h.title || '', Description: h.description || '',
        'Due Date': h.due_date || '', Created: h.created_at?.split('T')[0] || '',
      }));
      headers = ['Subject', 'Title', 'Description', 'Due Date', 'Created'];
      filename = `homework_report_${today}`;
    }

    if (!reportData.length) {
      return { success: false, message: 'No data found for the selected filters. Try adjusting the date range.' };
    }

    // Generate file
    if (format === 'csv') {
      const csv = [headers.join(','), ...reportData.map(row =>
        headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','),
      )].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || (jsPDFModule as any).jsPDF;
      await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text(`${report_type.toUpperCase()} REPORT`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}  |  Period: ${fromDate} to ${toDate}`, 14, 22);
      (doc as any).autoTable({
        head: [headers], body: reportData.map(row => headers.map(h => row[h] || '')),
        startY: 28, styles: { fontSize: 8 }, headStyles: { fillColor: [79, 70, 229] },
      });
      doc.save(`${filename}.pdf`);
    }

    return { success: true, message: `✅ ${report_type} report downloaded as ${format.toUpperCase()}. (${reportData.length} records)`, record_count: reportData.length };
  } catch (err: any) {
    console.error('[DOWNLOAD]', err);
    return { success: false, message: `Download failed: ${err.message}` };
  }
}

/* ─── Download Prompt Text ───────────────────────────────────────────────── */

export const DOWNLOAD_PROMPT = `
DOWNLOAD CAPABILITY:
You can generate and download reports. When a user asks to download or export data, use the download_student_report tool.
Always ask for the format preference (PDF or CSV) if not specified.
Examples: "Download attendance report", "Export fee summary as PDF", "Give me the remarks as CSV"`;
