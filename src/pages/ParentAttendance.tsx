import { useState, useMemo } from 'react';
import { useParentData } from '@/hooks/useParentData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, CalendarCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isAfter, isSunday } from 'date-fns';

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  present: { color: 'bg-success text-success-foreground', dot: 'bg-success', label: 'Present' },
  absent: { color: 'bg-destructive text-destructive-foreground', dot: 'bg-destructive', label: 'Absent' },
  half_day: { color: 'bg-warning text-warning-foreground', dot: 'bg-warning', label: 'Half Day' },
  late: { color: 'bg-primary text-primary-foreground', dot: 'bg-primary', label: 'Late' },
};

export default function ParentAttendance() {
  const { linkedStudents, isLoading: loadingStudents } = useParentData();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');

  const selectedChild = linkedStudents[selectedChildIndex] || null;
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthLabel = format(currentDate, 'MMMM yyyy');

  const { data: attendanceRecords = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['parent-attendance-month', selectedChild?.id, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      if (!selectedChild?.id) return [];
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('student_id', selectedChild.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedChild?.id,
  });

  const attendanceMap = useMemo(() => {
    const map = new Map<string, typeof attendanceRecords[0]>();
    attendanceRecords.forEach(r => map.set(r.date, r));
    return map;
  }, [attendanceRecords]);

  // Summary stats
  const summary = useMemo(() => {
    const totalDays = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const halfDay = attendanceRecords.filter(r => r.status === 'half_day').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const pct = totalDays > 0 ? ((present + late + halfDay * 0.5) / totalDays) * 100 : 0;
    return { totalDays, present, absent, halfDay, late, pct };
  }, [attendanceRecords]);

  // Calendar grid
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0=Sun

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Filtered history
  const filteredRecords = statusFilter === 'all'
    ? attendanceRecords
    : attendanceRecords.filter(r => r.status === statusFilter);

  if (loadingStudents) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Attendance {selectedChild ? `— ${selectedChild.full_name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">View your child's attendance records</p>
      </div>

      {linkedStudents.length > 1 && (
        <Tabs value={selectedChildIndex.toString()} onValueChange={v => setSelectedChildIndex(parseInt(v))}>
          <TabsList>
            {linkedStudents.map((child: any, idx: number) => (
              <TabsTrigger key={child.id} value={idx.toString()}>{child.full_name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {!selectedChild ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No children linked.</p></CardContent></Card>
      ) : (
        <>
          {/* Month navigator */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="font-heading text-lg font-semibold">{monthLabel}</h2>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <Tabs defaultValue="calendar">
            <TabsList>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="history">History View</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-6">
              {/* Calendar Grid */}
              <Card>
                <CardContent className="pt-6">
                  {loadingAttendance ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for offset */}
                        {Array.from({ length: startDayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {daysInMonth.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const record = attendanceMap.get(dateStr);
                          const isToday = isSameDay(day, new Date());
                          const isFuture = isAfter(day, new Date());
                          const sunday = isSunday(day);
                          const config = record ? statusConfig[record.status] : null;

                          return (
                            <Popover key={dateStr}>
                              <PopoverTrigger asChild>
                                <button
                                  className={cn(
                                    'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors relative',
                                    isToday && 'ring-2 ring-primary',
                                    isFuture && 'opacity-40',
                                    sunday && !record && 'bg-muted/60 text-muted-foreground',
                                    record && 'cursor-pointer hover:opacity-80',
                                    !record && !sunday && !isFuture && 'hover:bg-muted/30'
                                  )}
                                  disabled={isFuture}
                                >
                                  <span className="font-medium">{format(day, 'd')}</span>
                                  {config && (
                                    <span className={cn('w-2 h-2 rounded-full mt-0.5', config.dot)} />
                                  )}
                                  {sunday && !record && (
                                    <span className="w-2 h-2 rounded-full mt-0.5 bg-muted-foreground/30" />
                                  )}
                                </button>
                              </PopoverTrigger>
                              {record && (
                                <PopoverContent className="w-56 p-3">
                                  <p className="font-medium text-sm">{format(day, 'EEEE, d MMM yyyy')}</p>
                                  <Badge className={cn('mt-2', config?.color)}>
                                    {config?.label}
                                  </Badge>
                                  {record.remarks && (
                                    <p className="text-xs text-muted-foreground mt-2">Note: {record.remarks}</p>
                                  )}
                                </PopoverContent>
                              )}
                            </Popover>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                        {Object.entries(statusConfig).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-1.5 text-xs">
                            <span className={cn('w-3 h-3 rounded-full', val.dot)} />
                            {val.label}
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                          Sunday/Holiday
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    {/* Circular progress */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.5" fill="none"
                          stroke={summary.pct >= 90 ? 'hsl(var(--success))' : summary.pct >= 75 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                          strokeWidth="3"
                          strokeDasharray={`${(summary.pct / 100) * 97.5} 97.5`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cn(
                          'text-lg font-bold',
                          summary.pct >= 90 ? 'text-success' : summary.pct >= 75 ? 'text-warning' : 'text-destructive'
                        )}>
                          {summary.totalDays > 0 ? `${Math.round(summary.pct)}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div><span className="text-muted-foreground">School Days:</span> <span className="font-medium">{summary.totalDays}</span></div>
                      <div><span className="text-muted-foreground">Present:</span> <span className="font-medium text-success">{summary.present}</span></div>
                      <div><span className="text-muted-foreground">Absent:</span> <span className="font-medium text-destructive">{summary.absent}</span></div>
                      <div><span className="text-muted-foreground">Half Days:</span> <span className="font-medium text-warning">{summary.halfDay}</span></div>
                    </div>
                  </div>
                  {summary.pct > 0 && summary.pct < 75 && (
                    <div className="flex items-center gap-2 mt-4 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      Attendance is below the required minimum of 75%
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingAttendance ? (
                <Skeleton className="h-48" />
              ) : filteredRecords.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CalendarCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {attendanceRecords.length === 0
                        ? `No attendance records found for ${monthLabel}. Attendance may not have been marked yet.`
                        : 'No records match the selected filter.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      {[...filteredRecords].reverse().map(r => {
                        const day = new Date(r.date + 'T00:00:00');
                        const cfg = statusConfig[r.status];
                        return (
                          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="text-sm">
                                <p className="font-medium">{format(day, 'd MMM yyyy')}</p>
                                <p className="text-xs text-muted-foreground">{format(day, 'EEEE')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {r.remarks && <span className="text-xs text-muted-foreground max-w-[200px] truncate">{r.remarks}</span>}
                              <Badge className={cn(cfg?.color)}>{cfg?.label || r.status}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
