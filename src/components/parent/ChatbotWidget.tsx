import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Minus, Send } from 'lucide-react';
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

interface StudentContext {
  studentId: string;
  studentName: string;
  classId: string;
  parentId: string;
}

/* ─── Quick Actions ──────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: "📊 Today's Attendance", message: "What is my child's attendance today?" },
  { label: '📚 Pending Homework', message: 'Show me pending homework' },
  { label: '💰 Fee Status', message: 'What is the current fee status?' },
  { label: '📋 Leave Status', message: 'Show me recent leave requests' },
];

/* ─── Tool Definitions (OpenAI / Grok format) ────────────────────────────── */

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
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    fromDate = weekStart.toISOString().split('T')[0];
    toDate = new Date().toISOString().split('T')[0];
  } else if (period === 'this_month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    toDate = new Date().toISOString().split('T')[0];
  } else {
    // last_month
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
    period,
    from: fromDate,
    to: toDate,
    present,
    absent,
    half_day: halfDay,
    leave,
    total_marked: total,
    attendance_percentage: percentage,
    recent_absences:
      records
        .filter((r: any) => r.status === 'absent')
        .slice(0, 3)
        .map((r: any) => ({ date: r.date, note: r.remarks })) || [],
  };
}

async function getHomework(input: { filter: string }, classId: string) {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('homework')
    .select('id, subject, title, description, due_date, created_at')
    .eq('class_id', classId)
    .order('due_date', { ascending: true });

  if (input.filter === 'overdue') {
    query = query.lt('due_date', today);
  } else if (input.filter === 'today') {
    query = query.eq('due_date', today);
  } else if (input.filter === 'pending') {
    query = query.gte('due_date', today);
  }

  const { data } = await query.limit(10);

  return {
    homework:
      data?.map((h: any) => ({
        subject: h.subject,
        title: h.title,
        description: h.description,
        due_date: h.due_date,
        is_overdue: h.due_date < today,
        is_due_today: h.due_date === today,
      })) || [],
    count: data?.length || 0,
  };
}

async function getFeeStatus(studentId: string) {
  const { data: feeData } = await (supabase as any)
    .from('student_fees')
    .select(`
      total_amount,
      paid_amount,
      balance_amount,
      status,
      academic_year
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!feeData) return { message: 'No fee record found for this student' };

  // Get recent payments
  const { data: payments } = await (supabase as any)
    .from('fee_payments')
    .select('amount_paid, payment_date, payment_mode, receipt_number')
    .eq('student_id', studentId)
    .order('payment_date', { ascending: false })
    .limit(3);

  const lastPayment = payments?.[0];

  return {
    total_fee: feeData.total_amount,
    paid_amount: feeData.paid_amount,
    balance_due: feeData.balance_amount,
    status: feeData.status,
    academic_year: feeData.academic_year,
    last_payment: lastPayment
      ? {
          amount: lastPayment.amount_paid,
          date: lastPayment.payment_date,
          mode: lastPayment.payment_mode,
          receipt: lastPayment.receipt_number,
        }
      : null,
    payment_count: payments?.length || 0,
  };
}

async function getLeaveRequests(input: { status: string }, studentId: string, parentId: string) {
  let query = supabase
    .from('student_leave_requests')
    .select('from_date, to_date, leave_type, reason, status, teacher_note, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (input.status !== 'all') {
    query = query.eq('status', input.status);
  }

  const { data } = await query;
  return { requests: data || [], count: data?.length || 0 };
}

async function getRemarks(input: { category: string }, studentId: string) {
  let query = supabase
    .from('student_remarks')
    .select('category, title, description, remark_type, created_at, is_read_by_parent')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (input.category !== 'all') {
    query = query.eq('category', input.category);
  }

  const { data } = await query;
  return {
    remarks:
      data?.map((r: any) => ({
        category: r.category,
        title: r.title,
        description: r.description,
        type: r.remark_type,
        created_at: r.created_at,
        is_read: r.is_read_by_parent,
      })) || [],
    count: data?.length || 0,
  };
}

async function getDocumentRequests(parentId: string, studentId: string) {
  const { data } = await supabase
    .from('document_requests')
    .select('document_type, status, purpose, requested_at, document_url')
    .eq('student_id', studentId)
    .eq('parent_id', parentId)
    .order('requested_at', { ascending: false });

  return { requests: data || [], count: data?.length || 0 };
}

async function getStudyMaterials(input: { subject: string }, classId: string) {
  let query = (supabase as any)
    .from('study_materials')
    .select('title, subject, material_type, url, description, created_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (input.subject !== 'all') {
    query = query.ilike('subject', `%${input.subject}%`);
  }

  const { data } = await query;
  return { materials: data || [], count: data?.length || 0 };
}

async function applyLeave(
  input: { from_date: string; to_date: string; leave_type: string; reason: string },
  studentId: string,
  parentId: string,
  classId: string,
) {
  const { data, error } = await supabase
    .from('student_leave_requests')
    .insert({
      student_id: studentId,
      parent_id: parentId,
      class_id: classId,
      from_date: input.from_date,
      to_date: input.to_date,
      leave_type: input.leave_type,
      reason: input.reason,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    message: 'Leave request submitted successfully',
    request_id: data.id,
    status: 'pending',
    note: 'The Class Teacher will review and respond shortly.',
  };
}

async function requestDocumentFn(
  input: { document_type: string; purpose: string },
  studentId: string,
  parentId: string,
) {
  // Find clerk via edge function
  const { data: clerkResponse } = await supabase.functions.invoke('find-clerk');
  const clerkData = clerkResponse?.clerk || null;

  const stage = clerkData ? 'clerk_review' : 'submitted';

  const { data, error } = await (supabase as any)
    .from('document_requests')
    .insert({
      student_id: studentId,
      parent_id: parentId,
      document_type: input.document_type,
      purpose: input.purpose,
      current_stage: stage,
      status: stage,
      assigned_clerk_id: clerkData?.id || null,
      requested_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  // Notify clerk if found
  if (clerkData?.user_id) {
    await supabase.from('notifications').insert({
      user_id: clerkData.user_id,
      title: 'New Document Request',
      message: `New ${input.document_type} request from parent (via Sarthi chatbot)`,
      type: 'document_request',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    message: `${input.document_type} request submitted successfully`,
    status: 'Under Review',
    note: 'The Administration team will process your request.',
  };
}

/* ─── System Prompt Builder ──────────────────────────────────────────────── */

function buildSystemPrompt(ctx: StudentContext, schoolName: string) {
  return `You are Sarthi (साथी), a warm and helpful school assistant chatbot for parents at ${schoolName || 'this school'}. Your name means "guide" or "companion" in Hindi.

You are currently helping the parent of **${ctx.studentName}**.
Student ID: ${ctx.studentId}
Class ID: ${ctx.classId}

PERSONALITY:
- Warm, caring, and professional
- Speak like a helpful school coordinator
- Use simple language — parents may not be tech-savvy
- Be concise but thorough
- Use relevant emojis naturally (not excessively)
- If parent writes in Hindi or mixed language, respond in the same style

RULES:
- Always use the tool functions to get real data — NEVER make up numbers or information
- If a tool returns no data or an empty list, say so honestly
- Before taking any action (applying leave, requesting documents), ALWAYS confirm with the parent first — describe what you're about to do and ask them to confirm
- Never share one child's data with another parent
- If you cannot help with something, suggest they contact the school office
- Always be encouraging about the student's progress
- If attendance is below 75%, gently flag it as a concern
- Always address the student by their first name: ${ctx.studentName.split(' ')[0]}
- Keep responses brief and well-formatted using markdown-like formatting
${DOWNLOAD_PROMPT}

GREETING:
When the parent first opens the chat, greet them warmly with their child's name and provide a brief summary of important things today.`;
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
  const [studentCtx, setStudentCtx] = useState<StudentContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch student context for this parent
  useEffect(() => {
    const fetchStudentContext = async () => {
      if (!user?.id) return;

      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!parent) return;

      const { data: link } = await supabase
        .from('parent_student_link')
        .select('student_id')
        .eq('parent_id', parent.id)
        .limit(1)
        .maybeSingle();
      if (!link) return;

      const { data: student } = await supabase
        .from('students')
        .select('id, full_name, class_id')
        .eq('id', link.student_id)
        .maybeSingle();

      if (student && student.class_id) {
        setStudentCtx({
          studentId: student.id,
          studentName: student.full_name,
          classId: student.class_id,
          parentId: parent.id,
        });
      }
    };

    fetchStudentContext();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Execute tool call
  const executeToolCall = useCallback(
    async (toolName: string, toolInput: any) => {
      if (!studentCtx) return { error: 'No student context' };
      const { studentId, classId, parentId } = studentCtx;

      switch (toolName) {
        case 'get_attendance_summary':
          return await getAttendanceSummary(toolInput, studentId);
        case 'get_homework':
          return await getHomework(toolInput, classId);
        case 'get_fee_status':
          return await getFeeStatus(studentId);
        case 'get_leave_requests':
          return await getLeaveRequests(toolInput, studentId, parentId);
        case 'get_remarks':
          return await getRemarks(toolInput, studentId);
        case 'get_document_requests':
          return await getDocumentRequests(parentId, studentId);
        case 'get_study_materials':
          return await getStudyMaterials(toolInput, classId);
        case 'apply_leave':
          return await applyLeave(toolInput, studentId, parentId, classId);
        case 'request_document':
          return await requestDocumentFn(toolInput, studentId, parentId);
        case 'download_student_report':
          return await handleDownloadReport(toolInput, { studentId, classId, role: 'parent' });
        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    },
    [studentCtx],
  );

  // Helper: call Groq API
  const callGroqAPI = useCallback(async (messagesToSend: any[], withTools: boolean) => {
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messagesToSend,
        ...(withTools ? { tools: TOOL_DEFINITIONS, tool_choice: 'auto' } : {}),
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    return response;
  }, []);

  // Helper: parse failed_generation to extract tool calls from <function=name {args}> format
  const parseFailedToolCall = (failedText: string): { name: string; args: any } | null => {
    // Match pattern: <function=tool_name {"key": "value"}>
    const match = failedText.match(/<function=(\w+)\s*(\{[^}]*\})>/);
    if (match) {
      try {
        return { name: match[1], args: JSON.parse(match[2]) };
      } catch {
        return null;
      }
    }
    return null;
  };

  // Send message to Groq directly (OpenAI-compatible format)
  const sendMessage = useCallback(
    async (text: string, silent = false) => {
      if (!text.trim() || !studentCtx) return;

      // Add user message to UI
      if (!silent) {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: text,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
      }

      // Add typing indicator
      const typingId = 'typing-' + Date.now();
      setMessages((prev) => [
        ...prev,
        { id: typingId, role: 'assistant', content: '', timestamp: new Date(), isTyping: true },
      ]);

      setIsLoading(true);

      try {
        // Build conversation for Groq (OpenAI format — system prompt as first message)
        const userContent = { role: 'user' as const, content: text };

        if (!silent) {
          conversationHistory.current.push(userContent);
        }

        const systemMessage = { role: 'system' as const, content: buildSystemPrompt(studentCtx, schoolName) };
        let messagesToSend: any[] = silent
          ? [systemMessage, userContent]
          : [systemMessage, ...conversationHistory.current];

        // Agentic loop — keep processing tool calls
        let continueLoop = true;
        let finalText = '';
        let retryCount = 0;
        const MAX_RETRIES = 5;

        while (continueLoop && retryCount < MAX_RETRIES) {
          retryCount++;
          const response = await callGroqAPI(messagesToSend, true);

          // Handle tool_use_failed errors — parse the failed_generation text for tool calls
          if (!response.ok) {
            const errBody = await response.text();
            console.warn('[CHATBOT] Groq API non-OK:', response.status, errBody);

            try {
              const errorObj = JSON.parse(errBody);
              const failedGen = errorObj?.error?.failed_generation;
              const errorCode = errorObj?.error?.code;

              if (errorCode === 'tool_use_failed' && failedGen) {
                // The model tried to call a tool in the wrong format — parse it manually
                const parsed = parseFailedToolCall(failedGen);
                if (parsed) {
                  console.log('[CHATBOT] Recovered tool call from failed_generation:', parsed.name);
                  const result = await executeToolCall(parsed.name, parsed.args);

                  // Extract any text before the <function> tag as assistant's partial message
                  const partialText = failedGen.split('<function=')[0].trim();

                  // Build a synthetic tool call ID
                  const fakeCallId = 'call_recovered_' + Date.now();

                  // Append simulated assistant + tool result, then loop again WITHOUT tools
                  // so the model generates a final text response
                  messagesToSend = [
                    ...messagesToSend,
                    {
                      role: 'assistant' as const,
                      content: null,
                      tool_calls: [{
                        id: fakeCallId,
                        type: 'function',
                        function: { name: parsed.name, arguments: JSON.stringify(parsed.args) },
                      }],
                    },
                    {
                      role: 'tool' as const,
                      tool_call_id: fakeCallId,
                      content: JSON.stringify(result),
                    },
                  ];
                  continue; // Loop again with the tool result
                }
              }
            } catch {
              // JSON parse failed, fall through to generic error
            }

            throw new Error(`Groq API error: ${response.status}`);
          }

          const responseData = await response.json();

          // OpenAI / Groq response format
          const choice = responseData.choices?.[0];
          if (!choice) throw new Error('No response from Groq');

          const finishReason = choice.finish_reason;
          const message = choice.message;

          if (finishReason === 'tool_calls' || (message.tool_calls && message.tool_calls.length > 0)) {
            // Groq returned proper tool calls
            const assistantMsg = {
              role: 'assistant' as const,
              content: message.content || null,
              tool_calls: message.tool_calls,
            };

            // Execute each tool call and build tool result messages
            const toolResultMessages = await Promise.all(
              message.tool_calls.map(async (tc: any) => {
                const args = typeof tc.function.arguments === 'string'
                  ? JSON.parse(tc.function.arguments)
                  : tc.function.arguments;
                const result = await executeToolCall(tc.function.name, args);
                return {
                  role: 'tool' as const,
                  tool_call_id: tc.id,
                  content: JSON.stringify(result),
                };
              }),
            );

            // Append assistant message + tool results to conversation
            messagesToSend = [
              ...messagesToSend,
              assistantMsg,
              ...toolResultMessages,
            ];
          } else {
            // Final text response (finish_reason === 'stop')
            finalText = sanitizeResponseText(message.content || '');
            continueLoop = false;
          }
        }

        // Remove typing indicator and add real response
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== typingId),
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: finalText,
            timestamp: new Date(),
          },
        ]);

        // Add to conversation history (keep it manageable)
        if (!silent) {
          conversationHistory.current.push({
            role: 'assistant',
            content: finalText,
          });

          // Trim history to last 20 messages
          if (conversationHistory.current.length > 20) {
            conversationHistory.current = conversationHistory.current.slice(-20);
          }
        }
      } catch (err: any) {
        console.error('[CHATBOT] Error:', err);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== typingId),
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I'm sorry, I encountered an error. Please try again in a moment. 🙏",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [studentCtx, executeToolCall, callGroqAPI],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Don't render if not a parent user or no student context
  if (!user) return null;

  return (
    <>
      {/* ─── CSS ─────────────────────────────────────────────────────────── */}
      <style>{`
        .chatbot-fab {
          position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px;
          border-radius: 50%; background: hsl(var(--primary)); box-shadow: 0 8px 32px hsla(var(--primary), 0.4);
          cursor: pointer; z-index: 9999; transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex; align-items: center; justify-content: center; border: none; outline: none;
        }
        .chatbot-fab:hover { transform: scale(1.1); box-shadow: 0 12px 40px hsla(var(--primary), 0.6); }

        .chatbot-panel {
          position: fixed; bottom: 24px; right: 24px; width: 388px; background: #fff;
          border-radius: 20px; z-index: 9999; display: flex; flex-direction: column;
          overflow: hidden; animation: chatbot-slide-up 0.35s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 24px 80px hsla(var(--primary), 0.22), 0 0 0 1px hsla(var(--primary), 0.08);
        }
        .chatbot-panel.minimized { height: 64px !important; }
        @keyframes chatbot-slide-up { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 480px) { .chatbot-panel { width: 100%; right: 0; bottom: 0; border-radius: 20px 20px 0 0; height: 85vh !important; } }

        .chatbot-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; flex-shrink: 0; background: hsl(var(--primary)); }
        .chatbot-header-left { display: flex; align-items: center; gap: 12px; }
        .chatbot-header-icon { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; }
        .chatbot-header-title { color: #fff; font-weight: 600; font-size: 14px; line-height: 1.3; }
        .chatbot-header-sub { color: rgba(255,255,255,0.65); font-size: 11px; }
        .chatbot-header-actions { display: flex; align-items: center; gap: 4px; }
        .chatbot-header-btn { background: none; border: none; padding: 6px; cursor: pointer; border-radius: 8px; transition: background 0.15s; display: flex; align-items: center; justify-content: center; }
        .chatbot-header-btn:hover { background: rgba(255,255,255,0.18); }

        .chatbot-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8f9fb; }
        .chatbot-messages::-webkit-scrollbar { width: 4px; }
        .chatbot-messages::-webkit-scrollbar-thumb { background: #c7c7cc; border-radius: 4px; }

        .chatbot-msg { display: flex; animation: chatbot-msg-in 0.3s ease; }
        @keyframes chatbot-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .chatbot-msg.user { justify-content: flex-end; }
        .chatbot-msg.assistant { justify-content: flex-start; }

        .chatbot-bubble { max-width: 82%; padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.55; box-shadow: 0 1px 3px rgba(0,0,0,0.06); word-break: break-word; }
        .chatbot-bubble.user { background: hsl(var(--primary)); color: #fff; border-bottom-right-radius: 6px; }
        .chatbot-bubble.assistant { background: #fff; color: #1f2937; border: 1px solid #e5e7eb; border-bottom-left-radius: 6px; }
        .chatbot-bubble .timestamp { font-size: 10px; margin-top: 4px; opacity: 0.55; }
        .chatbot-bubble.user .timestamp { color: rgba(255,255,255,0.6); }
        .chatbot-bubble.assistant .timestamp { color: #9ca3af; }

        .chatbot-typing { display: flex; gap: 5px; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; border-bottom-left-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .chatbot-typing-dot { width: 7px; height: 7px; border-radius: 50%; background: hsl(var(--primary)); animation: chatbot-typing-bounce 1.4s infinite ease-in-out; }
        .chatbot-typing-dot:nth-child(2) { animation-delay: 0.16s; }
        .chatbot-typing-dot:nth-child(3) { animation-delay: 0.32s; }
        @keyframes chatbot-typing-bounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

        .chatbot-welcome { text-align: center; padding: 20px 8px; }
        .chatbot-welcome-icon { width: 60px; height: 60px; margin: 0 auto 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: hsla(var(--primary), 0.1); color: hsl(var(--primary)); }
        .chatbot-welcome h3 { color: #374151; font-size: 15px; font-weight: 600; margin: 0 0 4px; }
        .chatbot-welcome p { color: #9ca3af; font-size: 12px; margin: 0; }
        .chatbot-quick-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
        .chatbot-quick-btn { padding: 6px 14px; background: #fff; font-size: 12px; border-radius: 999px; cursor: pointer; transition: all 0.15s; font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border: 1px solid hsla(var(--primary), 0.3); color: hsl(var(--primary)); }
        .chatbot-quick-btn:hover { background: hsla(var(--primary), 0.05); border-color: hsl(var(--primary)); transform: translateY(-1px); }

        .chatbot-input-area { padding: 12px 14px; background: #fff; border-top: 1px solid #f1f3f5; flex-shrink: 0; }
        .chatbot-input-row { display: flex; gap: 8px; align-items: flex-end; }
        .chatbot-textarea { flex: 1; resize: none; border: 1px solid #e5e7eb; border-radius: 14px; padding: 10px 14px; font-size: 13.5px; font-family: inherit; min-height: 40px; max-height: 96px; overflow-y: auto; outline: none; transition: border-color 0.15s, box-shadow 0.15s; line-height: 1.4; }
        .chatbot-textarea:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsla(var(--primary), 0.12); }
        .chatbot-textarea:disabled { background: #f9fafb; color: #9ca3af; }
        .chatbot-textarea::placeholder { color: #9ca3af; }
        .chatbot-send-btn { width: 40px; height: 40px; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s, transform 0.15s; background: hsl(var(--primary)); color: #fff; }
        .chatbot-send-btn:hover:not(:disabled) { transform: scale(1.05); }
        .chatbot-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .chatbot-input-hint { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 6px; }
        .chatbot-content-text { white-space: pre-wrap; }
        .chatbot-content-text strong, .chatbot-content-text b { font-weight: 600; }
      `}</style>

      {/* ─── Floating Button ─────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          title="Ask your school assistant"
          aria-label="Open Sarthi school assistant"
        >
          <Sparkles className="w-6 h-6" style={{ color: '#fff' }} />
        </button>
      )}

      {/* ─── Chat Panel ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={`chatbot-panel ${isMinimized ? 'minimized' : ''}`}
          style={{ height: isMinimized ? 64 : 600 }}
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-header-icon">
                <Sparkles className="w-5 h-5" style={{ color: '#fff' }} />
              </div>
              <div>
                <div className="chatbot-header-title">Sarthi</div>
                <div className="chatbot-header-sub">School Assistant • AI Powered</div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-header-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
              >
                <Minus className="w-4 h-4" style={{ color: '#fff' }} />
              </button>
              <button
                className="chatbot-header-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <X className="w-4 h-4" style={{ color: '#fff' }} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="chatbot-messages">
                {messages.length === 0 && !isLoading && (
                  <div className="chatbot-welcome">
                    <div className="chatbot-welcome-icon">
                      <Sparkles className="w-7 h-7" style={{ color: '#4F46E5' }} />
                    </div>
                    <h3>Hi! I'm Sarthi 👋</h3>
                    <p>Ask me anything about your child's school life</p>

                    <div className="chatbot-quick-actions">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.label}
                          className="chatbot-quick-btn"
                          onClick={() => sendMessage(action.message)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`chatbot-msg ${msg.role}`}>
                    {msg.isTyping ? (
                      <div className="chatbot-typing">
                        <div className="chatbot-typing-dot" />
                        <div className="chatbot-typing-dot" />
                        <div className="chatbot-typing-dot" />
                      </div>
                    ) : (
                      <div className={`chatbot-bubble ${msg.role}`}>
                        <div className="chatbot-content-text">{msg.content}</div>
                        <div className="timestamp">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chatbot-input-area">
                <div className="chatbot-input-row">
                  <textarea
                    ref={textareaRef}
                    className="chatbot-textarea"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your child..."
                    disabled={isLoading}
                    rows={1}
                  />
                  <button
                    className="chatbot-send-btn"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" style={{ color: '#fff' }} />
                  </button>
                </div>
                <div className="chatbot-input-hint">
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
