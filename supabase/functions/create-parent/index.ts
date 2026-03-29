import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateParentRequest {
  studentId: string;
  studentName: string;
  studentAdmissionNumber: string;
  className: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  loginUrl?: string;
}

function generatePassword(studentName: string): string {
  const firstName = studentName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  const prefix = firstName.substring(0, 4).padEnd(4, 'a');
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return prefix + digits;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is principal
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (roleData?.role !== 'principal') {
      return new Response(JSON.stringify({ error: 'Only admins can create parent accounts' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body: CreateParentRequest = await req.json();
    const { studentId, studentName, studentAdmissionNumber, className, parentName, parentEmail, parentPhone, loginUrl } = body;

    if (!studentId || !parentEmail || !parentName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const email = parentEmail.trim().toLowerCase();

    // Check if parent already exists
    const { data: existingParent } = await supabaseAdmin
      .from('parents')
      .select('*, parent_student_link(student_id, students(full_name))')
      .eq('email', email)
      .maybeSingle();

    if (existingParent) {
      // SIBLING CASE — just link the student
      const { error: linkError } = await supabaseAdmin
        .from('parent_student_link')
        .insert({ parent_id: existingParent.id, student_id: studentId });

      if (linkError && !linkError.message.includes('duplicate')) {
        console.error('Link error:', linkError);
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Update student's parent_user_id
      await supabaseAdmin
        .from('students')
        .update({ parent_user_id: existingParent.user_id })
        .eq('id', studentId);

      const siblingNames = existingParent.parent_student_link
        ?.map((l: any) => l.students?.full_name)
        .filter(Boolean) || [];

      return new Response(JSON.stringify({
        success: true,
        isNewParent: false,
        siblingNames,
        message: `This email is already linked to ${siblingNames.join(', ')}. The new student has been added to the same parent account.`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // NEW PARENT — create auth user
    const password = generatePassword(studentName);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: parentName.trim(), role: 'parent' },
    });

    if (createError || !userData.user) {
      console.error('Auth create error:', createError);
      return new Response(JSON.stringify({ error: createError?.message || 'Failed to create parent account' }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = userData.user.id;

    // Wait for trigger to create profile + user_roles
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with force_password_change
    await supabaseAdmin
      .from('profiles')
      .update({ phone: parentPhone || null, force_password_change: true })
      .eq('user_id', userId);

    // Create parent record
    const { data: parentRecord, error: parentError } = await supabaseAdmin
      .from('parents')
      .insert({
        user_id: userId,
        email,
        name: parentName.trim(),
        contact_number: parentPhone || null,
      })
      .select()
      .single();

    if (parentError) {
      console.error('Parent insert error:', parentError);
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: parentError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Link parent to student
    await supabaseAdmin
      .from('parent_student_link')
      .insert({ parent_id: parentRecord.id, student_id: studentId });

    // Update student's parent_user_id
    await supabaseAdmin
      .from('students')
      .update({ parent_user_id: userId })
      .eq('id', studentId);

    // Send welcome email via Resend
    if (resendApiKey) {
      try {
        const siteUrl = loginUrl || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/login`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🏫 SmartSchool</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Parent Portal Login Credentials</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #374151;">Dear <strong>${parentName}</strong>,</p>
              <p style="color: #6b7280;">Your parent portal account has been created for your child <strong>${studentName}</strong> (Admission No: ${studentAdmissionNumber}, Class: ${className}).</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px; color: #111827;">Your Login Details</h3>
                <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Password:</strong> ${password}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Login URL:</strong> <a href="${siteUrl}" style="color: #3b82f6;">${siteUrl}</a></p>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Important:</strong> Please change your password on first login for security.</p>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">This is an automated message from SmartSchool ERP System.</p>
            </div>
          </div>
        `;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'SmartSchool <onboarding@resend.dev>',
            to: [email],
            subject: `SmartSchool Parent Portal - Your Login Credentials for ${studentName}`,
            html: emailHtml,
          }),
        });
        console.log('Welcome email sent to:', email);
      } catch (emailErr) {
        console.error('Email send failed (non-critical):', emailErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      isNewParent: true,
      parentId: parentRecord.id,
      defaultPassword: password,
      email,
      message: `Parent account created. Credentials sent to ${email}.`,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
