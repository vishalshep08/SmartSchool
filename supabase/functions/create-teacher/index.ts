import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTeacherRequest {
  fullName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  subject: string;
  qualification?: string;
  experienceYears?: number;
  salaryAmount?: number;
  joiningDate?: string;
  systemRole?: 'teacher' | 'staff'; // defaults to 'teacher'
  designation?: string;
}

interface ErrorResponse {
  error_code: string;
  message: string;
  field?: string;
}

// Generate a secure random password
function generatePassword(length: number = 10): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '@#$%&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill remaining characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Generate employee ID if not provided
function generateEmployeeId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EMP-${timestamp.slice(-4)}${random}`;
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Create error response helper
function errorResponse(error: ErrorResponse, status: number = 400): Response {
  return new Response(
    JSON.stringify(error),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize admin client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return errorResponse({
        error_code: 'CONFIG_ERROR',
        message: 'Server configuration error. Please contact administrator.',
      }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse({
        error_code: 'AUTH_MISSING',
        message: 'Authorization header is required',
      }, 401);
    }

    // Verify the calling user is a principal/admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      console.error('Auth error:', authError);
      return errorResponse({
        error_code: 'AUTH_INVALID',
        message: 'Invalid or expired authorization token',
      }, 401);
    }

    // Check if calling user is a principal
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (roleError) {
      console.error('Role check error:', roleError);
      return errorResponse({
        error_code: 'ROLE_CHECK_FAILED',
        message: 'Unable to verify user role',
      }, 500);
    }

    if (roleData?.role !== 'principal') {
      return errorResponse({
        error_code: 'UNAUTHORIZED',
        message: 'Only principals/admins can create teacher accounts',
      }, 403);
    }

    // Parse request body
    let body: CreateTeacherRequest & { employeeType?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse({
        error_code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
      });
    }

    // Guard: only create teaching staff via this function
    const employeeType = body.employeeType || 'Teaching';
    if (employeeType !== 'Teaching') {
      return new Response(
        JSON.stringify({ error: 'Use direct employees table insert for non-teaching staff' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      fullName, 
      email, 
      phone,
      employeeId,
      subject, 
      qualification, 
      experienceYears, 
      salaryAmount,
      joiningDate,
      systemRole,
      designation,
    } = body;

    const resolvedRole = systemRole === 'staff' ? 'staff' : 'teacher';

    // Validate required fields with specific error messages
    if (!fullName || fullName.trim().length < 2) {
      return errorResponse({
        error_code: 'VALIDATION_ERROR',
        message: 'Full name is required and must be at least 2 characters',
        field: 'fullName',
      });
    }

    if (!email) {
      return errorResponse({
        error_code: 'VALIDATION_ERROR',
        message: 'Email is required',
        field: 'email',
      });
    }

    if (!isValidEmail(email)) {
      return errorResponse({
        error_code: 'VALIDATION_ERROR',
        message: 'Please provide a valid email address',
        field: 'email',
      });
    }

    if (!subject || subject.trim().length < 2) {
      return errorResponse({
        error_code: 'VALIDATION_ERROR',
        message: 'Subject is required',
        field: 'subject',
      });
    }

    // Check if email already exists in auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      return errorResponse({
        error_code: 'DB_ERROR',
        message: 'Unable to verify email availability',
      }, 500);
    }

    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      return errorResponse({
        error_code: 'EMAIL_EXISTS',
        message: 'A user with this email already exists',
        field: 'email',
      });
    }

    // Generate password and employee ID
    const password = generatePassword(10);
    const finalEmployeeId = employeeId || generateEmployeeId();

    // Check if employee ID already exists (if provided)
    if (employeeId) {
      const { data: existingEmployee } = await supabaseAdmin
        .from('teachers')
        .select('id')
        .eq('employee_id', employeeId)
        .single();

      if (existingEmployee) {
        return errorResponse({
          error_code: 'EMPLOYEE_ID_EXISTS',
          message: 'This Employee ID is already in use',
          field: 'employeeId',
        });
      }
    }

    console.log(`Creating teacher account for: ${email}, Employee ID: ${finalEmployeeId}`);

    // 1. Create the Auth User with admin API
    // The handle_new_user trigger will automatically create:
    // - profile record
    // - user_roles record with 'teacher' role
    // - teacher record with basic info
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName.trim(), 
        role: resolvedRole,
      }
    });

    if (createError || !userData.user) {
      console.error('Error creating auth user:', createError);
      return errorResponse({
        error_code: 'AUTH_CREATE_FAILED',
        message: createError?.message || 'Failed to create user account',
      }, 500);
    }

    const userId = userData.user.id;
    console.log(`Auth user created with ID: ${userId}`);

    // Small delay to let the trigger complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Update the profile with force_password_change and phone
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone: phone || null,
        force_password_change: true, // IMPORTANT: Force password change on first login
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Non-critical, continue
    }

    // 3. Update the teacher record created by trigger with full details
    const { data: teacherData, error: teacherUpdateError } = await supabaseAdmin
      .from('teachers')
      .update({
        employee_id: finalEmployeeId,
        designation: designation?.trim() || 'Teacher',
        subject: subject.trim(),
        qualification: qualification?.trim() || null,
        experience_years: experienceYears || 0,
        salary_amount: salaryAmount || 0,
        joining_date: joiningDate || new Date().toISOString().split('T')[0],
        is_active: true,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (teacherUpdateError) {
      console.error('Error updating teacher record:', teacherUpdateError);
      // If update failed, maybe trigger didn't create the record - try insert
      const { data: insertedTeacher, error: teacherInsertError } = await supabaseAdmin
        .from('teachers')
        .insert({
          user_id: userId,
          employee_id: finalEmployeeId,
          designation: designation?.trim() || 'Teacher',
          subject: subject.trim(),
          qualification: qualification?.trim() || null,
          experience_years: experienceYears || 0,
          salary_amount: salaryAmount || 0,
          joining_date: joiningDate || new Date().toISOString().split('T')[0],
          is_active: true,
        })
        .select()
        .single();

      if (teacherInsertError) {
        console.error('Error inserting teacher record:', teacherInsertError);
        // Rollback: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return errorResponse({
          error_code: 'TEACHER_CREATE_FAILED',
          message: `Failed to create teacher record: ${teacherInsertError.message}`,
        }, 500);
      }
      
      // Use inserted data
      Object.assign(teacherData || {}, insertedTeacher);
    }

    const finalTeacherData = teacherData || { id: null };

    // Update user_roles if Principal
    const desigText = (designation || '').toLowerCase();
    const isPrincipal = desigText.includes('principal') || desigText.includes('headmaster') || desigText.includes('headmistress');
    const roleToAssign = isPrincipal ? 'principal' : resolvedRole;

    if (isPrincipal) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: roleToAssign })
        .eq('user_id', userId);
      if (roleError) console.error('Error assigning principal role:', roleError);
    }

    // 4. Ensure default teacher permissions exist
    if (finalTeacherData.id) {
      const { error: permCheckError, data: existingPerm } = await supabaseAdmin
        .from('teacher_permissions')
        .select('id')
        .eq('teacher_id', finalTeacherData.id)
        .single();

      if (!existingPerm) {
        const { error: permError } = await supabaseAdmin
          .from('teacher_permissions')
          .insert({
            teacher_id: finalTeacherData.id,
            can_mark_attendance: true,
            can_assign_homework: true,
            can_add_remarks: true,
            can_view_timetable: true,
            can_raise_issues: true,
            can_view_reports: true,
            can_create_notices: false,
            can_manage_students: false,
          });

        if (permError) {
          console.error('Error creating permissions:', permError);
          // Non-critical, a trigger might handle this
        }
      }
    }

    console.log(`Teacher created successfully: ${finalEmployeeId}`);

    // Return success with credentials (password shown only once!)
    return new Response(
      JSON.stringify({
        success: true,
        teacher: {
          id: finalTeacherData.id,
          userId,
          employeeId: finalEmployeeId,
          fullName: fullName.trim(),
          email: email.toLowerCase(),
          phone: phone || null,
          subject: subject.trim(),
          qualification: qualification?.trim() || null,
          experienceYears: experienceYears || 0,
          salaryAmount: salaryAmount || 0,
          joiningDate: joiningDate || new Date().toISOString().split('T')[0],
          defaultPassword: password, // ⚠️ Only returned once - not retrievable later!
          status: 'Active',
          forcePasswordChange: true,
        }
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse({
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    }, 500);
  }
});
