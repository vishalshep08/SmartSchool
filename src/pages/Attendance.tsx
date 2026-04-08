import { useState, useEffect } from 'react';
import { useStudents, useClasses } from '@/hooks/useStudents';
import { useStudentAttendance, useTeacherAttendance } from '@/hooks/useAttendance';
import { useTeachers, useTeacherProfiles } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClassAssignments } from '@/hooks/useTeacherPermissions';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  UserCheck,
  Users,
  Loader2,
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateIndian } from '@/lib/dateUtils';
import { AttendanceExportModal } from '@/components/attendance/AttendanceExportModal';
import type { Database } from '@/integrations/supabase/types';

type AttendanceStatus = Database['public']['Enums']['attendance_status'];

const statusConfig: Record<AttendanceStatus, { icon: React.ElementType; color: string; label: string }> = {
  present: { icon: CheckCircle, color: 'bg-success/10 text-success border-success/20', label: 'Present' },
  absent: { icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Absent' },
  late: { icon: Clock, color: 'bg-warning/10 text-warning border-warning/20', label: 'Late' },
  half_day: { icon: AlertCircle, color: 'bg-muted text-muted-foreground border-border', label: 'Half Day' },
};

export default function Attendance() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const { classes, isLoading: classesLoading } = useClasses();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [localTeacherAttendance, setLocalTeacherAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Get current teacher info for class teacher check
  const { teachers } = useTeachers();
  const currentTeacher = teachers.find(t => t.user_id === user?.id);
  const { assignments } = useTeacherClassAssignments(currentTeacher?.id);

  // Check if current teacher is class teacher of the selected class
  const classTeacherAssignment = assignments.find(
    a => a.class_id === selectedClass && a.is_class_teacher === true
  );
  const isClassTeacherOfSelected = !!classTeacherAssignment;

  const { students, isLoading: studentsLoading } = useStudents(selectedClass);
  const { attendance, isLoading: attendanceLoading, markAttendance } = useStudentAttendance(selectedClass, selectedDate);
  const { teacherProfiles } = useTeacherProfiles();
  const { attendance: teacherAttendance, markTeacherAttendance } = useTeacherAttendance(selectedDate);

  // Permission checks based on role — only class teacher can mark student attendance
  const canMarkStudentAttendance = role === 'teacher' && isClassTeacherOfSelected;
  const canMarkTeacherAttendance = role === 'principal';
  const canViewStudentAttendance = role === 'principal' || role === 'teacher';
  const canViewTeacherAttendance = role === 'principal';
  // Export is allowed for Admin (principal), Class Teacher, and Super Admin
  const canExport = role === 'principal' || (role === 'teacher' && isClassTeacherOfSelected) || role === 'super_admin';

  // Real-time subscriptions
  useRealtimeSubscription({
    table: 'student_attendance',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  useRealtimeSubscription({
    table: 'teacher_attendance',
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
    },
  });

  // Set default class when classes load — for teachers, default to their class teacher class
  useEffect(() => {
    if (role === 'teacher' && classTeacherAssignment?.class_id) {
      setSelectedClass(classTeacherAssignment.class_id);
    } else if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass, role, classTeacherAssignment]);

  // Initialize local attendance from fetched data — default is ABSENT
  useEffect(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      const record = attendance.find(a => a.student_id === s.id);
      initial[s.id] = record?.status || 'absent';
    });
    setLocalAttendance(initial);
  }, [attendance, students]);

  // Initialize teacher attendance from fetched data — default is ABSENT
  useEffect(() => {
    const initial: Record<string, AttendanceStatus> = {};
    teacherProfiles.forEach(t => {
      const record = teacherAttendance.find(a => a.teacher_id === t.id);
      initial[t.id] = record?.status || 'absent';
    });
    setLocalTeacherAttendance(initial);
  }, [teacherAttendance, teacherProfiles]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!canMarkStudentAttendance) return;
    setLocalAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleTeacherStatusChange = (teacherId: string, status: AttendanceStatus) => {
    if (!canMarkTeacherAttendance) return;
    setLocalTeacherAttendance(prev => ({ ...prev, [teacherId]: status }));
  };

  const handleSaveStudentAttendance = async () => {
    if (!selectedClass || !user?.id || !canMarkStudentAttendance) return;

    const records = Object.entries(localAttendance).map(([studentId, status]) => ({
      student_id: studentId,
      class_id: selectedClass,
      date: selectedDate,
      status,
      marked_by: user.id,
    }));

    await markAttendance.mutateAsync(records);
  };

  const handleSaveTeacherAttendance = async () => {
    if (!user?.id || !canMarkTeacherAttendance) return;

    const records = Object.entries(localTeacherAttendance).map(([teacherId, status]) => ({
      teacher_id: teacherId,
      date: selectedDate,
      status,
      is_biometric: false,
    }));

    await markTeacherAttendance.mutateAsync(records);
  };

  const stats = {
    present: Object.values(localAttendance).filter(s => s === 'present').length,
    absent: Object.values(localAttendance).filter(s => s === 'absent').length,
    late: Object.values(localAttendance).filter(s => s === 'late').length,
    half_day: Object.values(localAttendance).filter(s => s === 'half_day').length,
  };

  const classInfo = classes.find(c => c.id === selectedClass);
  const isLoading = classesLoading || studentsLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-1">
            {canMarkStudentAttendance
              ? 'Mark and manage daily attendance for your class'
              : role === 'teacher' && !isClassTeacherOfSelected
                ? 'You can only mark attendance for classes you are assigned as Class Teacher'
                : 'View daily attendance records'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setExportModalOpen(true)}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          {canMarkStudentAttendance && (
            <Button
              variant="gradient"
              className="gap-2"
              onClick={handleSaveStudentAttendance}
              disabled={markAttendance.isPending || students.length === 0}
            >
              {markAttendance.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Attendance
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="animate-fade-up" style={{ animationDelay: '50ms' }}>
          <TabsTrigger value="students" className="gap-2">
            <Users className="w-4 h-4" />
            Student Attendance
          </TabsTrigger>
          {canViewTeacherAttendance && (
            <TabsTrigger value="teachers" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Teacher Attendance
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          {/* Filters */}
          <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.section && `- ${cls.section}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-sm font-medium border-none outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {classInfo && (
                  <div className="text-sm text-muted-foreground">
                    Class: <span className="font-medium text-foreground">{classInfo.name} {classInfo.section}</span>
                  </div>
                )}
                {!canMarkStudentAttendance && (
                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    View Only
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-4">
            {(Object.entries(stats) as [AttendanceStatus, number][]).map(([status, count], index) => {
              const config = statusConfig[status];
              const Icon = config.icon;

              return (
                <div
                  key={status}
                  className="glass-card p-4 opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50 + 150}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
                      <p className="text-2xl font-heading font-bold text-foreground mt-1">{count}</p>
                    </div>
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attendance Grid */}
          <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-heading font-semibold text-foreground mb-2">No students found</h3>
                <p className="text-muted-foreground text-sm">
                  {selectedClass ? 'No students in this class.' : 'Select a class to view students.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student, index) => {
                  const currentStatus = localAttendance[student.id] || 'absent';

                  return (
                    <div
                      key={student.id}
                      className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 opacity-0 animate-fade-up"
                      style={{ animationDelay: `${index * 30 + 300}ms` }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {student.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.admission_number}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => {
                          const config = statusConfig[status];
                          const Icon = config.icon;
                          const isSelected = currentStatus === status;

                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.id, status)}
                              disabled={!canMarkStudentAttendance}
                              className={cn(
                                'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-200',
                                isSelected
                                  ? config.color + ' border-current'
                                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
                                !canMarkStudentAttendance && 'cursor-not-allowed opacity-60'
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-[10px] font-medium">{config.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {canViewTeacherAttendance && (
          <TabsContent value="teachers" className="space-y-6">
            {/* Principal can save teacher attendance */}
            {canMarkTeacherAttendance && (
              <div className="flex justify-end">
                <Button
                  variant="gradient"
                  className="gap-2"
                  onClick={handleSaveTeacherAttendance}
                  disabled={markTeacherAttendance.isPending || teacherProfiles.length === 0}
                >
                  {markTeacherAttendance.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Teacher Attendance
                </Button>
              </div>
            )}

            <div className="glass-card p-6 animate-fade-up">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">Teacher Attendance</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDateIndian(new Date(selectedDate))}
                    </p>
                  </div>
                </div>
                {!canMarkTeacherAttendance && (
                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    View Only
                  </span>
                )}
              </div>

              {teacherProfiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No teachers found.
                </div>
              ) : (
                <div className="space-y-4">
                  {teacherProfiles.map(teacher => {
                    const currentStatus = localTeacherAttendance[teacher.id] || 'absent';

                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {teacher.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || teacher.employee_id.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{teacher.profile?.full_name || teacher.employee_id}</p>
                            <p className="text-xs text-muted-foreground">{teacher.subject}</p>
                          </div>
                        </div>

                        {canMarkTeacherAttendance ? (
                          <div className="flex gap-2">
                            {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => {
                              const config = statusConfig[status];
                              const Icon = config.icon;
                              const isSelected = currentStatus === status;

                              return (
                                <button
                                  key={status}
                                  onClick={() => handleTeacherStatusChange(teacher.id, status)}
                                  className={cn(
                                    'flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 transition-all duration-200',
                                    isSelected
                                      ? config.color + ' border-current'
                                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                  )}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span className="text-xs font-medium">{config.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium',
                            currentStatus === 'present' ? 'bg-success/10 text-success' :
                              currentStatus === 'absent' ? 'bg-destructive/10 text-destructive' :
                                currentStatus === 'late' ? 'bg-warning/10 text-warning' :
                                  'bg-muted text-muted-foreground'
                          )}>
                            {statusConfig[currentStatus]?.label || 'Not marked'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {canMarkTeacherAttendance
                    ? 'You can mark teacher attendance manually or it will be synced via biometric integration.'
                    : 'Teacher attendance is managed by the Principal. You can only view your attendance status.'
                  }
                </p>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Export Modal */}
      <AttendanceExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        lockedClassId={role === 'teacher' && isClassTeacherOfSelected ? selectedClass : undefined}
      />
    </div>
  );
}
