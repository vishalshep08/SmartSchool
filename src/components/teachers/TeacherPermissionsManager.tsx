import { useState } from 'react';
import { useTeacherPermissions, useTeacherClassAssignments, TeacherPermissions } from '@/hooks/useTeacherPermissions';
import { useClasses } from '@/hooks/useStudents';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Users, 
  BookOpen, 
  Calendar, 
  MessageSquare,
  Bell,
  AlertCircle,
  FileText,
  GraduationCap,
  Plus,
  X,
  Loader2
} from 'lucide-react';

interface TeacherPermissionsManagerProps {
  teacherId: string;
  teacherName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const permissionConfig = [
  { key: 'can_mark_attendance', label: 'Mark Attendance', icon: Calendar, description: 'Allow marking student attendance' },
  { key: 'can_assign_homework', label: 'Assign Homework', icon: BookOpen, description: 'Allow assigning homework to classes' },
  { key: 'can_add_remarks', label: 'Add Remarks', icon: MessageSquare, description: 'Allow adding student remarks' },
  { key: 'can_view_reports', label: 'View Reports', icon: FileText, description: 'Allow viewing attendance reports' },
  { key: 'can_create_notices', label: 'Create Notices', icon: Bell, description: 'Allow creating notices' },
  { key: 'can_view_timetable', label: 'View Timetable', icon: Calendar, description: 'Allow viewing timetable' },
  { key: 'can_raise_issues', label: 'Raise Issues', icon: AlertCircle, description: 'Allow raising issues/complaints' },
  { key: 'can_manage_students', label: 'Manage Students', icon: GraduationCap, description: 'Allow adding/editing students in assigned classes' },
];

export function TeacherPermissionsManager({ 
  teacherId, 
  teacherName, 
  open, 
  onOpenChange 
}: TeacherPermissionsManagerProps) {
  const { permissions, isLoading, updatePermissions } = useTeacherPermissions(teacherId);
  const { assignments, assignClass, removeAssignment } = useTeacherClassAssignments(teacherId);
  const { classes } = useClasses();
  const [selectedClass, setSelectedClass] = useState<string>('');

  const handleTogglePermission = async (key: keyof TeacherPermissions, value: boolean) => {
    await updatePermissions.mutateAsync({
      teacher_id: teacherId,
      [key]: value,
    });
  };

  const handleAssignClass = async () => {
    if (!selectedClass) return;
    await assignClass.mutateAsync({
      teacher_id: teacherId,
      class_id: selectedClass,
    });
    setSelectedClass('');
  };

  const assignedClassIds = assignments.map(a => a.class_id);
  const availableClasses = classes.filter(c => !assignedClassIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage Permissions - {teacherName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Class Assignments */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigned Classes
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No classes assigned yet</p>
                ) : (
                  assignments.map((assignment: any) => (
                    <Badge 
                      key={assignment.id} 
                      variant="secondary"
                      className="flex items-center gap-1.5 px-3 py-1.5"
                    >
                      {assignment.classes?.name} {assignment.classes?.section && `- ${assignment.classes?.section}`}
                      <button
                        onClick={() => removeAssignment.mutate(assignment.id)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.section && `- ${cls.section}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleAssignClass}
                  disabled={!selectedClass || assignClass.isPending}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Assign
                </Button>
              </div>
            </div>

            {/* Feature Permissions */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Feature Access
              </h3>
              
              <div className="grid gap-3">
                {permissionConfig.map(({ key, label, icon: Icon, description }) => {
                  const isEnabled = permissions?.[key as keyof TeacherPermissions] ?? true;
                  
                  return (
                    <div 
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <Label className="font-medium">{label}</Label>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled as boolean}
                        onCheckedChange={(checked) => handleTogglePermission(key as keyof TeacherPermissions, checked)}
                        disabled={updatePermissions.isPending}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
