import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Send, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeResponseText, handleDownloadReport, DOWNLOAD_TOOL_DEF, DOWNLOAD_PROMPT } from '@/utils/chatbotUtils';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface StudentInfo {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  parentId: string;
}

/* ─── Quick Actions ──────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: "📊 Attendance", message: "What is my child's attendance this month?" },
  { label: '📚 Homework', message: 'Show me pending homework' },
  { label: '💰 Fee Status', message: 'What is the current fee status?' },
  { label: '📋 Leaves', message: 'Show me recent leave requests' },
  { label: '📖 Syllabus', message: 'What study materials are available?' },
];

/* ─── Tool Definitions ───────────────────────────────────────────────────── */

const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_attendance_summary',
      description: 'Get student attendance data for a time period',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'this_week', 'this_month', 'last_month'],
            description: 'The time period to get attendance for',
          },
        },
        required: ['period'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_homework',
      description: 'Get homework assigned to the student class. Can filter by status.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'pending', 'overdue', 'today'],
            description: 'Filter homework by status',
          },
        },
        required: ['filter'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_fee_status',
      description: 'Get the student fee payment status, pending amount, and payment history.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_leave_requests',
      description: 'Get the student leave request history and current status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['all', 'pending', 'approved', 'rejected'],
            description: 'Filter by leave status',
          },
        },
        required: ['status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_remarks',
      description: 'Get teacher remarks about the student behaviour and academic progress.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['all', 'Behaviour', 'Academic Progress', 'General'],
            description: 'Category of remarks to fetch',
          },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_document_requests',
      description: 'Get the status of document requests made by the parent.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_study_materials',
      description: 'Get study materials uploaded by the teacher for the student class.',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: "Subject name to filter by, or 'all' for everything" },
        },
        required: ['subject'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_syllabus_info',
      description: 'Get syllabus information, study materials, and recent homework topics for a subject and class.',
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: 'Subject name e.g. Mathematics, Science, English',
          },
          query: {
            type: 'string',
            description: 'Specific query about the syllabus',
          },
        },
        required: ['subject'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_leave',
      description: 'Apply for student leave on behalf of the parent. Always confirm with the parent before calling this.',
      parameters: {
        type: 'object',
        properties: {
          from_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          to_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          leave_type: { type: 'string', enum: ['Sick', 'Personal', 'Other'], description: 'Type of leave' },
          reason: { type: 'string', description: 'Reason for leave' },
        },
        required: ['from_date', 'to_date', 'leave_type', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'request_document',
      description: 'Request an official school document for the student. Always confirm with the parent before calling this.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['Bonafide Certificate', 'Leaving Certificate', 'NOC', 'Character Certificate', 'Other'],
            description: 'Type of document to request',
          },
          purpose: { type: 'string', description: 'Why the document is needed' },
        },
        required: ['document_type', 'purpose'],
      },
    },
  },
  DOWNLOAD_TOOL_DEF,
];

/* ─── Tool Handlers ──────────────────────────────────────────────────────── */

async function getAttendanceSummary(input: { period: string }, studentId: string) {
  const { period } = input;
  let fromDate: string, toDate: string;
  const now = new Date();
  if (period === 'today') {
    fromDate = toDate = now.toISOString().split('T')[0];
  } else if (period === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now); weekStart.setDate(diff);
    fromDate = weekStart.toISOString().split('T')[0];
    toDate = new Date().toISOString().split('T')[0];
  } else if (period === 'this_month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    toDate = new Date().toISOString().split('T')[0];
  } else {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    toDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  }
  const { data } = await supabase
    .from('student_attendance')
    .select('date, status, remarks')
    .eq('student_id', studentId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false });
  const records = data || [];
  const present = records.filter((r: any) => r.status === 'present').length;
  const absent = records.filter((r: any) => r.status === 'absent').length;
  const halfDay = records.filter((r: any) => r.status === 'half_day').length;
  const leave = records.filter((r: any) => r.status === 'leave').length;
  const total = records.length;
  const percentage = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;
  return {
    period, from: fromDate, to: toDate, present, absent,
    half_day: halfDay, leave, total_marked: total, attendance_percentage: percentage,
    recent_absences: records.filter((r: any) => r.status === 'absent').slice(0, 3)
      .map((r: any) => ({ date: r.date, note: r.remarks })),
  };
}

async function getHomework(input: { filter: string }, classId: string) {
  const today = new Date().toISOString().split('T')[0];
  let query = supabase.from('homework').select('id, subject, title, description, due_date, created_at')
    .eq('class_id', classId).order('due_date', { ascending: true });
  if (input.filter === 'overdue') query = query.lt('due_date', today);
  else if (input.filter === 'today') query = query.eq('due_date', today);
  else if (input.filter === 'pending') query = query.gte('due_date', today);
  const { data } = await query.limit(10);
  return {
    homework: data?.map((h: any) => ({
      subject: h.subject, title: h.title, description: h.description,
      due_date: h.due_date, is_overdue: h.due_date < today, is_due_today: h.due_date === today,
    })) || [],
    count: data?.length || 0,
  };
}

async function getFeeStatus(studentId: string) {
  const { data: feeData } = await (supabase as any).from('student_fees')
    .select('total_amount, paid_amount, balance_amount, status, academic_year')
    .eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!feeData) return { message: 'No fee record found for this student' };
  const { data: payments } = await (supabase as any).from('fee_payments')
    .select('amount_paid, payment_date, payment_mode, receipt_number')
    .eq('student_id', studentId).order('payment_date', { ascending: false }).limit(3);
  const lastPayment = payments?.[0];
  return {
    total_fee: feeData.total_amount, paid_amount: feeData.paid_amount,
    balance_due: feeData.balance_amount, status: feeData.status,
    academic_year: feeData.academic_year,
    last_payment: lastPayment ? { amount: lastPayment.amount_paid, date: lastPayment.payment_date, mode: lastPayment.payment_mode, receipt: lastPayment.receipt_number } : null,
    payment_count: payments?.length || 0,
  };
}

async function getLeaveRequests(input: { status: string }, studentId: string) {
  let query = supabase.from('student_leave_requests')
    .select('from_date, to_date, leave_type, reason, status, teacher_note, created_at')
    .eq('student_id', studentId).order('created_at', { ascending: false }).limit(5);
  if (input.status !== 'all') query = query.eq('status', input.status);
  const { data } = await query;
  return { requests: data || [], count: data?.length || 0 };
}

async function getRemarks(input: { category: string }, studentId: string) {
  let query = supabase.from('student_remarks')
    .select('category, title, description, remark_type, created_at, is_read_by_parent')
    .eq('student_id', studentId).order('created_at', { ascending: false }).limit(5);
  if (input.category !== 'all') query = query.eq('category', input.category);
  const { data } = await query;
  return {
    remarks: data?.map((r: any) => ({
      category: r.category, title: r.title, description: r.description,
      type: r.remark_type, created_at: r.created_at, is_read: r.is_read_by_parent,
    })) || [],
    count: data?.length || 0,
  };
}

async function getDocumentRequests(parentId: string, studentId: string) {
  const { data } = await supabase.from('document_requests')
    .select('document_type, status, purpose, requested_at, document_url')
    .eq('student_id', studentId).eq('parent_id', parentId).order('requested_at', { ascending: false });
  return { requests: data || [], count: data?.length || 0 };
}

async function getStudyMaterials(input: { subject: string }, classId: string) {
  let query = (supabase as any).from('study_materials')
    .select('title, subject, material_type, file_url, lecture_url, topic, description, created_at')
    .eq('class_id', classId).order('created_at', { ascending: false }).limit(10);
  if (input.subject !== 'all') query = query.ilike('subject', `%${input.subject}%`);
  const { data } = await query;
  return {
    materials: (data || []).map((m: any) => ({
      ...m,
      url: m.file_url || m.lecture_url || null,
    })),
    count: data?.length || 0,
  };
}

async function getSyllabusInfo(input: { subject: string; query?: string }, classId: string) {
  const [materialsRes, homeworkRes] = await Promise.all([
    (supabase as any).from('study_materials')
      .select('title, subject, material_type, file_url, lecture_url, topic, description, created_at')
      .eq('class_id', classId)
      .ilike('subject', `%${input.subject}%`)
      .order('created_at', { ascending: false }),
    supabase.from('homework')
      .select('subject, title, description, due_date')
      .eq('class_id', classId)
      .ilike('subject', `%${input.subject}%` as any)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }),
  ]);
  const materials = materialsRes.data || [];
  const homework = homeworkRes.data || [];
  return {
    subject: input.subject,
    study_materials: materials.map((m: any) => ({
      title: m.title,
      topic: m.topic,
      type: m.material_type,
      url: m.file_url || m.lecture_url || null,
      description: m.description,
    })),
    recent_homework_topics: homework.map((h: any) => ({ title: h.title, description: h.description, due_date: h.due_date })),
    materials_count: materials.length,
    message: materials.length === 0
      ? `No study materials uploaded yet for ${input.subject}. Ask the class teacher to upload materials.`
      : `Found ${materials.length} study material(s) for ${input.subject}.`,
  };
}

async function applyLeave(input: { from_date: string; to_date: string; leave_type: string; reason: string }, studentId: string, parentId: string, classId: string) {
  const { data, error } = await supabase.from('student_leave_requests').insert({
    student_id: studentId, parent_id: parentId, class_id: classId,
    from_date: input.from_date, to_date: input.to_date,
    leave_type: input.leave_type, reason: input.reason, status: 'pending',
  }).select().maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, message: 'Leave request submitted successfully', request_id: data?.id, status: 'pending', note: 'The Class Teacher will review and respond shortly.' };
}

async function requestDocumentFn(input: { document_type: string; purpose: string }, studentId: string, parentId: string) {
  const { data: clerkResponse } = await supabase.functions.invoke('find-clerk');
  const clerkData = clerkResponse?.clerk || null;
  const stage = clerkData ? 'clerk_review' : 'submitted';
  const { data, error } = await (supabase as any).from('document_requests').insert({
    student_id: studentId, parent_id: parentId, document_type: input.document_type,
    purpose: input.purpose, current_stage: stage, status: stage,
    assigned_clerk_id: clerkData?.id || null, requested_at: new Date().toISOString(),
  }).select().maybeSingle();
  if (error) return { success: false, error: error.message };
  if (clerkData?.user_id) {
    await supabase.from('notifications').insert({ user_id: clerkData.user_id, title: 'New Document Request', message: `New ${input.document_type} request from parent (via Sarthi chatbot)`, type: 'document_request', is_read: false, created_at: new Date().toISOString() });
  }
  return { success: true, message: `${input.document_type} request submitted successfully`, status: 'Under Review', note: 'The Administration team will process your request.' };
}

/* ─── System Prompt Builder ──────────────────────────────────────────────── */

function buildSystemPrompt(activeStudent: StudentInfo, allStudents: StudentInfo[], schoolName: string) {
  const firstName = activeStudent.studentName.split(' ')[0];
  return `You are Sarthi (साथी), a warm and helpful school assistant for parents at ${schoolName || 'this school'}. You are a guide and companion.

You are currently helping the parent of **${activeStudent.studentName}** (Class: ${activeStudent.className}).
Student ID: ${activeStudent.studentId}
Class ID: ${activeStudent.classId}

${allStudents.length > 1
  ? `This parent has ${allStudents.length} children enrolled:
${allStudents.map(s => `- ${s.studentName} (${s.className})`).join('\n')}
You are currently showing data for **${activeStudent.studentName}**.
If the parent asks about another child by name, let them know they can switch using the tab buttons at the top of the chat.
ALWAYS be clear about WHICH child you are referring to — mention the child's name when relevant.`
  : ''}

PERSONALITY:
- Warm, caring, and professional
- Speak like a helpful school coordinator
- Use simple language — parents may not be tech-savvy
- Be concise but thorough
- Use relevant emojis naturally (not excessively)
- If parent writes in Hindi or mixed language, respond in the same style

SYLLABUS & STUDY HELP:
- You can fetch study materials and recent homework topics using get_syllabus_info
- If a parent asks "what is the syllabus for Maths?" or similar, use get_syllabus_info
- You can suggest study tips based on subject and class level
- If no materials are uploaded, tell the parent to ask the teacher to upload materials

RULES:
- Always use tool functions to get real data — NEVER make up numbers
- If a tool returns no data, say so honestly
- Before actions (applying leave, requesting documents), ALWAYS confirm with the parent first
- If attendance is below 75%, gently flag it as urgent
- Always address the student by first name: ${firstName}
- Keep responses brief and well-formatted
${DOWNLOAD_PROMPT}

GREETING: When the parent first opens the chat, greet them warmly and ask how you can help ${firstName} today.`;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ChatbotWidget() {
  const { user } = useAuth();
  const { schoolName } = useSchoolSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studentList, setStudentList] = useState<StudentInfo[]>([]);
  const [activeStudent, setActiveStudent] = useState<StudentInfo | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Fetch ALL linked students for this parent
  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.id) return;
      setLoadingStudents(true);
      try {
        const { data: parent } = await supabase
          .from('parents').select('id').eq('user_id', user.id).maybeSingle();
        if (!parent) return;

        const { data: links } = await supabase
          .from('parent_student_link').select('student_id').eq('parent_id', parent.id);
        if (!links?.length) return;

        const studentIds = links.map((l: any) => l.student_id);

        const { data: studentsData } = await supabase
          .from('students')
          .select('id, full_name, class_id, classes(id, name, section)')
          .in('id', studentIds)
          .eq('is_active', true);

        const mapped: StudentInfo[] = (studentsData || []).map((s: any) => ({
          studentId: s.id,
          studentName: s.full_name,
          classId: s.class_id,
          className: s.classes ? `${s.classes.name} ${s.classes.section || ''}`.trim() : 'Unknown',
          parentId: parent.id,
        }));

        setStudentList(mapped);
        if (mapped.length > 0) setActiveStudent(mapped[0]);
      } catch (err) {
        console.error('[Sarthi] Failed to fetch student list:', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchAll();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When student switches, reset conversation
  const handleSwitchStudent = (student: StudentInfo) => {
    setActiveStudent(student);
    setMessages([]);
    conversationHistory.current = [];
  };

  // Execute tool call
  const executeToolCall = useCallback(async (toolName: string, toolInput: any): Promise<any> => {
    if (!activeStudent) return { error: 'No student context' };
    const { studentId, classId, parentId } = activeStudent;
    switch (toolName) {
      case 'get_attendance_summary': return await getAttendanceSummary(toolInput, studentId);
      case 'get_homework': return await getHomework(toolInput, classId);
      case 'get_fee_status': return await getFeeStatus(studentId);
      case 'get_leave_requests': return await getLeaveRequests(toolInput, studentId);
      case 'get_remarks': return await getRemarks(toolInput, studentId);
      case 'get_document_requests': return await getDocumentRequests(parentId, studentId);
      case 'get_study_materials': return await getStudyMaterials(toolInput, classId);
      case 'get_syllabus_info': return await getSyllabusInfo(toolInput, classId);
      case 'apply_leave': return await applyLeave(toolInput, studentId, parentId, classId);
      case 'request_document': return await requestDocumentFn(toolInput, studentId, parentId);
      case 'download_student_report': return await handleDownloadReport(toolInput, { studentId, classId, role: 'parent' });
      default: return { error: `Unknown tool: ${toolName}` };
    }
  }, [activeStudent]);

  // Parse failed tool calls
  const parseFailedToolCall = (failedText: string): { name: string; args: any } | null => {
    const match = failedText.match(/<function=(\w+)\s*(\{[^}]*\})>/);
    if (match) {
      try { return { name: match[1], args: JSON.parse(match[2]) }; } catch { return null; }
    }
    return null;
  };

  // Call Groq API
  const callGroqAPI = useCallback(async (messagesToSend: any[], withTools: boolean) => {
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messagesToSend,
        ...(withTools ? { tools: TOOL_DEFINITIONS, tool_choice: 'auto' } : {}),
        max_tokens: 1024, temperature: 0.2,
      }),
    });
  }, []);

  // Send message
  const sendMessage = useCallback(async (text: string, silent = false) => {
    if (!text.trim() || !activeStudent) return;
    if (!silent) {
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }
    const typingId = 'typing-' + Date.now();
    setMessages(prev => [...prev, { id: typingId, role: 'assistant', content: '', timestamp: new Date(), isTyping: true }]);
    setIsLoading(true);
    try {
      const userContent = { role: 'user' as const, content: text };
      if (!silent) conversationHistory.current.push(userContent);
      const systemMessage = { role: 'system' as const, content: buildSystemPrompt(activeStudent, studentList, schoolName) };
      let messagesToSend: any[] = silent ? [systemMessage, userContent] : [systemMessage, ...conversationHistory.current];
      let continueLoop = true;
      let finalText = '';
      let retryCount = 0;
      const MAX_RETRIES = 5;
      while (continueLoop && retryCount < MAX_RETRIES) {
        retryCount++;
        const response = await callGroqAPI(messagesToSend, true);
        if (!response.ok) {
          const errBody = await response.text();
          try {
            const errorObj = JSON.parse(errBody);
            const failedGen = errorObj?.error?.failed_generation;
            const errorCode = errorObj?.error?.code;
            if (errorCode === 'tool_use_failed' && failedGen) {
              const parsed = parseFailedToolCall(failedGen);
              if (parsed) {
                const result = await executeToolCall(parsed.name, parsed.args);
                const fakeCallId = 'call_recovered_' + Date.now();
                messagesToSend = [...messagesToSend,
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
        const finishReason = choice.finish_reason;
        const message = choice.message;
        if (finishReason === 'tool_calls' || (message.tool_calls && message.tool_calls.length > 0)) {
          const assistantMsg = { role: 'assistant' as const, content: message.content || null, tool_calls: message.tool_calls };
          const toolResultMessages = await Promise.all(
            message.tool_calls.map(async (tc: any) => {
              const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
              const result = await executeToolCall(tc.function.name, args);
              return { role: 'tool' as const, tool_call_id: tc.id, content: JSON.stringify(result) };
            })
          );
          messagesToSend = [...messagesToSend, assistantMsg, ...toolResultMessages];
        } else {
          finalText = sanitizeResponseText(message.content || '');
          continueLoop = false;
        }
      }
      setMessages(prev => [...prev.filter(m => m.id !== typingId), { id: Date.now().toString(), role: 'assistant', content: finalText, timestamp: new Date() }]);
      if (!silent) {
        conversationHistory.current.push({ role: 'assistant', content: finalText });
        if (conversationHistory.current.length > 20) conversationHistory.current = conversationHistory.current.slice(-20);
      }
    } catch (err: any) {
      console.error('[Sarthi] Error:', err);
      setMessages(prev => [...prev.filter(m => m.id !== typingId), { id: Date.now().toString(), role: 'assistant', content: "I'm sorry, I encountered an error. Please try again in a moment. 🙏", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStudent, studentList, executeToolCall, callGroqAPI, schoolName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  if (!user) return null;

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: isMobile ? 0 : '24px',
    right: isMobile ? 0 : '24px',
    width: isMobile ? '100%' : '388px',
    height: isMobile ? '100dvh' : (isMinimized ? '68px' : '620px'),
    borderRadius: isMobile ? (isMinimized ? '20px 20px 0 0' : '0') : '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 24px 80px rgba(79,70,229,0.18), 0 0 0 1px rgba(79,70,229,0.08)',
    transition: 'height 0.3s cubic-bezier(0.16,1,0.3,1)',
    animation: 'sarthi-slide-up 0.35s cubic-bezier(0.16,1,0.3,1)',
  };

  return (
    <>
      <style>{`
        @keyframes sarthi-slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes sarthi-msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sarthi-dot {
          0%, 80%, 100% { transform: scale(0.65); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
        .sarthi-fab {
          position: fixed; bottom: 24px; right: 24px;
          width: 58px; height: 58px; border-radius: 50%;
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          box-shadow: 0 8px 32px rgba(79,70,229,0.45);
          cursor: pointer; z-index: 9999; border: none; outline: none;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: sarthi-slide-up 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .sarthi-fab:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(79,70,229,0.6); }
        @media (max-width: 639px) { .sarthi-fab { bottom: 88px !important; right: 16px !important; } }
        .sarthi-msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8f9fb; }
        .sarthi-msgs::-webkit-scrollbar { width: 4px; }
        .sarthi-msgs::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .sarthi-msg { animation: sarthi-msg-in 0.28s ease; }
        .sarthi-dot-1 { animation: sarthi-dot 1.4s infinite ease-in-out; }
        .sarthi-dot-2 { animation: sarthi-dot 1.4s 0.16s infinite ease-in-out; }
        .sarthi-dot-3 { animation: sarthi-dot 1.4s 0.32s infinite ease-in-out; }
      `}</style>

      {/* ─── FAB Button ─────────────────────────────────────────────────────── */}
      {!isOpen && (
        <button className="sarthi-fab" onClick={() => setIsOpen(true)} title="Ask Sarthi — your school assistant" aria-label="Open Sarthi school assistant">
          <span style={{ fontSize: '26px', lineHeight: 1 }}>🎓</span>
        </button>
      )}

      {/* ─── Chat Panel ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div style={panelStyle}>

          {/* ── Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
            padding: '14px 16px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Avatar */}
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>🎓</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>Sarthi</p>
                <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '11px', margin: 0 }}>
                  AI School Assistant • Always here to help
                </p>
              </div>

              {/* Active child badge */}
              {activeStudent && studentList.length === 1 && (
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '999px', padding: '3px 10px' }}>
                  <p style={{ color: '#fff', fontSize: '11px', fontWeight: 600, margin: 0 }}>
                    👤 {activeStudent.studentName.split(' ')[0]}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background 0.15s' }} aria-label={isMinimized ? 'Expand' : 'Minimize'}>
                  <Minus size={15} />
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background 0.15s' }} aria-label="Close">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Child Switcher Tabs (multiple children) ── */}
            {!isMinimized && studentList.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
                {studentList.map(s => (
                  <button
                    key={s.studentId}
                    onClick={() => handleSwitchStudent(s)}
                    style={{
                      padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                      background: activeStudent?.studentId === s.studentId ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.18)',
                      color: activeStudent?.studentId === s.studentId ? '#4F46E5' : '#fff',
                    }}
                  >
                    {s.studentName.split(' ')[0]} · {s.className}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Body ── */}
          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="sarthi-msgs">
                {/* Welcome / Quick Actions */}
                {messages.length === 0 && !isLoading && (
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(124,58,237,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '26px' }}>🎓</div>
                    <h3 style={{ color: '#374151', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>
                      {loadingStudents ? 'Loading...' : activeStudent ? `Hi! I'm Sarthi 👋` : "Hi! I'm Sarthi 👋"}
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 16px' }}>
                      {activeStudent
                        ? `Helping you with ${activeStudent.studentName.split(' ')[0]}'s school life`
                        : 'Your school assistant'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                      {QUICK_ACTIONS.map(action => (
                        <button
                          key={action.label}
                          onClick={() => activeStudent && sendMessage(action.message)}
                          disabled={!activeStudent}
                          style={{
                            padding: '6px 14px', background: '#fff', fontSize: '12px', borderRadius: '999px',
                            cursor: activeStudent ? 'pointer' : 'not-allowed',
                            fontWeight: 500, border: '1px solid rgba(79,70,229,0.25)', color: '#4F46E5',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s',
                            opacity: activeStudent ? 1 : 0.5,
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map(msg => (
                  <div key={msg.id} className="sarthi-msg" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                    {/* Sarthi avatar for assistant */}
                    {msg.role === 'assistant' && !msg.isTyping && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                        🎓
                      </div>
                    )}

                    {msg.isTyping ? (
                      <div style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', gap: '5px', alignItems: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`sarthi-dot-${i}`} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1' }} />
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        maxWidth: '82%',
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '13.5px', lineHeight: 1.55,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                        wordBreak: 'break-word',
                        ...(msg.role === 'user'
                          ? { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff' }
                          : { background: '#fff', color: '#1f2937', border: '1px solid #f0f0f0' }),
                      }}>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.55, textAlign: 'right' }}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: '12px 14px', background: '#fff', borderTop: '1px solid #f1f3f5', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={activeStudent ? `Ask about ${activeStudent.studentName.split(' ')[0]}...` : 'Loading student data...'}
                    disabled={isLoading || !activeStudent}
                    rows={1}
                    style={{
                      flex: 1, resize: 'none', border: '1px solid #e5e7eb', borderRadius: '14px',
                      padding: '10px 14px', fontSize: '13.5px', fontFamily: 'inherit',
                      minHeight: '40px', maxHeight: '96px', overflowY: 'auto', outline: 'none',
                      lineHeight: 1.4, background: !activeStudent ? '#f9fafb' : undefined,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading || !activeStudent}
                    aria-label="Send message"
                    style={{
                      width: '40px', height: '40px', borderRadius: '14px', border: 'none',
                      cursor: (!input.trim() || isLoading || !activeStudent) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', flexShrink: 0,
                      opacity: (!input.trim() || isLoading || !activeStudent) ? 0.4 : 1,
                      transition: 'opacity 0.15s, transform 0.15s',
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>
                <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '6px' }}>
                  Enter to send • Shift+Enter for new line
                  {input.length > 0 && <span> • {input.length}/500</span>}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
