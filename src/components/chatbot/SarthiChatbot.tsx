import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Minus, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeResponseText, handleDownloadReport, DOWNLOAD_TOOL_DEF, DOWNLOAD_PROMPT } from '@/utils/chatbotUtils';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

type SarthiRole = 'teacher' | 'principal';

interface TeacherCtx {
  teacherId: string;
  classId: string | null;
  isClassTeacher: boolean;
}

/* ─── Quick Actions ──────────────────────────────────────────────────────── */

const TEACHER_QUICK_ACTIONS = [
  { label: '📋 Class Attendance', message: "Show me today's class attendance" },
  { label: '📝 Pending Leaves', message: 'Any pending leave requests?' },
  { label: '⚠️ Low Attendance', message: 'Which students have low attendance?' },
  { label: '📅 My Timetable', message: "What's my timetable for today?" },
];

const PRINCIPAL_QUICK_ACTIONS = [
  { label: '🏫 School Attendance', message: "Show me today's school-wide attendance" },
  { label: '📄 Pending Approvals', message: 'How many document approvals are pending?' },
  { label: '💰 Fee Summary', message: 'Give me a fee collection summary' },
  { label: '👥 Staff Overview', message: 'Show me the staff overview' },
];

/* ─── Tool Definitions ───────────────────────────────────────────────────── */

const TEACHER_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_class_attendance',
      description: 'Get attendance summary for the teacher\'s class on a specific date',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format or "today"' },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_pending_leave_requests',
      description: 'Get pending student leave requests needing teacher approval',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_low_attendance_students',
      description: 'Get students with attendance below a threshold percentage',
      parameters: {
        type: 'object',
        properties: {
          threshold: { type: 'number', description: 'Percentage threshold, default 75' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_my_homework',
      description: 'Get homework posted by this teacher',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['all', 'this_week', 'pending_due'], description: 'Filter for homework' },
        },
        required: ['filter'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_todays_timetable',
      description: "Get the teacher's timetable for today",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  DOWNLOAD_TOOL_DEF,
];

const PRINCIPAL_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_school_attendance_overview',
      description: 'Get school-wide attendance overview across all classes for a date',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format or "today"' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_pending_document_approvals',
      description: 'Get document requests pending principal approval',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_fee_collection_summary',
      description: 'Get school-wide fee collection summary with paid/pending/unpaid counts',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_staff_overview',
      description: 'Get overview of teaching and non-teaching staff, including who is on leave today',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  DOWNLOAD_TOOL_DEF,
];

/* ─── Teacher Tool Handlers ──────────────────────────────────────────────── */

async function handleGetClassAttendance(input: any, classId: string) {
  const date = input.date === 'today' ? new Date().toISOString().split('T')[0] : input.date;

  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, admission_number')
    .eq('class_id', classId);

  const { data: attendance } = await supabase
    .from('student_attendance')
    .select('student_id, status')
    .eq('class_id', classId)
    .eq('date', date);

  const attendanceMap: Record<string, string> = {};
  attendance?.forEach((a: any) => { attendanceMap[a.student_id] = a.status; });

  const result = students?.map(s => ({
    name: s.full_name,
    roll: s.admission_number,
    status: attendanceMap[s.id] || 'not_marked',
  })) || [];

  const present = result.filter(s => s.status === 'present').length;
  const absent = result.filter(s => s.status === 'absent').length;
  const halfDay = result.filter(s => s.status === 'half_day').length;
  const notMarked = result.filter(s => s.status === 'not_marked').length;

  return {
    date,
    total_students: students?.length || 0,
    present,
    absent,
    half_day: halfDay,
    not_marked: notMarked,
    absent_students: result.filter(s => s.status === 'absent').map(s => s.name),
    attendance_marked: notMarked === 0,
  };
}

async function handleGetPendingLeaves(classId: string) {
  const { data } = await supabase
    .from('student_leave_requests')
    .select('id, from_date, to_date, leave_type, reason, created_at, students (full_name, roll_number)')
    .eq('class_id', classId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return {
    pending_count: data?.length || 0,
    requests: data?.map((r: any) => ({
      student: r.students?.full_name,
      roll: r.students?.roll_number,
      from: r.from_date,
      to: r.to_date,
      type: r.leave_type,
      reason: r.reason,
      days: Math.ceil((new Date(r.to_date).getTime() - new Date(r.from_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
    })) || [],
  };
}

async function handleGetLowAttendance(input: any, classId: string) {
  const threshold = input.threshold || 75;
  const fromDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const toDate = new Date().toISOString().split('T')[0];

  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, admission_number')
    .eq('class_id', classId);

  const results = await Promise.all(
    (students || []).map(async (student) => {
      const { data: att } = await supabase
        .from('student_attendance')
        .select('status')
        .eq('student_id', student.id)
        .gte('date', fromDate)
        .lte('date', toDate);

      const total = att?.length || 0;
      const present = att?.filter((a: any) => a.status === 'present').length || 0;
      const half = att?.filter((a: any) => a.status === 'half_day').length || 0;
      const pct = total > 0 ? Math.round(((present + half * 0.5) / total) * 100) : 100;

      return { name: student.full_name, roll: student.admission_number, percentage: pct };
    }),
  );

  const lowAttendance = results.filter(s => s.percentage < threshold);
  return {
    threshold,
    count: lowAttendance.length,
    students: lowAttendance.sort((a, b) => a.percentage - b.percentage),
  };
}

async function handleGetMyHomework(input: any, classId: string) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let query = supabase
    .from('homework')
    .select('id, subject, title, description, due_date, created_at')
    .eq('class_id', classId)
    .order('due_date', { ascending: false });

  if (input.filter === 'this_week') {
    query = query.gte('created_at', weekAgo.toISOString().split('T')[0]);
  } else if (input.filter === 'pending_due') {
    query = query.gte('due_date', today);
  }

  const { data } = await query.limit(10);

  return {
    homework: data?.map((h: any) => ({
      subject: h.subject,
      title: h.title,
      description: h.description,
      due_date: h.due_date,
      is_overdue: h.due_date < today,
    })) || [],
    count: data?.length || 0,
  };
}

async function handleGetTodaysTimetable(teacherId: string) {
  // day_of_week is INTEGER: 0=Sunday, 1=Monday, 2=Tuesday,
  // 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  const todayDayNumber = new Date().getDay(); // 0-6

  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ];
  const todayName = dayNames[todayDayNumber];

  const { data, error } = await supabase
    .from('timetable')
    .select(`
      id,
      subject,
      day_of_week,
      start_time,
      end_time,
      room,
      classes (name, section)
    `)
    .eq('teacher_id', teacherId)
    .eq('day_of_week', todayDayNumber) // integer match
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[TIMETABLE]', error);
    return {
      error: error.message,
      day: todayName,
      periods: [],
    };
  }

  if (!data || data.length === 0) {
    return {
      day: todayName,
      periods: [],
      total_periods: 0,
      message: `No classes scheduled for ${todayName}.`,
    };
  }

  const periods = data.map((row: any, index: number) => ({
    period: index + 1,
    time: `${row.start_time} - ${row.end_time}`,
    subject: row.subject || 'N/A',
    class: row.classes
      ? `${row.classes.name} ${row.classes.section}`.trim()
      : 'N/A',
    room: row.room || '',
  }));

  return {
    day: todayName,
    day_number: todayDayNumber,
    periods,
    total_periods: periods.length,
    message: `You have ${periods.length} period${periods.length !== 1 ? 's' : ''} today (${todayName}).`,
  };
}

/* ─── Principal Tool Handlers ────────────────────────────────────────────── */

async function handleSchoolAttendanceOverview(input: any) {
  const queryDate = (input.date === 'today' || !input.date) ? new Date().toISOString().split('T')[0] : input.date;

  const { data: classes } = await supabase.from('classes').select('id, name, section');

  const results = await Promise.all(
    (classes || []).map(async (cls: any) => {
      const { data: students } = await supabase.from('students').select('id').eq('class_id', cls.id);
      const { data: att } = await supabase
        .from('student_attendance')
        .select('status')
        .eq('class_id', cls.id)
        .eq('date', queryDate);

      const total = students?.length || 0;
      const present = att?.filter((a: any) => a.status === 'present').length || 0;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        class: `${cls.name} ${cls.section || ''}`.trim(),
        total,
        present,
        absent: total - present,
        percentage: pct,
        marked: (att?.length || 0) > 0,
      };
    }),
  );

  const totalStudents = results.reduce((s, c) => s + c.total, 0);
  const totalPresent = results.reduce((s, c) => s + c.present, 0);

  return {
    date: queryDate,
    overall_percentage: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
    total_students: totalStudents,
    total_present: totalPresent,
    classes: results,
    classes_not_marked: results.filter(c => !c.marked).map(c => c.class),
  };
}

async function handlePendingDocApprovals() {
  const { data } = await (supabase as any)
    .from('document_requests')
    .select('id, document_type, purpose, forwarded_to_principal_at, students (full_name, admission_number)')
    .eq('current_stage', 'principal_review')
    .order('forwarded_to_principal_at', { ascending: true });

  return {
    pending_count: data?.length || 0,
    requests: data?.map((r: any) => ({
      document: r.document_type,
      student: r.students?.full_name,
      purpose: r.purpose,
      waiting_since: r.forwarded_to_principal_at,
    })) || [],
  };
}

async function handleFeeCollectionSummary() {
  const { data: fees } = await (supabase as any)
    .from('student_fees')
    .select('total_amount, paid_amount, balance_amount, status');

  const total = fees?.reduce((s: number, f: any) => s + (f.total_amount || 0), 0) || 0;
  const collected = fees?.reduce((s: number, f: any) => s + (f.paid_amount || 0), 0) || 0;
  const pending = fees?.reduce((s: number, f: any) => s + (f.balance_amount || 0), 0) || 0;

  return {
    total_fee_expected: total,
    total_collected: collected,
    total_pending: pending,
    collection_percentage: total > 0 ? Math.round((collected / total) * 100) : 0,
    paid_count: fees?.filter((f: any) => f.status === 'Paid').length || 0,
    partial_count: fees?.filter((f: any) => f.status === 'Partial').length || 0,
    unpaid_count: fees?.filter((f: any) => f.status === 'Unpaid').length || 0,
  };
}

async function handleStaffOverview() {
  const { data: teachers } = await supabase.from('teachers').select('id, status');
  const { data: employees } = await (supabase as any).from('employees').select('id, status, employee_type');
  const today = new Date().toISOString().split('T')[0];
  const { data: leaves } = await supabase
    .from('teacher_leaves')
    .select('status')
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today);

  return {
    total_teaching: teachers?.length || 0,
    total_non_teaching: employees?.filter((e: any) => e.employee_type !== 'Teaching').length || 0,
    on_leave_today: leaves?.length || 0,
    active_staff:
      (teachers?.filter((t: any) => t.status === 'Active').length || 0) +
      (employees?.filter((e: any) => e.status === 'Active').length || 0),
  };
}

/* ─── System Prompts ─────────────────────────────────────────────────────── */

function buildTeacherPrompt(teacherCtx: TeacherCtx) {
  return `You are Sarthi, an AI teaching assistant for school teachers.
You help teachers manage their class efficiently.

You have access to real-time data about the teacher's class,
students, attendance, homework, and leave requests through tools.

Teacher ID: ${teacherCtx.teacherId}
Class ID: ${teacherCtx.classId || 'Not a class teacher'}
Is Class Teacher: ${teacherCtx.isClassTeacher}

PERSONALITY:
- Professional but friendly
- Concise and action-oriented — teachers are busy
- Proactively surface important information
- Flag urgent items first (overdue homework, low attendance students, pending leave requests)

CAPABILITIES:
- Show class attendance summary and identify absent/low-attendance students
- List pending leave requests from parents needing approval
- Show homework posted and submission status
- Identify students with attendance below 75%
- Show today's timetable
- Answer questions about class students
- Download/export reports (attendance, fee, remarks, homework) as PDF or CSV
${DOWNLOAD_PROMPT}

RULES:
- Only show data for the teacher's assigned class
- If teacher is not a class teacher, only show homework and timetable data
- Never show other teachers' data
- Always address teacher respectfully
- Always use the tool functions to get real data — NEVER make up numbers
- Keep responses brief and well-formatted`;
}

function buildPrincipalPrompt() {
  return `You are Sarthi, an AI assistant for the school Principal.
You provide school-wide insights and management support.

CAPABILITIES:
- School-wide attendance overview across all classes
- Staff management — who is present, on leave, pending approvals
- Document approval queue — pending signatures
- Fee collection summary and defaulters
- Student strength and class-wise stats
- Overall school performance metrics
- Download/export reports (attendance, fee, remarks, homework) as PDF or CSV
${DOWNLOAD_PROMPT}

PERSONALITY:
- Executive-level briefings — concise, data-driven
- Highlight exceptions and things needing attention
- Proactively surface urgent items
- Use numbers and percentages when reporting

RULES:
- Always use the tool functions to get real data — NEVER make up numbers
- Present data in a structured, easy-to-scan format
- Flag anything that needs immediate attention
- Keep responses brief and well-formatted`;
}

/* ─── Shared CSS (same as parent chatbot) ────────────────────────────────── */

const CHATBOT_STYLES = `
  @keyframes sarthi-slide-up { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes sarthi-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes sarthi-bounce { 0%,80%,100% { transform: scale(0.65); opacity: 0.35; } 40% { transform: scale(1); opacity: 1; } }

  .sarthi-fab {
    position: fixed; bottom: 24px; right: 24px; width: 58px; height: 58px;
    border-radius: 50%; cursor: pointer; z-index: 9999; border: none; outline: none;
    display: flex; align-items: center; justify-content: center; font-size: 24px;
    transition: transform 0.2s, box-shadow 0.2s;
    animation: sarthi-slide-up 0.35s cubic-bezier(0.16,1,0.3,1);
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    box-shadow: 0 8px 32px rgba(79,70,229,0.45);
  }
  .sarthi-fab:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(79,70,229,0.6); }
  @media (max-width: 767px) {
    .sarthi-fab { bottom: 88px !important; right: 16px !important; }
  }

  .sarthi-panel {
    position: fixed; bottom: 24px; right: 24px; width: 388px; background: #fff;
    border-radius: 24px; z-index: 9999; display: flex; flex-direction: column;
    overflow: hidden; animation: sarthi-slide-up 0.35s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 24px 80px rgba(79,70,229,0.18), 0 0 0 1px rgba(79,70,229,0.08);
    transition: height 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  @media (max-width: 639px) {
    .sarthi-panel { width: 100%; right: 0; bottom: 0; border-radius: 0; height: 100dvh !important; }
    .sarthi-fab { bottom: 88px !important; right: 16px !important; }
  }

  .sarthi-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; flex-shrink: 0;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);
  }
  .sarthi-header-left { display: flex; align-items: center; gap: 12px; }
  .sarthi-header-icon {
    width: 42px; height: 42px; border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
  }
  .sarthi-header-title { color: #fff; font-weight: 700; font-size: 15px; }
  .sarthi-header-sub { color: rgba(255,255,255,0.72); font-size: 11px; }
  .sarthi-header-actions { display: flex; align-items: center; gap: 4px; }
  .sarthi-header-btn {
    background: rgba(255,255,255,0.15); border: none; padding: 0; cursor: pointer;
    border-radius: 8px; width: 32px; height: 32px; transition: background 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .sarthi-header-btn:hover { background: rgba(255,255,255,0.28); }

  .sarthi-messages {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 12px; background: #f8f9fb;
  }
  .sarthi-messages::-webkit-scrollbar { width: 4px; }
  .sarthi-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

  .sarthi-msg { display: flex; animation: sarthi-msg-in 0.28s ease; gap: 8px; align-items: flex-end; }
  .sarthi-msg.user { justify-content: flex-end; }
  .sarthi-msg.assistant { justify-content: flex-start; }

  .sarthi-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, #4F46E5, #7C3AED);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
  }

  .sarthi-bubble {
    max-width: 82%; padding: 10px 14px; font-size: 13.5px; line-height: 1.55;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07); word-break: break-word;
  }
  .sarthi-bubble.assistant {
    background: #fff; color: #1f2937; border: 1px solid #f0f0f0;
    border-radius: 18px 18px 18px 4px;
  }
  .sarthi-bubble.user {
    background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff;
    border-radius: 18px 18px 4px 18px;
  }
  .sarthi-bubble .ts { font-size: 10px; margin-top: 4px; opacity: 0.55; text-align: right; }
  .sarthi-bubble.user .ts { color: rgba(255,255,255,0.65); }
  .sarthi-bubble.assistant .ts { color: #9ca3af; }

  .sarthi-typing {
    background: #fff; border-radius: 18px 18px 18px 4px;
    padding: 12px 16px; display: flex; gap: 5px; align-items: center;
    border: 1px solid #e5e7eb; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .sarthi-typing-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #6366f1;
    animation: sarthi-bounce 1.4s infinite ease-in-out;
  }
  .sarthi-typing-dot:nth-child(2) { animation-delay: 0.16s; }
  .sarthi-typing-dot:nth-child(3) { animation-delay: 0.32s; }

  .sarthi-welcome { text-align: center; padding: 16px 8px; }
  .sarthi-welcome-icon {
    width: 56px; height: 56px; margin: 0 auto 12px; border-radius: 50%;
    background: linear-gradient(135deg, rgba(79,70,229,0.12), rgba(124,58,237,0.12));
    display: flex; align-items: center; justify-content: center; font-size: 26px;
  }
  .sarthi-welcome h3 { color: #374151; font-size: 15px; font-weight: 700; margin: 0 0 4px; }
  .sarthi-welcome p { color: #9ca3af; font-size: 12px; margin: 0; }
  .sarthi-quick-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
  .sarthi-quick-btn {
    padding: 6px 14px; background: #fff; font-size: 12px; border-radius: 999px;
    cursor: pointer; transition: all 0.15s; font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid rgba(79,70,229,0.25); color: #4F46E5;
  }
  .sarthi-quick-btn:hover { background: rgba(79,70,229,0.05); transform: translateY(-1px); }

  .sarthi-input-area { padding: 12px 14px; background: #fff; border-top: 1px solid #f1f3f5; flex-shrink: 0; }
  .sarthi-input-row { display: flex; gap: 8px; align-items: flex-end; }
  .sarthi-textarea {
    flex: 1; resize: none; border: 1px solid #e5e7eb; border-radius: 14px;
    padding: 10px 14px; font-size: 13.5px; font-family: inherit;
    min-height: 40px; max-height: 96px; overflow-y: auto; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; line-height: 1.4;
  }
  .sarthi-textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
  .sarthi-textarea:disabled { background: #f9fafb; color: #9ca3af; }
  .sarthi-textarea::placeholder { color: #9ca3af; }
  .sarthi-send-btn {
    width: 40px; height: 40px; border-radius: 14px; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff;
    transition: opacity 0.15s, transform 0.15s;
  }
  .sarthi-send-btn:hover:not(:disabled) { transform: scale(1.05); }
  .sarthi-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .sarthi-input-hint { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 6px; }
  .sarthi-content-text { white-space: pre-wrap; }
  .sarthi-content-text strong, .sarthi-content-text b { font-weight: 600; }
`;

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function SarthiChatbot({ variant }: { variant: SarthiRole }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teacherCtx, setTeacherCtx] = useState<TeacherCtx | null>(null);
  const [ctxReady, setCtxReady] = useState(variant === 'principal'); // principals have no ctx to fetch
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickActions = variant === 'teacher' ? TEACHER_QUICK_ACTIONS : PRINCIPAL_QUICK_ACTIONS;
  const tools = variant === 'teacher' ? TEACHER_TOOLS : PRINCIPAL_TOOLS;
  const subtitle = variant === 'teacher' ? 'Teaching Assistant • AI Powered' : 'School Management • AI Powered';
  const placeholderText = variant === 'teacher' ? 'Ask about your class...' : 'Ask about school operations...';

  // Fetch teacher context
  useEffect(() => {
    if (variant !== 'teacher' || !user?.id) return;

    const fetchTeacherContext = async () => {
      // Check employees table
      const { data: emp } = await (supabase as any)
        .from('employees')
        .select('id, is_class_teacher, assigned_class_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Also check teachers table
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id, assigned_class_id, is_class_teacher')
        .eq('user_id', user.id)
        .maybeSingle();

      setTeacherCtx({
        teacherId: (emp?.id || teacher?.id) as string,
        classId: (emp?.assigned_class_id || teacher?.assigned_class_id) as string | null,
        isClassTeacher: (emp?.is_class_teacher || teacher?.is_class_teacher) || false,
      });
      setCtxReady(true);
    };

    fetchTeacherContext();
  }, [user, variant]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Execute tool
  const executeToolCall = useCallback(
    async (toolName: string, toolInput: any) => {
      try {
        if (variant === 'teacher') {
          const classId = teacherCtx?.classId;
          if (!classId && ['get_class_attendance', 'get_pending_leave_requests', 'get_low_attendance_students', 'get_my_homework'].includes(toolName)) {
            return { error: 'No class assigned to this teacher' };
          }
          switch (toolName) {
            case 'get_class_attendance':
              return await handleGetClassAttendance(toolInput, classId!);
            case 'get_pending_leave_requests':
              return await handleGetPendingLeaves(classId!);
            case 'get_low_attendance_students':
              return await handleGetLowAttendance(toolInput, classId!);
            case 'get_my_homework':
              return await handleGetMyHomework(toolInput, classId!);
            case 'get_todays_timetable':
              return await handleGetTodaysTimetable(teacherCtx!.teacherId);
            case 'download_student_report':
              return await handleDownloadReport(toolInput, { classId: classId, role: 'teacher' });
            default:
              return { error: `Unknown tool: ${toolName}` };
          }
        } else {
          // Principal
          switch (toolName) {
            case 'get_school_attendance_overview':
              return await handleSchoolAttendanceOverview(toolInput);
            case 'get_pending_document_approvals':
              return await handlePendingDocApprovals();
            case 'get_fee_collection_summary':
              return await handleFeeCollectionSummary();
            case 'get_staff_overview':
              return await handleStaffOverview();
            case 'download_student_report':
              return await handleDownloadReport(toolInput, { role: 'principal' });
            default:
              return { error: `Unknown tool: ${toolName}` };
          }
        }
      } catch (err: any) {
        console.error('[SARTHI] Tool error:', err);
        return { error: err.message || 'Tool execution failed' };
      }
    },
    [variant, teacherCtx],
  );

  // Groq API call
  const callGroqAPI = useCallback(async (messagesToSend: any[], withTools: boolean, toolDefs: any[]) => {
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messagesToSend,
        ...(withTools ? { tools: toolDefs, tool_choice: 'auto' } : {}),
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });
  }, []);

  // Parse failed tool call
  const parseFailedToolCall = (failedText: string): { name: string; args: any } | null => {
    const match = failedText.match(/<function=(\w+)\s*(\{[^}]*\})>/);
    if (match) {
      try {
        return { name: match[1], args: JSON.parse(match[2]) };
      } catch { return null; }
    }
    return null;
  };

  // Send message
  const sendMessage = useCallback(
    async (text: string, silent = false) => {
      if (!text.trim()) return;
      if (variant === 'teacher' && !teacherCtx) return;

      if (!silent) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }]);
        setInput('');
      }

      const typingId = 'typing-' + Date.now();
      setMessages(prev => [...prev, { id: typingId, role: 'assistant', content: '', timestamp: new Date(), isTyping: true }]);
      setIsLoading(true);

      try {
        const userContent = { role: 'user' as const, content: text };
        if (!silent) conversationHistory.current.push(userContent);

        const systemPrompt = variant === 'teacher' ? buildTeacherPrompt(teacherCtx!) : buildPrincipalPrompt();
        const systemMessage = { role: 'system' as const, content: systemPrompt };
        let messagesToSend: any[] = silent ? [systemMessage, userContent] : [systemMessage, ...conversationHistory.current];

        let continueLoop = true;
        let finalText = '';
        let retryCount = 0;
        const MAX_RETRIES = 5;

        while (continueLoop && retryCount < MAX_RETRIES) {
          retryCount++;
          const response = await callGroqAPI(messagesToSend, true, tools);

          if (!response.ok) {
            const errBody = await response.text();
            console.warn('[SARTHI] Groq API error:', response.status, errBody);

            try {
              const errorObj = JSON.parse(errBody);
              const failedGen = errorObj?.error?.failed_generation;
              if (errorObj?.error?.code === 'tool_use_failed' && failedGen) {
                const parsed = parseFailedToolCall(failedGen);
                if (parsed) {
                  const result = await executeToolCall(parsed.name, parsed.args);
                  const fakeCallId = 'call_recovered_' + Date.now();
                  messagesToSend = [
                    ...messagesToSend,
                    { role: 'assistant' as const, content: null, tool_calls: [{ id: fakeCallId, type: 'function', function: { name: parsed.name, arguments: JSON.stringify(parsed.args) } }] },
                    { role: 'tool' as const, tool_call_id: fakeCallId, content: JSON.stringify(result) },
                  ];
                  continue;
                }
              }
            } catch { /* fall through */ }
            throw new Error(`Groq API error: ${response.status}`);
          }

          const responseData = await response.json();
          const choice = responseData.choices?.[0];
          if (!choice) throw new Error('No response from Groq');

          const message = choice.message;
          if (choice.finish_reason === 'tool_calls' || (message.tool_calls?.length > 0)) {
            const toolResultMessages = await Promise.all(
              message.tool_calls.map(async (tc: any) => {
                const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                const result = await executeToolCall(tc.function.name, args);
                return { role: 'tool' as const, tool_call_id: tc.id, content: JSON.stringify(result) };
              }),
            );
            messagesToSend = [...messagesToSend, { role: 'assistant' as const, content: message.content || null, tool_calls: message.tool_calls }, ...toolResultMessages];
          } else {
            finalText = sanitizeResponseText(message.content || '');
            continueLoop = false;
          }
        }

        setMessages(prev => [
          ...prev.filter(m => m.id !== typingId),
          { id: Date.now().toString(), role: 'assistant', content: finalText, timestamp: new Date() },
        ]);

        if (!silent) {
          conversationHistory.current.push({ role: 'assistant', content: finalText });
          if (conversationHistory.current.length > 20) conversationHistory.current = conversationHistory.current.slice(-20);
        }
      } catch (err: any) {
        console.error('[SARTHI] Error:', err);
        setMessages(prev => [
          ...prev.filter(m => m.id !== typingId),
          { id: Date.now().toString(), role: 'assistant', content: "I'm sorry, I encountered an error. Please try again. 🙏", timestamp: new Date() },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [variant, teacherCtx, executeToolCall, callGroqAPI, tools],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  if (!user) return null;

  const v = variant; // shorthand

  return (
    <>
      <style>{CHATBOT_STYLES}</style>

      {/* Floating Button */}
      {!isOpen && (
        <button
          className={`sarthi-fab ${v}`}
          onClick={() => setIsOpen(true)}
          title={v === 'teacher' ? 'Ask your teaching assistant' : 'Ask your school assistant'}
          aria-label="Open Sarthi assistant"
        >
          <Sparkles className="w-6 h-6" style={{ color: '#fff' }} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="sarthi-panel" style={{ height: isMinimized ? 68 : 620 }}>
          {/* Header */}
          <div className="sarthi-header">
            <div className="sarthi-header-left">
              <div className="sarthi-header-icon">🎓</div>
              <div>
                <div className="sarthi-header-title">Sarthi</div>
                <div className="sarthi-header-sub">{subtitle}</div>
              </div>
            </div>
            <div className="sarthi-header-actions">
              <button className="sarthi-header-btn" onClick={() => setIsMinimized(!isMinimized)} aria-label={isMinimized ? 'Expand' : 'Minimize'}>
                <Minus className="w-4 h-4" style={{ color: '#fff' }} />
              </button>
              <button className="sarthi-header-btn" onClick={() => setIsOpen(false)} aria-label="Close">
                <X className="w-4 h-4" style={{ color: '#fff' }} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="sarthi-messages">
                {messages.length === 0 && !isLoading && (
                  <div className="sarthi-welcome">
                    <div className="sarthi-welcome-icon">🎓</div>
                    <h3>Hi! I'm Sarthi 👋</h3>
                    <p>{v === 'teacher' ? 'Your personal teaching assistant' : 'Your school management assistant'}</p>
                    <div className="sarthi-quick-actions">
                      {quickActions.map(action => (
                        <button key={action.label} className="sarthi-quick-btn" onClick={() => sendMessage(action.message)}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id} className={`sarthi-msg ${msg.role}`}>
                    {msg.role === 'assistant' && !msg.isTyping && (
                      <div className="sarthi-avatar">🎓</div>
                    )}
                    {msg.isTyping ? (
                      <div className="sarthi-typing">
                        <div className="sarthi-typing-dot" />
                        <div className="sarthi-typing-dot" />
                        <div className="sarthi-typing-dot" />
                      </div>
                    ) : (
                      <div className={`sarthi-bubble ${msg.role}`}>
                        <div className="sarthi-content-text">{msg.content}</div>
                        <div className="ts">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="sarthi-input-area">
                <div className="sarthi-input-row">
                  <textarea
                    ref={textareaRef}
                    className={`sarthi-textarea ${v}`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholderText}
                    disabled={isLoading}
                    rows={1}
                  />
                  <button
                    className={`sarthi-send-btn ${v}`}
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" style={{ color: '#fff' }} />
                  </button>
                </div>
                <div className="sarthi-input-hint">
                  Press Enter to send • Shift+Enter for new line
                  {input.length > 0 && <span> • {input.length}/500</span>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
