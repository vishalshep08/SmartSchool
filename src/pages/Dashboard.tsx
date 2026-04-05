import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDisplayName } from '@/hooks/useDisplayName';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useHomeworkOverview } from '@/hooks/useHomeworkOverview';
import { useClasses } from '@/hooks/useStudents';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GraduationCap, Users, BookOpen, MessageSquareWarning,
  UserCheck, UserX, Calendar, Layers, Filter,
} from 'lucide-react';

export default function Dashboard() {
  const { role } = useAuth();
  const { displayName } = useDisplayName();
  const { classes } = useClasses();
  const navigate = useNavigate();

  const [pendingSigs, setPendingSigs] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      if (role !== 'principal') return;
      try {
        const { count, error } = await (supabase as any)
          .from('document_requests')
          .select('*', { count: 'exact', head: true })
          .eq('current_stage', 'principal_review');
        
        if (cancelled) return;
        if (error) throw error;
        if (count !== null) setPendingSigs(count);
      } catch (err) {
        if (!cancelled) {
          console.error('Fetch error:', err);
          setPendingSigs(0);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
      }
    }, 10000);

    fetchDocs();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [role]);

  // Dashboard filters
  const [classFilter, setClassFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  const filters = {
    classId: classFilter !== 'all' ? classFilter : undefined,
    date: dateFilter,
  };

  const { stats, isLoading } = useDashboardStats(filters);
  const { overview, classBreakdown, isLoading: hwLoading } = useHomeworkOverview();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {greeting()}, {displayName?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening at your school today</p>
        </div>
        
        {role === 'principal' && (
          <Card 
            className={`w-full md:w-64 cursor-pointer transition-transform hover:scale-105 ${pendingSigs > 0 ? 'bg-orange-500 text-white border-orange-600' : 'bg-muted/50 text-muted-foreground'}`}
            onClick={() => navigate('/document-approvals')}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Pending Signatures</CardTitle>
              <FileSignature className="h-4 w-4 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSigs}</div>
              <p className="text-xs opacity-80 mt-1">Document requests</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Announcements */}
      <AnnouncementBanner />

      {/* Filter Bar */}
      <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters:</span>
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.section && `- ${cls.section}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={isLoading ? 0 : stats.totalStudents} icon={GraduationCap} trend={{ value: 5.2, isPositive: true }} color="primary" delay={0} />
        <StatCard title="Total Teachers" value={isLoading ? 0 : stats.totalTeachers} icon={Users} trend={{ value: 2.1, isPositive: true }} color="success" delay={100} />
        <StatCard title="Present Today" value={isLoading ? 0 : stats.presentToday} icon={UserCheck} color="success" delay={200} />
        <StatCard title="Absent Today" value={isLoading ? 0 : stats.absentToday} icon={UserX} color="destructive" delay={300} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Classes" value={isLoading ? 0 : stats.totalClasses} icon={Layers} color="primary" delay={400} />
        <StatCard title="Pending Homework" value={isLoading ? 0 : stats.pendingHomework} icon={BookOpen} color="warning" delay={500} />
        <StatCard title="Open Issues" value={isLoading ? 0 : stats.openIssues} icon={MessageSquareWarning} color="destructive" delay={600} />
        <StatCard title="Upcoming Events" value={isLoading ? 0 : stats.upcomingEvents} icon={Calendar} color="primary" delay={700} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AttendanceChart present={stats.presentToday} absent={stats.absentToday} late={stats.lateToday} />
        <QuickActions />
        <UpcomingEvents />
      </div>

      {/* Recent Activity */}
      <RecentActivity />

      {/* Homework Overview */}
      <div className="glass-card p-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <h3 className="font-display font-semibold text-foreground mb-4">Homework Overview</h3>
        {hwLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : overview.total_assigned === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No homework assigned yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-foreground">{overview.total_assigned}</p>
                <p className="text-xs text-muted-foreground">Total Assigned</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-success">{overview.total_submissions}</p>
                <p className="text-xs text-muted-foreground">Submissions</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-warning">{overview.pending_submissions}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">{overview.submission_rate}%</p>
                <p className="text-xs text-muted-foreground">Submission Rate</p>
                <Progress value={overview.submission_rate} className="mt-2 h-1.5" />
              </div>
            </div>
            <div className="space-y-4">
              {classBreakdown.map((item, index) => (
                <div key={item.class_name} className="flex items-center gap-4 opacity-0 animate-fade-up" style={{ animationDelay: `${index * 100 + 500}ms` }}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{item.class_name}</span>
                      <span className="text-xs text-muted-foreground">{item.total_submitted}/{item.total_assigned} • {item.submission_rate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000" style={{ width: `${item.submission_rate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Document Approvals for Principal removed, now in dedicated page */}
    </div>
  );
}
