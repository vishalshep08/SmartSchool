import { useAuth } from '@/contexts/AuthContext';
import { useDisplayName } from '@/hooks/useDisplayName';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLeaves } from '@/hooks/useLeaves';
import { useHomework } from '@/hooks/useHomework';
import { useIssues } from '@/hooks/useIssues';
import { useTeachers } from '@/hooks/useTeachers';
import { useTimetable } from '@/hooks/useTimetable';
import { useClasses } from '@/hooks/useStudents';
import { useTeacherClassAssignments } from '@/hooks/useTeacherPermissions';
import { useStudentAttendance } from '@/hooks/useAttendance';
import { supabase } from '@/integrations/supabase/client';
import { formatDateIndian } from '@/lib/dateUtils';
import { useState, useEffect } from 'react';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { 
  CalendarCheck, 
  BookOpen, 
  CalendarOff,
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  User,
  Users,
  School
} from 'lucide-react';

export default function DashboardTeacher() {
  const { user } = useAuth();
  const { displayName } = useDisplayName();
  const navigate = useNavigate();
  const { teachers } = useTeachers();
  const { leaves } = useLeaves();
  const { homework } = useHomework();
  const { issues } = useIssues();
  const { classes } = useClasses();

  // Get current teacher
  const currentTeacher = teachers.find(t => t.user_id === user?.id);

  // Get teacher's class assignments
  const { assignments } = useTeacherClassAssignments(currentTeacher?.id);
  const assignedClassIds = assignments.map(a => a.class_id);

  // Check if this teacher is a class teacher
  const classTeacherAssignment = assignments.find(a => a.is_class_teacher === true);
  const isClassTeacher = !!classTeacherAssignment;
  const classTeacherClassId = classTeacherAssignment?.class_id;
  const classTeacherClass = classes.find(c => c.id === classTeacherClassId);

  // Get today's attendance for class teacher's class
  const today = new Date().toISOString().split('T')[0];
  const { attendance: todayAttendance } = useStudentAttendance(
    classTeacherClassId || '', 
    today
  );
  const attendanceMarkedToday = todayAttendance.length > 0;

  // Get pending student leave requests for class teacher
  const [pendingStudentLeaves, setPendingStudentLeaves] = useState(0);
  useEffect(() => {
    let cancelled = false;

    const fetchPending = async () => {
      if (!isClassTeacher || !classTeacherClassId) return;
      try {
        const { count, error } = await supabase
          .from('student_leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classTeacherClassId)
          .eq('status', 'pending');
          
        if (cancelled) return;
        if (error) throw error;
        setPendingStudentLeaves(count || 0);
      } catch (err) {
        if (!cancelled) {
          console.error('Fetch error:', err);
          setPendingStudentLeaves(0);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
      }
    }, 10000);

    fetchPending();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isClassTeacher, classTeacherClassId]);

  // Get first assigned class for timetable, or fall back to first class
  const primaryClassId = assignedClassIds[0] || classes[0]?.id;
  const { timetable } = useTimetable(primaryClassId);

  // Get today's day of week
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay();
  
  // Filter today's schedule for this teacher
  const todaysSchedule = timetable
    .filter(slot => {
      const isToday = slot.day_of_week === (dayOfWeek === 0 ? 7 : dayOfWeek);
      const isTeachersClass = !slot.teacher_id || slot.teacher_id === currentTeacher?.id;
      return isToday && isTeachersClass;
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Teacher's leaves (RLS filters to own)
  const myLeaves = currentTeacher 
    ? leaves.filter(l => l.teacher_id === currentTeacher.id)
    : [];
  const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;
  const approvedLeaves = myLeaves.filter(l => l.status === 'approved').length;

  // Teacher's issues (RLS filters to own)
  const myIssues = issues.filter(i => i.raised_by === user?.id);
  const openIssues = myIssues.filter(i => i.status === 'open').length;

  // Teacher's homework
  const myHomework = currentTeacher
    ? homework.filter(h => h.assigned_by === currentTeacher.id)
    : [];
  const recentHomework = myHomework.slice(0, 3);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    ...(isClassTeacher ? [
      { 
        label: 'Take Attendance', 
        icon: CalendarCheck, 
        to: '/attendance',
        color: 'bg-green-100 text-green-700 hover:bg-green-200'
      },
      { 
        label: 'Leave Requests', 
        icon: CalendarOff, 
        to: '/class-leaves',
        color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
      }
    ] : []),
    { 
      label: 'Post Homework', 
      icon: BookOpen, 
      to: '/homework',
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    { 
      label: 'Apply Leave', 
      icon: CalendarOff, 
      to: '/leaves',
      color: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
    },
    { 
      label: 'Create Notice', 
      icon: Bell, 
      to: '/notices',
      color: 'bg-pink-100 text-pink-700 hover:bg-pink-200'
    },
    { 
      label: 'Raise Issue', 
      icon: AlertCircle, 
      to: '/issues',
      color: 'bg-red-100 text-red-700 hover:bg-red-200'
    },
    { 
      label: 'My Profile', 
      icon: User, 
      to: '/profile',
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {greeting()}, {displayName?.split(' ')[0] || 'Teacher'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {formatDateIndian(todayDate)} • Welcome to your dashboard
        </p>
      </div>

      {/* Announcements */}
      <AnnouncementBanner />

      {/* My Class Card — only for Class Teachers */}
      {isClassTeacher && classTeacherClass && (
        <Card className="animate-fade-up border-primary/20 bg-primary/5" style={{ animationDelay: '30ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              My Class — {classTeacherClass.name} {classTeacherClass.section && `(${classTeacherClass.section})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Class Teacher</span>
                </div>
                <div className="flex items-center gap-2">
                  {attendanceMarkedToday ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">Attendance marked for today</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700">Attendance not marked yet</span>
                    </>
                  )}
                </div>
              </div>
              <Button 
                variant={attendanceMarkedToday ? "outline" : "default"}
                size="sm" 
                onClick={() => navigate('/attendance')}
              >
                <CalendarCheck className="h-4 w-4 mr-2" />
                {attendanceMarkedToday ? 'Edit Attendance' : 'Mark Attendance'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not a Class Teacher info */}
      {!isClassTeacher && currentTeacher && (
        <Card className="animate-fade-up border-muted bg-muted/30" style={{ animationDelay: '30ms' }}>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              You are not assigned as a Class Teacher. Contact admin for class assignment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                className={`h-auto py-4 flex flex-col gap-2 ${action.color}`}
                onClick={() => navigate(action.to)}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/timetable')}>
                View Full <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todaysSchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysSchedule.map((slot, index) => (
                  <div 
                    key={slot.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="text-center min-w-[80px]">
                      <p className="text-sm font-medium">{slot.start_time.slice(0, 5)}</p>
                      <p className="text-xs text-muted-foreground">{slot.end_time.slice(0, 5)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{slot.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {slot.classes?.name} {slot.classes?.section && `- ${slot.classes.section}`}
                        {slot.room && ` • Room ${slot.room}`}
                      </p>
                    </div>
                    <Badge variant="secondary">{index + 1}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Summary */}
        <div className="space-y-4">
          {/* Student Leaves Summary (Class Teachers Only) */}
          {isClassTeacher && (
            <Card className="animate-fade-up border-indigo-100 bg-indigo-50/30" style={{ animationDelay: '120ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-800">
                  <CalendarOff className="h-4 w-4" />
                  Student Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium text-indigo-700">{pendingStudentLeaves} pending</span>
                  </div>
                  <Button variant="default" size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs" onClick={() => navigate('/class-leaves')}>
                    Review <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leave Status */}
          <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarOff className="h-4 w-4" />
                Leave Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">{pendingLeaves} pending</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{approvedLeaves} approved</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/leaves')}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Issues Status */}
          <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                My Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">{openIssues} open issues</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/issues')}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Homework */}
          <Card className="animate-fade-up" style={{ animationDelay: '250ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Recent Homework
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentHomework.length === 0 ? (
                <p className="text-sm text-muted-foreground">No homework posted yet</p>
              ) : (
                <div className="space-y-2">
                  {recentHomework.map(hw => (
                    <div key={hw.id} className="text-sm">
                      <p className="font-medium truncate">{hw.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatDateIndian(new Date(hw.due_date))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => navigate('/homework')}
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts Section */}
      <Card className="animate-fade-up border-yellow-200 bg-yellow-50/50" style={{ animationDelay: '300ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            Pending Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-700">
          <ul className="space-y-1">
            {isClassTeacher && !attendanceMarkedToday && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Attendance not marked for today — mark now!
              </li>
            )}
            {pendingLeaves > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                {pendingLeaves} personal leave request(s) awaiting approval
              </li>
            )}
            {isClassTeacher && pendingStudentLeaves > 0 && (
              <li className="flex items-center gap-2 text-indigo-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {pendingStudentLeaves} student leave request(s) to review
              </li>
            )}
            {openIssues > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                {openIssues} open issue(s) to follow up
              </li>
            )}
            {todaysSchedule.length > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                {todaysSchedule.length} class(es) scheduled for today
              </li>
            )}
            {(isClassTeacher ? attendanceMarkedToday : true) && pendingLeaves === 0 && openIssues === 0 && todaysSchedule.length === 0 && (
              <li className="text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                All caught up! No pending actions.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
