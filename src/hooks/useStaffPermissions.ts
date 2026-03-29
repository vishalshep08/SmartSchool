import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Permission keys and metadata
export interface PermissionMeta {
    key: string;
    label: string;
    description: string;
    section: string;
}

export const PERMISSION_SECTIONS: Record<string, string> = {
    attendance: 'Attendance',
    homework: 'Homework',
    students: 'Students',
    leave: 'Leave Management',
    remarks: 'Remarks',
    reports: 'Reports',
    salary: 'Salary',
    announcements: 'Announcements',
    documents: 'Documents',
    fee: 'Fee',
};

export const ALL_PERMISSIONS: PermissionMeta[] = [
    // Attendance
    { key: 'attendance.mark', label: 'Mark Attendance', description: 'Can mark daily student attendance', section: 'attendance' },
    { key: 'attendance.edit', label: 'Edit Attendance', description: 'Can edit previously marked attendance', section: 'attendance' },
    { key: 'attendance.view_reports', label: 'View Attendance Reports', description: 'Can view attendance reports and analytics', section: 'attendance' },
    // Homework
    { key: 'homework.post', label: 'Post Homework', description: 'Can create and assign homework', section: 'homework' },
    { key: 'homework.edit', label: 'Edit Homework', description: 'Can edit existing homework assignments', section: 'homework' },
    { key: 'homework.delete', label: 'Delete Homework', description: 'Can delete homework assignments', section: 'homework' },
    // Students
    { key: 'students.view', label: 'View Student List', description: 'Can view list of students', section: 'students' },
    { key: 'students.edit', label: 'Edit Student Details', description: 'Can edit student information', section: 'students' },
    { key: 'students.delete', label: 'Delete Student', description: 'Can permanently delete students', section: 'students' },
    // Leave
    { key: 'leave.approve', label: 'Approve Leave Requests', description: 'Can approve leave applications', section: 'leave' },
    { key: 'leave.reject', label: 'Reject Leave Requests', description: 'Can reject leave applications', section: 'leave' },
    { key: 'leave.view', label: 'View Leave Requests', description: 'Can view all leave requests', section: 'leave' },
    // Remarks
    { key: 'remarks.post', label: 'Post Remarks', description: 'Can post student remarks', section: 'remarks' },
    { key: 'remarks.edit', label: 'Edit Remarks', description: 'Can edit existing remarks', section: 'remarks' },
    { key: 'remarks.delete', label: 'Delete Remarks', description: 'Can delete remarks', section: 'remarks' },
    // Reports
    { key: 'reports.view', label: 'View Reports', description: 'Can view reports and analytics', section: 'reports' },
    { key: 'reports.export', label: 'Export Reports', description: 'Can export reports in various formats', section: 'reports' },
    // Salary
    { key: 'salary.view_own', label: 'View Own Salary Slip', description: 'Can view their own salary slips', section: 'salary' },
    { key: 'salary.view_others', label: 'View Other Staff Salary', description: 'Can view salary of other staff', section: 'salary' },
    { key: 'salary.generate', label: 'Generate Salary', description: 'Can generate salary slips', section: 'salary' },
    // Announcements
    { key: 'announcements.post', label: 'Post Announcements', description: 'Can create and publish announcements', section: 'announcements' },
    { key: 'announcements.delete', label: 'Delete Announcements', description: 'Can delete announcements', section: 'announcements' },
    // Documents
    { key: 'documents.process', label: 'Process Document Requests', description: 'Can process and approve document requests', section: 'documents' },
    // Fee
    { key: 'fee.view', label: 'View Fee Records', description: 'Can view fee payment records', section: 'fee' },
    { key: 'fee.edit', label: 'Edit Fee Records', description: 'Can edit and manage fee records', section: 'fee' },
];

// Default templates
export const PERMISSION_TEMPLATES: Record<string, Record<string, boolean>> = {
    'Class Teacher': {
        'attendance.mark': true, 'attendance.edit': true, 'attendance.view_reports': true,
        'homework.post': true, 'homework.edit': true, 'homework.delete': false,
        'students.view': true, 'students.edit': false, 'students.delete': false,
        'leave.approve': true, 'leave.reject': true, 'leave.view': true,
        'remarks.post': true, 'remarks.edit': true, 'remarks.delete': false,
        'reports.view': true, 'reports.export': true,
        'salary.view_own': true, 'salary.view_others': false, 'salary.generate': false,
        'announcements.post': false, 'announcements.delete': false,
        'documents.process': false,
        'fee.view': false, 'fee.edit': false,
    },
    'Subject Teacher': {
        'attendance.mark': false, 'attendance.edit': false, 'attendance.view_reports': false,
        'homework.post': true, 'homework.edit': true, 'homework.delete': false,
        'students.view': true, 'students.edit': false, 'students.delete': false,
        'leave.approve': false, 'leave.reject': false, 'leave.view': false,
        'remarks.post': true, 'remarks.edit': true, 'remarks.delete': false,
        'reports.view': false, 'reports.export': false,
        'salary.view_own': true, 'salary.view_others': false, 'salary.generate': false,
        'announcements.post': false, 'announcements.delete': false,
        'documents.process': false,
        'fee.view': false, 'fee.edit': false,
    },
    'Non-Teaching Staff': {
        'attendance.mark': false, 'attendance.edit': false, 'attendance.view_reports': false,
        'homework.post': false, 'homework.edit': false, 'homework.delete': false,
        'students.view': false, 'students.edit': false, 'students.delete': false,
        'leave.approve': false, 'leave.reject': false, 'leave.view': false,
        'remarks.post': false, 'remarks.edit': false, 'remarks.delete': false,
        'reports.view': false, 'reports.export': false,
        'salary.view_own': true, 'salary.view_others': false, 'salary.generate': false,
        'announcements.post': false, 'announcements.delete': false,
        'documents.process': false,
        'fee.view': false, 'fee.edit': false,
    },
    'Principal': Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true])),
};

export interface StaffPermission {
    id: string;
    employee_id: string;
    user_id: string;
    permission_key: string;
    is_enabled: boolean;
    updated_by_super_admin_id: string | null;
    updated_at: string;
}

export interface PermissionChangeLog {
    id: string;
    employee_id: string;
    permission_key: string;
    old_value: boolean;
    new_value: boolean;
    changed_by_name: string;
    created_at: string;
}

// Get the default template name for an employee
export function getDefaultTemplateName(empType?: string, isClassTeacher?: boolean): string {
    if (!empType) return 'Non-Teaching Staff';
    const lower = empType.toLowerCase();
    if (lower.includes('teaching') || lower === 'teacher') {
        return isClassTeacher ? 'Class Teacher' : 'Subject Teacher';
    }
    return 'Non-Teaching Staff';
}

// Hook: Get all staff with their permissions
export function useStaffPermissions() {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    // Fetch all staff
    const { data: staffData = [], isLoading: staffLoading } = useQuery({
        queryKey: ['privilege-staff-list'],
        queryFn: async () => {
            const [{ data: teachers, error: teachersErr }, { data: employees, error: employeesErr }] = await Promise.all([
                (supabase as any).from('teachers').select('*'),
                (supabase as any).from('employees').select('*'),
            ]);

            if (teachersErr) console.error('Teachers fetch error:', teachersErr);
            if (employeesErr) console.error('Employees fetch error:', employeesErr);

            const allStaff = [
                ...(teachers || []).map((t: any) => ({ ...t, employee_type: 'Teaching', source_table: 'teachers' })),
                ...(employees || []).map((e: any) => ({ ...e, employee_type: e.employee_type || 'Non-Teaching', source_table: 'employees' })),
            ];

            const userIds = allStaff.map(s => s.user_id).filter(Boolean);
            const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);

            return allStaff.map(s => ({
                ...s,
                profile: profiles?.find(p => p.user_id === s.user_id) || null,
            }));
        },
    });

    // Fetch all permissions
    const { data: allPermissions = [], isLoading: permsLoading } = useQuery({
        queryKey: ['all-staff-permissions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('staff_permissions' as any)
                .select('*');
            if (error) {
                console.error('Failed to load permissions, table may not exist:', error);
                return [];
            }
            return data as unknown as StaffPermission[];
        },
    });

    // Get permissions for a specific employee
    const getEmployeePermissions = (employeeId: string): Record<string, boolean> => {
        const perms: Record<string, boolean> = {};
        ALL_PERMISSIONS.forEach(p => {
            const found = allPermissions.find(ap => ap.employee_id === employeeId && ap.permission_key === p.key);
            perms[p.key] = found ? found.is_enabled : false;
        });
        return perms;
    };

    // Check if an employee has custom permissions (differs from default template)
    const hasCustomPermissions = (employeeId: string, empType?: string, isClassTeacher?: boolean): boolean => {
        const templateName = getDefaultTemplateName(empType, isClassTeacher);
        const template = PERMISSION_TEMPLATES[templateName] || {};
        const current = getEmployeePermissions(employeeId);

        return ALL_PERMISSIONS.some(p => {
            const defaultVal = template[p.key] ?? false;
            const currentVal = current[p.key] ?? false;
            return defaultVal !== currentVal;
        });
    };

    // Toggle a single permission
    const togglePermission = useMutation({
        mutationFn: async ({ employeeId, userId, permissionKey, newValue }: {
            employeeId: string;
            userId: string;
            permissionKey: string;
            newValue: boolean;
        }) => {
            // Get old value for logging
            const existing = allPermissions.find(
                p => p.employee_id === employeeId && p.permission_key === permissionKey
            );
            const oldValue = existing ? existing.is_enabled : false;

            // Upsert the permission
            const { error } = await supabase
                .from('staff_permissions' as any)
                .upsert({
                    employee_id: employeeId,
                    user_id: userId,
                    permission_key: permissionKey,
                    is_enabled: newValue,
                    updated_by_super_admin_id: user?.id,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'employee_id,permission_key' });
            if (error) throw error;

            // Log the change
            const staffMember = staffData.find(s => s.id === employeeId);
            const staffName = staffMember?.profile?.full_name || staffMember?.employee_id || 'Unknown';

            await supabase.from('super_admin_activity_log' as any).insert({
                performed_by_user_id: user?.id,
                performed_by_name: profile?.fullName || 'Super Admin',
                performed_by_role: 'super_admin',
                action_type: 'PERMISSION_CHANGE',
                module: 'Privileges',
                record_affected: `Permission ${permissionKey} set to ${newValue} for ${staffName} by Super Admin`,
                ip_address: 'N/A',
            });

            // Log to permission change history
            try {
                await supabase.from('permission_change_log' as any).insert({
                    employee_id: employeeId,
                    permission_key: permissionKey,
                    old_value: oldValue,
                    new_value: newValue,
                    changed_by_name: profile?.fullName || 'Super Admin',
                });
            } catch {
                // Table may not exist yet, fail silently
            }

            return { permissionKey, newValue };
        },
        onSuccess: ({ permissionKey, newValue }) => {
            queryClient.invalidateQueries({ queryKey: ['all-staff-permissions'] });
        },
        onError: (err: Error) => {
            toast.error(`Failed to update permission: ${err.message}`);
        },
    });

    // Apply template to one or multiple employees
    const applyTemplate = useMutation({
        mutationFn: async ({ employeeIds, userIds, templateName }: {
            employeeIds: string[];
            userIds: string[];
            templateName: string;
        }) => {
            const template = PERMISSION_TEMPLATES[templateName];
            if (!template) throw new Error('Template not found');

            for (let i = 0; i < employeeIds.length; i++) {
                const employeeId = employeeIds[i];
                const userId = userIds[i];

                // Delete existing permissions
                await supabase
                    .from('staff_permissions' as any)
                    .delete()
                    .eq('employee_id', employeeId);

                // Insert all permissions from template
                const rows = ALL_PERMISSIONS.map(p => ({
                    employee_id: employeeId,
                    user_id: userId,
                    permission_key: p.key,
                    is_enabled: template[p.key] ?? false,
                    updated_by_super_admin_id: user?.id,
                    updated_at: new Date().toISOString(),
                }));

                const { error } = await supabase.from('staff_permissions' as any).insert(rows);
                if (error) throw error;
            }

            // Log action
            const names = employeeIds.map(id => {
                const s = staffData.find(st => st.id === id);
                return s?.profile?.full_name || s?.employee_id || id;
            });

            await supabase.from('super_admin_activity_log' as any).insert({
                performed_by_user_id: user?.id,
                performed_by_name: profile?.fullName || 'Super Admin',
                performed_by_role: 'super_admin',
                action_type: 'PERMISSION_CHANGE',
                module: 'Privileges',
                record_affected: `Template "${templateName}" applied to ${names.join(', ')} by Super Admin`,
                ip_address: 'N/A',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-staff-permissions'] });
            toast.success('Template applied successfully!');
        },
        onError: (err: Error) => {
            toast.error(`Failed to apply template: ${err.message}`);
        },
    });

    return {
        staffList: staffData,
        allPermissions,
        isLoading: staffLoading || permsLoading,
        getEmployeePermissions,
        hasCustomPermissions,
        togglePermission,
        applyTemplate,
    };
}

// Hook: Permission change history for an employee
export function usePermissionHistory(employeeId: string) {
    return useQuery({
        queryKey: ['permission-history', employeeId],
        enabled: !!employeeId,
        queryFn: async () => {
            // Try from permission_change_log first
            const { data, error } = await supabase
                .from('permission_change_log' as any)
                .select('*')
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                // Fall back to activity log
                const { data: logData } = await supabase
                    .from('super_admin_activity_log' as any)
                    .select('*')
                    .eq('action_type', 'PERMISSION_CHANGE')
                    .ilike('record_affected', `%${employeeId}%`)
                    .order('created_at', { ascending: false })
                    .limit(50);
                return (logData || []) as unknown as PermissionChangeLog[];
            }

            return (data || []) as unknown as PermissionChangeLog[];
        },
    });
}
