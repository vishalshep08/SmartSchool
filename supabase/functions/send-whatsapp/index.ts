import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRecipient {
  to: string;
  message?: string;
  studentId?: string;
  studentName?: string;
  className?: string;
}

interface RequestBody {
  type: 'attendance' | 'homework' | 'notice' | 'leave' | 'remark' | 'event' | 'timetable' | 'fee_reminder' | 'emergency' | 'custom';
  recipients: WhatsAppRecipient[];
  data?: Record<string, any>;
  schoolName?: string;
  action?: string;
  logId?: string;
  triggeredBy?: 'system' | 'teacher' | 'admin';
  priority?: 'normal' | 'urgent';
  classId?: string;
  teacherId?: string;
}

interface SendResult {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
  studentId?: string;
  queued?: boolean;
}

const WHATSAPP_API_URL = "https://graph.facebook.com/v17.0";

// Quiet hours configuration (IST: 7 PM to 7 AM next day)
const QUIET_HOURS_START = 19; // 7 PM
const QUIET_HOURS_END = 7;    // 7 AM

// Initialize Supabase client for logging
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get current hour in IST
function getCurrentISTHour(): number {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.getUTCHours();
}

// Check if current time is within quiet hours
function isQuietHours(): boolean {
  const hour = getCurrentISTHour();
  // Quiet hours: 7 PM (19) to 7 AM (7)
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

// Format date to DD/MM/YYYY (Indian format)
function formatDateIndian(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Format phone number (remove any non-digits and ensure country code)
    let formattedPhone = to.replace(/\D/g, '');
    
    // Add India country code if not present
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log(`Sending WhatsApp message to ${formattedPhone}`);
    
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return { 
        success: false, 
        error: data.error?.message || "Failed to send message" 
      };
    }

    console.log("WhatsApp message sent successfully:", data);
    return { 
      success: true, 
      messageId: data.messages?.[0]?.id 
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending WhatsApp message:", error);
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

// Generate official, respectful Indian school messages
function generateMessage(type: string, data: Record<string, any>, schoolName: string): string {
  const school = schoolName || "Smart School";
  
  switch (type) {
    case 'attendance':
      if (data.status === 'present') {
        return `Dear Parent,\n\nYour child ${data.studentName} (${data.className}) is PRESENT today.\nDate: ${formatDateIndian(data.date)}\n${data.remarks ? `Note: ${data.remarks}\n` : ''}\n– ${school}`;
      } else if (data.status === 'absent') {
        return `Dear Parent,\n\nYour child ${data.studentName} (${data.className}) was marked ABSENT today.\n\nIf this is unexpected, please contact the school.\nDate: ${formatDateIndian(data.date)}\n\n– ${school}`;
      } else if (data.status === 'late') {
        return `Dear Parent,\n\nYour child ${data.studentName} (${data.className}) arrived LATE today.\nDate: ${formatDateIndian(data.date)}\n${data.remarks ? `Note: ${data.remarks}\n` : ''}\nKindly ensure punctuality.\n\n– ${school}`;
      } else {
        return `Dear Parent,\n\nYour child ${data.studentName} (${data.className}) was marked HALF DAY today.\nDate: ${formatDateIndian(data.date)}\n${data.remarks ? `Note: ${data.remarks}\n` : ''}\n– ${school}`;
      }

    case 'homework':
      return `Dear Parent,\n\nHomework has been assigned for ${data.className} (${data.subject}).\n\nTitle: ${data.title}\nDue Date: ${formatDateIndian(data.dueDate)}\n${data.description ? `\nDetails: ${data.description}\n` : ''}\nPlease ensure your child completes the homework on time.\n\n– ${school}`;

    case 'notice':
      const priorityPrefix = data.priority === 'urgent' ? '🚨 URGENT: ' :
                            data.priority === 'high' ? '⚠️ IMPORTANT: ' : '';
      return `Dear Parent,\n\n${priorityPrefix}${data.title}\n\n${data.content}\n${data.expiresAt ? `\nValid until: ${formatDateIndian(data.expiresAt)}` : ''}\n\n– ${school}`;

    case 'leave':
      const leaveStatus = data.status === 'approved' ? 'APPROVED' :
                         data.status === 'rejected' ? 'REJECTED' : 'Pending';
      return `Dear Teacher,\n\nYour leave request has been ${leaveStatus}.\n\nLeave Type: ${data.leaveType}\nFrom: ${formatDateIndian(data.startDate)}\nTo: ${formatDateIndian(data.endDate)}\n${data.approvalNotes ? `\nRemarks: ${data.approvalNotes}` : ''}\n\n– ${school}`;

    case 'remark':
      const remarkLabel = data.remarkType === 'positive' ? '⭐ Positive Remark' :
                         data.remarkType === 'negative' ? '⚠️ Needs Attention' : '📝 Note';
      return `Dear Parent,\n\n${remarkLabel} for ${data.studentName}\n\nCategory: ${data.category}\nTitle: ${data.title}\n${data.description ? `\nDetails: ${data.description}\n` : ''}\nBy: ${data.teacherName}\n\n– ${school}`;

    case 'event':
      const eventType = data.isHoliday ? '📅 Holiday Notice' : '🎉 Event Announcement';
      return `Dear Parent,\n\n${eventType}\n\nEvent: ${data.title}\nDate: ${formatDateIndian(data.startDate)}${data.endDate ? ` to ${formatDateIndian(data.endDate)}` : ''}\n${data.description ? `\nDetails: ${data.description}` : ''}\n${data.isHoliday ? '\nThe school will remain closed on this day.' : ''}\n\n– ${school}`;

    case 'timetable':
      return `Dear Parent,\n\nPlease note that today's ${data.className} ${data.subject} period has been reassigned.\n${data.details ? `\nDetails: ${data.details}` : ''}\n\n– ${school}`;

    case 'fee_reminder':
      return `Dear Parent,\n\nThis is a gentle reminder regarding pending school fees for ${data.studentName || 'your ward'}.\n${data.amount ? `\nAmount Due: ₹${data.amount}` : ''}\n${data.dueDate ? `Due Date: ${formatDateIndian(data.dueDate)}` : ''}\n\nKindly make the payment at the earliest.\n\n– ${school}`;

    case 'emergency':
      return `🚨 URGENT NOTICE 🚨\n\nDear Parent,\n\n${data.message || data.content}\n\n– ${school}`;

    case 'custom':
      return data.message || '';

    default:
      return `Dear Parent,\n\n${data.message || 'No message content'}\n\n– ${school}`;
  }
}

// Log message to database with enhanced fields
async function logWhatsAppMessage(
  supabase: any,
  params: {
    studentId: string | null;
    parentPhone: string;
    messageType: string;
    messageContent: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'queued';
    messageId?: string;
    failureReason?: string;
    triggeredBy: 'system' | 'teacher' | 'admin';
    priority: 'normal' | 'urgent';
    classId?: string;
    teacherId?: string;
    isQueued?: boolean;
    scheduledAt?: string;
  }
) {
  try {
    const { error } = await supabase
      .from('whatsapp_logs')
      .insert({
        student_id: params.studentId,
        parent_phone: params.parentPhone,
        message_type: params.messageType,
        message_content: params.messageContent,
        status: params.status,
        message_id: params.messageId || null,
        failure_reason: params.failureReason || null,
        sent_at: params.status === 'sent' || params.status === 'delivered' ? new Date().toISOString() : null,
        triggered_by: params.triggeredBy,
        trigger_type: params.messageType,
        priority: params.priority,
        class_id: params.classId || null,
        teacher_id: params.teacherId || null,
        is_queued: params.isQueued || false,
        scheduled_at: params.scheduledAt || null,
      });
    
    if (error) {
      console.error('Failed to log WhatsApp message:', error);
    }
  } catch (err) {
    console.error('Error logging WhatsApp message:', err);
  }
}

// Retry failed message
async function retryFailedMessage(
  supabase: any,
  logId: string,
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the failed log entry
    const { data: logEntry, error: fetchError } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('id', logId)
      .single();
    
    if (fetchError || !logEntry) {
      return { success: false, error: 'Log entry not found' };
    }
    
    // Retry sending
    const result = await sendWhatsAppMessage(
      phoneNumberId,
      accessToken,
      logEntry.parent_phone,
      logEntry.message_content
    );
    
    // Update log entry
    await supabase
      .from('whatsapp_logs')
      .update({
        status: result.success ? 'sent' : 'failed',
        message_id: result.messageId || null,
        failure_reason: result.error || null,
        retry_count: (logEntry.retry_count || 0) + 1,
        sent_at: result.success ? new Date().toISOString() : null,
        is_queued: false,
      })
      .eq('id', logId);
    
    return { success: result.success, error: result.error };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

// Process queued messages (for scheduled sending)
async function processQueuedMessages(
  supabase: any,
  phoneNumberId: string,
  accessToken: string
): Promise<{ processed: number; sent: number; failed: number }> {
  try {
    // Get queued messages that are due
    const { data: queuedMessages, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('is_queued', true)
      .lte('scheduled_at', new Date().toISOString())
      .limit(50);
    
    if (error || !queuedMessages || queuedMessages.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const msg of queuedMessages) {
      const result = await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        msg.parent_phone,
        msg.message_content
      );
      
      await supabase
        .from('whatsapp_logs')
        .update({
          status: result.success ? 'sent' : 'failed',
          message_id: result.messageId || null,
          failure_reason: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
          is_queued: false,
        })
        .eq('id', msg.id);
      
      if (result.success) sent++;
      else failed++;
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return { processed: queuedMessages.length, sent, failed };
  } catch (err) {
    console.error('Error processing queued messages:', err);
    return { processed: 0, sent: 0, failed: 0 };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("WHATSAPP_API_TOKEN");

    if (!phoneNumberId || !accessToken) {
      console.error("WhatsApp credentials not configured");
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp integration not configured",
          details: "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_API_TOKEN must be set"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = getSupabaseClient();
    const body: RequestBody = await req.json();
    
    // Handle retry request
    if (body.action === 'retry' && body.logId) {
      const result = await retryFailedMessage(supabase, body.logId, phoneNumberId, accessToken);
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Handle process queue request
    if (body.action === 'process-queue') {
      const result = await processQueuedMessages(supabase, phoneNumberId, accessToken);
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const { 
      type, 
      recipients, 
      data = {}, 
      schoolName = "Smart School",
      triggeredBy = 'system',
      priority = 'normal',
      classId,
      teacherId,
    } = body;

    if (!type || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, recipients" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing ${type} notification for ${recipients.length} recipients (priority: ${priority})`);

    // Check quiet hours for normal priority messages
    const inQuietHours = isQuietHours();
    const shouldQueue = inQuietHours && priority === 'normal' && type !== 'emergency';
    
    if (shouldQueue) {
      console.log('Quiet hours active - queueing messages for next morning');
    }

    const results: SendResult[] = [];
    
    for (const recipient of recipients) {
      const message = recipient.message || generateMessage(type, {
        ...data,
        studentName: recipient.studentName || data.studentName,
        className: recipient.className || data.className,
      }, schoolName);
      
      if (shouldQueue) {
        // Queue message for 7 AM next day
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(7, 0, 0, 0);
        
        await logWhatsAppMessage(supabase, {
          studentId: recipient.studentId || null,
          parentPhone: recipient.to,
          messageType: type,
          messageContent: message,
          status: 'queued',
          triggeredBy,
          priority,
          classId,
          teacherId,
          isQueued: true,
          scheduledAt: tomorrow.toISOString(),
        });
        
        results.push({
          to: recipient.to,
          studentId: recipient.studentId,
          success: true,
          queued: true,
        });
      } else {
        const result = await sendWhatsAppMessage(
          phoneNumberId,
          accessToken,
          recipient.to,
          message
        );
        
        // Log message with enhanced fields
        await logWhatsAppMessage(supabase, {
          studentId: recipient.studentId || null,
          parentPhone: recipient.to,
          messageType: type,
          messageContent: message,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          failureReason: result.error,
          triggeredBy,
          priority,
          classId,
          teacherId,
        });
        
        results.push({
          to: recipient.to,
          studentId: recipient.studentId,
          ...result
        });
        
        // Add small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success && !r.queued).length;
    const queuedCount = results.filter(r => r.queued).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Sent ${successCount} messages, ${queuedCount} queued, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: recipients.length,
          sent: successCount,
          queued: queuedCount,
          failed: failureCount
        },
        results,
        quietHoursActive: inQuietHours,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in send-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
