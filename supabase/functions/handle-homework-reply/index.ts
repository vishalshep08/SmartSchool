import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Extract homework ID from subject line
function extractHomeworkId(subject: string): string | null {
  const match = subject.match(/\[REF:HW-([^\]]+)\]/);
  return match ? match[1] : null;
}

// Simple HTML sanitizer - strip script tags and event handlers
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = getSupabaseClient();

    // Extract fields from inbound email payload (Resend format)
    const fromEmail = body.from?.toLowerCase()?.trim();
    const subject = body.subject || '';
    const textBody = body.text || '';
    const htmlBody = body.html || '';
    const attachments = body.attachments || [];

    if (!fromEmail) {
      console.log('No sender email found');
      return new Response(JSON.stringify({ ok: true, skipped: 'no_sender' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract homework ID from subject
    const homeworkId = extractHomeworkId(subject);
    if (!homeworkId) {
      console.log('No homework reference found in subject:', subject);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_ref' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the homework
    const { data: homework, error: hwError } = await supabase
      .from('homework')
      .select('id, class_id, due_date, title, subject')
      .eq('id', homeworkId)
      .single();

    if (hwError || !homework) {
      console.log('Homework not found:', homeworkId);
      return new Response(JSON.stringify({ ok: true, skipped: 'homework_not_found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Match the parent email to a student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, parent_email')
      .eq('parent_email', fromEmail)
      .eq('class_id', homework.class_id)
      .eq('is_active', true)
      .single();

    if (studentError || !student) {
      console.log('No matching student for email:', fromEmail);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_student_match' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate submission
    const { data: existing } = await supabase
      .from('homework_submissions')
      .select('id')
      .eq('homework_id', homeworkId)
      .eq('student_id', student.id)
      .single();

    if (existing) {
      console.log('Duplicate submission blocked for student:', student.id);
      return new Response(JSON.stringify({ ok: true, skipped: 'duplicate' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: check last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('homework_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_email', fromEmail)
      .gte('submitted_at', tenMinAgo);

    if ((recentCount || 0) >= 5) {
      console.log('Rate limit exceeded for:', fromEmail);
      return new Response(JSON.stringify({ ok: true, skipped: 'rate_limited' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine status based on due date
    const isLate = homework.due_date && new Date(homework.due_date) < new Date();
    const status = isLate ? 'late' : 'submitted';

    // Handle attachment upload
    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (attachments.length > 0) {
      const attachment = attachments[0];
      // Check size limit (10MB)
      if (attachment.size && attachment.size > 10 * 1024 * 1024) {
        console.log('Attachment too large:', attachment.size);
      } else if (attachment.content) {
        try {
          const filePath = `${homeworkId}/${student.id}/${Date.now()}_${attachment.filename || 'attachment'}`;
          const fileBuffer = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0));
          
          const { data: uploadData } = await supabase.storage
            .from('homework-submissions')
            .upload(filePath, fileBuffer, {
              contentType: attachment.contentType || 'application/octet-stream',
            });

          if (uploadData) {
            const { data: signedData } = await supabase.storage
              .from('homework-submissions')
              .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);
            attachmentUrl = signedData?.signedUrl || uploadData.path;
            attachmentName = attachment.filename || 'attachment';
          }
        } catch (uploadErr) {
          console.error('Attachment upload failed:', uploadErr);
        }
      }
    }

    // Sanitize submission text
    const submissionText = sanitizeHtml(textBody || htmlBody).slice(0, 10000);

    // Insert submission
    const { error: insertError } = await supabase
      .from('homework_submissions')
      .insert({
        homework_id: homeworkId,
        student_id: student.id,
        parent_email: fromEmail,
        submission_text: submissionText || null,
        submission_url: attachmentUrl,
        attachment_name: attachmentName,
        status,
        submitted_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to insert submission:', insertError);
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      action_type: 'SUBMIT_HOMEWORK',
      description: `Parent submitted ${homework.subject} homework for ${student.full_name}`,
      role: 'parent',
      reference_id: homeworkId,
    });

    console.log('Submission created successfully for student:', student.full_name);

    return new Response(JSON.stringify({ ok: true, status }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('handle-homework-reply error:', err);
    return new Response(JSON.stringify({ ok: true, error: 'internal_error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
