import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const employeeData = await req.json();

    const {
      fullName,
      dateOfBirth,
      gender,
      contactNumber,
      personalEmail,
      officialEmail,
      address,
      aadhaarNumber,
      employeeType,      // 'Teaching' or 'Non-Teaching' etc
      department,        // 'Academic', 'Administration', 'Finance' etc
      designation,
      dateOfJoining,
      employmentMode,
      salaryGrade,
      bankAccountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      branchName,
      // Teaching specific
      isClassTeacher,
      assignedClassId,
      experienceType,
      qualification,
      subjectsAssigned,
      classesAssigned,
      subject,
      experienceYears,
    } = employeeData;

    const isTeaching = employeeType === 'Teaching' ||
                       department === 'Academic';

    // Determine system role
    const isPrincipal =
      designation?.toLowerCase().includes('principal') ||
      designation?.toLowerCase().includes('headmaster') ||
      designation?.toLowerCase().includes('headmistress');

    const systemRole = isPrincipal ? 'principal'
                     : isTeaching ? 'teacher'
                     : 'staff';

    // Generate default password: first 4 chars of name + 4 random digits
    const namePart = fullName.toLowerCase().replace(/\s/g, '').slice(0, 4);
    const numPart = Math.floor(1000 + Math.random() * 9000);
    const defaultPassword = `${namePart}${numPart}`;

    const loginEmail = officialEmail || personalEmail;

    if (!loginEmail) {
        throw new Error("Either officialEmail or personalEmail must be provided");
    }

    // STEP 1: Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: loginEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { 
          full_name: fullName,
          role: systemRole
        },
      });

    if (authError) throw authError;
    const userId = authData.user.id;

    // STEP 2: Insert into employees table (ALL employees go here)
    const { data: empRecord, error: empError } =
      await supabaseAdmin.from('employees').insert({
        user_id: userId,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        gender: gender,
        contact_number: contactNumber,
        personal_email: personalEmail,
        official_email: officialEmail,
        address: address,
        aadhaar_number: aadhaarNumber,
        employee_type: employeeType,
        department: department,
        designation: designation,
        date_of_joining: dateOfJoining,
        employment_mode: employmentMode,
        salary_grade: salaryGrade,
        bank_account_number: bankAccountNumber,
        ifsc_code: ifscCode,
        account_holder_name: accountHolderName,
        bank_name: bankName,
        branch_name: branchName,
        is_class_teacher: isClassTeacher || false,
        assigned_class_id: assignedClassId || null,
        experience_type: experienceType,
        qualification: qualification,
        subjects_assigned: subjectsAssigned || [],
        classes_assigned: classesAssigned || [],
        status: 'Active',
      }).select().single();

    if (empError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw empError;
    }

    // STEP 3: If Teaching, ALSO insert into teachers table
    let teacherRecord = null;
    if (isTeaching) {
      const { data: tRecord, error: tError } =
        await supabaseAdmin.from('teachers').insert({
          user_id: userId,
          full_name: fullName,
          email: loginEmail,
          contact_number: contactNumber,
          personal_email: personalEmail,
          official_email: officialEmail,
          department: department,
          designation: designation,
          date_of_joining: dateOfJoining,
          employment_mode: employmentMode,
          salary_grade: salaryGrade,
          bank_account_number: bankAccountNumber,
          ifsc_code: ifscCode,
          aadhaar_number: aadhaarNumber,
          date_of_birth: dateOfBirth,
          gender: gender,
          address: address,
          employee_type: employeeType,
          experience_type: experienceType,
          qualification: qualification,
          assigned_class_id: assignedClassId || null,
          subject: subject || (subjectsAssigned?.[0] || ''),
          experience_years: experienceYears || 0,
          status: 'Active',
          is_active: true,
        }).select().single();

      if (tError) {
        console.error('Teachers table insert error:', tError);
        // Do not rollback — employees record is created
        // Teacher table insert is secondary
      } else {
        teacherRecord = tRecord;
      }
    }

    // STEP 4: Insert role into user_roles table (upsert avoids triggers conflict)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: systemRole,
      }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Role upsert error:', roleError);
    }

    // STEP 5: Return credentials and record info
    return new Response(
      JSON.stringify({
        success: true,
        employeeId: empRecord.id,
        teacherId: teacherRecord?.id || null,
        userId: userId,
        loginEmail: loginEmail,
        defaultPassword: defaultPassword,
        systemRole: systemRole,
        isTeaching: isTeaching,
        message: isTeaching
          ? 'Teaching employee created in both employees and teachers tables'
          : 'Non-teaching employee created in employees table',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('create-employee error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
