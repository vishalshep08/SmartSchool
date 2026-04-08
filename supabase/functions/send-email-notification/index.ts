import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EmailRecipient {
  to: string;
  studentName?: string;
  studentId?: string;
  className?: string;
}

interface RequestBody {
  recipients: EmailRecipient[] | string[];
  subject: string;
  htmlBody?: string;
  type: 'notice' | 'homework' | 'alert' | 'attendance' | 'leave' | 'remark' | 'event' | 'custom';
  metadata?: Record<string, unknown>;
  sentBy?: string;
}

interface SendResult {
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

// Abstract email service interface
const emailService = {
  async send(params: { to: string; subject: string; html: string; from?: string }): Promise<{ id: string } | null> {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const from = params.from || 'SmartSchool <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Resend API error: ${response.status}`);
    }

    return response.json();
  },
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

function generateEmailHtml(
  type: RequestBody['type'],
  subject: string,
  htmlBody?: string,
  metadata?: Record<string, unknown>,
): string {
  const schoolName = (metadata?.schoolName as string) || '';
  const bodyContent = htmlBody || generateBodyFromType(type, subject, metadata);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1e40af; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; opacity: 0.85; font-size: 13px; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 16px 32px; font-size: 12px; color: #888; border-top: 1px solid #e9ecef; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
    .badge-notice { background: #dbeafe; color: #1d4ed8; }
    .badge-homework { background: #dcfce7; color: #16a34a; }
    .badge-alert { background: #fee2e2; color: #dc2626; }
    .badge-attendance { background: #fef9c3; color: #ca8a04; }
    .badge-emergency { background: #fee2e2; color: #b91c1c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${schoolName}</h1>
      <p>Official School Communication</p>
    </div>
    <div class="body">
      <span class="badge badge-${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
      ${bodyContent}
    </div>
    <div class="footer">
      <p>This is an automated email from ${schoolName}. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateBodyFromType(
  type: RequestBody['type'],
  subject: string,
  metadata?: Record<string, unknown>,
): string {
  const studentName = metadata?.studentName as string;
  const className = metadata?.className as string;
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  switch (type) {
    case 'attendance':
      return `<h2>Attendance Update</h2>
<p>Dear Parent,</p>
<p>This is to inform you about the attendance status of <strong>${studentName || 'your child'}</strong> for <strong>${date}</strong>.</p>
<p>Status: <strong>${(metadata?.status as string)?.toUpperCase() || 'PRESENT'}</strong></p>
<p>Class: ${className || ''}</p>
<p>Please contact the school if you have any queries.</p>`;

    case 'homework':
      return `<h2>New Homework Assigned</h2>
<p>Dear Parent,</p>
<p>New homework has been assigned for <strong>${studentName || 'your child'}</strong>.</p>
<p><strong>Subject:</strong> ${metadata?.subject || ''}</p>
<p><strong>Title:</strong> ${metadata?.title || subject}</p>
<p><strong>Due Date:</strong> ${metadata?.dueDate || ''}</p>
${metadata?.description ? `<p><strong>Details:</strong> ${metadata.description}</p>` : ''}
<p>Class: ${className || ''}</p>`;

    case 'alert':
      return `<h2>⚠️ Important Alert</h2>
<p>Dear Parent,</p>
<p>${subject}</p>
<p>Please contact the school immediately for more information.</p>`;

    default:
      return `<h2>${subject}</h2>
<p>Dear Parent,</p>
<p>Please see the important notice from school management below.</p>`;
  }
}

async function logEmail(
  supabase: ReturnType<typeof getSupabaseClient>,
  params: {
    recipientEmail: string;
    subject: string;
    body: string;
    status: 'sent' | 'failed' | 'pending';
    type: RequestBody['type'];
    sentBy?: string;
    messageId?: string;
    failureReason?: string;
  },
) {
  try {
    await supabase.from('email_logs').insert({
      recipient_email: params.recipientEmail,
      subject: params.subject,
      body: params.body,
      status: params.status,
      type: params.type,
      sent_by: params.sentBy || null,
      message_id: params.messageId || null,
      failure_reason: params.failureReason || null,
    });
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { recipients, subject, htmlBody, type = 'custom', metadata, sentBy } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!subject) {
      return new Response(
        JSON.stringify({ error: 'Subject is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = getSupabaseClient();
    const results: SendResult[] = [];
    const BATCH_SIZE = 10;

    // Normalise recipients
    const normalisedRecipients: EmailRecipient[] = recipients.map((r) =>
      typeof r === 'string' ? { to: r } : r,
    );

    // Batch sending
    for (let i = 0; i < normalisedRecipients.length; i += BATCH_SIZE) {
      const batch = normalisedRecipients.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (recipient) => {
          const recipientMeta = {
            ...metadata,
            studentName: recipient.studentName,
            className: recipient.className,
          };

          const html = htmlBody || generateEmailHtml(type, subject, undefined, recipientMeta);

          try {
            const result = await emailService.send({ to: recipient.to, subject, html });
            await logEmail(supabase, {
              recipientEmail: recipient.to,
              subject,
              body: html,
              status: 'sent',
              type,
              sentBy,
              messageId: result?.id,
            });
            results.push({ email: recipient.to, success: true, messageId: result?.id });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            await logEmail(supabase, {
              recipientEmail: recipient.to,
              subject,
              body: html || '',
              status: 'failed',
              type,
              sentBy,
              failureReason: errorMsg,
            });
            results.push({ email: recipient.to, success: false, error: errorMsg });
          }
        }),
      );
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: results.length, sent: successCount, failed: failCount },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('send-email-notification error:', err);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
