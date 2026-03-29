import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParentData } from '@/hooks/useParentData';
import { useParentDashboardData } from '@/hooks/useParentDashboardData';
import { useParentAnalytics } from '@/hooks/useParentAnalytics';
import { StudentAvatar } from '@/components/common/StudentAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarCheck,
  BookOpen,
  MessageSquare,
  GraduationCap,
  Hash,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatRelativeDate } from '@/lib/dateUtils';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const attendanceColors: Record<string, { bg: string; text: string; label: string }> = {
  present: { bg: 'bg-success/10', text: 'text-success', label: 'Present' },
  absent: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Absent' },
  half_day: { bg: 'bg-warning/10', text: 'text-warning', label: 'Half Day' },
  late: { bg: 'bg-primary/10', text: 'text-primary', label: 'Late' },
};

const activityIcons: Record<string, typeof CalendarCheck> = {
  attendance: CalendarCheck,
  homework: BookOpen,
  remark: MessageSquare,
  leave: AlertCircle,
};

export default function ParentDashboard() {
  const { profile } = useAuth();
  const { linkedStudents, isLoading } = useParentData();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const selectedChild = linkedStudents[selectedChildIndex] || null;

  const { todayAttendance, unreadHomeworkCount, pendingLeaveCount, unreadRemarksCount, recentActivity, isLoading: loadingData } =
    useParentDashboardData(selectedChild?.id);

  const { weekAttendance } = useParentAnalytics(selectedChild?.id, selectedChild?.class_id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const todayFormatted = format(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-6">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {getGreeting()}, {profile?.fullName || 'Parent'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">{todayFormatted}</p>
        </CardContent>
      </Card>

      {/* Announcements */}
      <AnnouncementBanner />

      {/* Child Switcher */}
      {linkedStudents.length > 1 && (
        <Tabs
          value={selectedChildIndex.toString()}
          onValueChange={(v) => setSelectedChildIndex(parseInt(v))}
        >
          <TabsList>
            {linkedStudents.map((child: any, idx: number) => (
              <TabsTrigger key={child.id} value={idx.toString()}>
                {child.full_name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {selectedChild ? (
        <>
          {/* Child Info Card */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <StudentAvatar
                  photoUrl={selectedChild.profile_photo_url}
                  name={selectedChild.full_name}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground">{selectedChild.full_name}</h2>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      {selectedChild.classes
                        ? `${selectedChild.classes.name}${selectedChild.classes.section ? ` - ${selectedChild.classes.section}` : ''}`
                        : 'Not assigned'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-4 h-4" />
                      Adm: {selectedChild.admission_number}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {selectedChild.gender ? selectedChild.gender.charAt(0).toUpperCase() + selectedChild.gender.slice(1) : '—'}
                    </span>
                  </div>
                </div>
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  selectedChild.is_active
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {selectedChild.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Attendance */}
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    todayAttendance
                      ? attendanceColors[todayAttendance.status]?.bg || 'bg-muted'
                      : 'bg-muted'
                  )}>
                    <CalendarCheck className={cn(
                      'w-5 h-5',
                      todayAttendance
                        ? attendanceColors[todayAttendance.status]?.text || 'text-muted-foreground'
                        : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className={cn(
                      'text-lg font-bold',
                      todayAttendance
                        ? attendanceColors[todayAttendance.status]?.text || 'text-foreground'
                        : 'text-muted-foreground'
                    )}>
                      {todayAttendance
                        ? attendanceColors[todayAttendance.status]?.label || todayAttendance.status
                        : 'Not Marked Yet'}
                    </p>
                    <p className="text-xs text-muted-foreground">Today's Attendance</p>
                  </div>
                </div>
                {/* 7-day sparkline */}
                {weekAttendance.length > 0 && (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={40}>
                      <LineChart data={weekAttendance.map(a => ({
                        date: a.date,
                        value: a.status === 'present' || a.status === 'late' ? 1 : 0,
                      }))}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#4F46E5"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#4F46E5' }}
                        />
                        <RechartsTooltip
                          formatter={(val: number) => [val === 1 ? 'Present' : 'Absent', '']}
                          labelFormatter={(label: string) => label}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground text-center">Last 7 days</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Leave Requests */}
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    pendingLeaveCount > 0 ? 'bg-warning/10' : 'bg-muted'
                  )}>
                    <AlertCircle className={cn(
                      'w-5 h-5',
                      pendingLeaveCount > 0 ? 'text-warning' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className={cn(
                      'text-lg font-bold',
                      pendingLeaveCount > 0 ? 'text-warning' : 'text-muted-foreground'
                    )}>
                      {pendingLeaveCount > 0 ? pendingLeaveCount : 'None Pending'}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending Leave Requests</p>
                  </div>
                </div>
                {/* Trend indicator */}
                <div className="mt-3 flex items-center gap-1.5">
                  <div className={cn(
                    'h-1.5 flex-1 rounded-full',
                    pendingLeaveCount > 0 ? 'bg-warning/20' : 'bg-muted'
                  )}>
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        pendingLeaveCount > 0 ? 'bg-warning' : 'bg-muted-foreground/20'
                      )}
                      style={{ width: `${Math.min(pendingLeaveCount * 33, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unread Homework */}
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    unreadHomeworkCount > 0 ? 'bg-primary/10' : 'bg-success/10'
                  )}>
                    <BookOpen className={cn(
                      'w-5 h-5',
                      unreadHomeworkCount > 0 ? 'text-primary' : 'text-success'
                    )} />
                  </div>
                  <div>
                    <p className={cn(
                      'text-lg font-bold',
                      unreadHomeworkCount > 0 ? 'text-primary' : 'text-success'
                    )}>
                      {unreadHomeworkCount > 0 ? unreadHomeworkCount : 'All Caught Up'}
                    </p>
                    <p className="text-xs text-muted-foreground">Unread Homework</p>
                  </div>
                </div>
                {/* Mini bar indicator */}
                <div className="mt-3 flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${unreadHomeworkCount > 0 ? Math.min(unreadHomeworkCount * 20, 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{unreadHomeworkCount} new</span>
                </div>
              </CardContent>
            </Card>

            {/* New Remarks */}
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    unreadRemarksCount > 0 ? 'bg-warning/10' : 'bg-muted'
                  )}>
                    <MessageSquare className={cn(
                      'w-5 h-5',
                      unreadRemarksCount > 0 ? 'text-warning' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className={cn(
                      'text-lg font-bold',
                      unreadRemarksCount > 0 ? 'text-warning' : 'text-muted-foreground'
                    )}>
                      {unreadRemarksCount > 0 ? unreadRemarksCount : 'No New Remarks'}
                    </p>
                    <p className="text-xs text-muted-foreground">New Remarks</p>
                  </div>
                </div>
                {/* Mini indicator */}
                <div className="mt-3 flex items-center gap-1.5">
                  <div className={cn(
                    'h-1.5 flex-1 rounded-full',
                    unreadRemarksCount > 0 ? 'bg-warning/20' : 'bg-muted'
                  )}>
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        unreadRemarksCount > 0 ? 'bg-warning' : 'bg-muted-foreground/20'
                      )}
                      style={{ width: `${Math.min(unreadRemarksCount * 25, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No recent activity for {selectedChild.full_name}.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const Icon = activityIcons[activity.icon] || Clock;
                    return (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{activity.text}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeDate(activity.time)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No children linked to your account yet. Please contact the school administration.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
