import { useState } from 'react';
import { useAttendanceReports, generateAttendanceCSV, downloadCSV, ReportPeriod } from '@/hooks/useAttendanceReports';
import { useClasses } from '@/hooks/useStudents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Calendar,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { formatDateIndian } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface AttendanceReportGeneratorProps {
  allowedClassIds?: string[];
}

export function AttendanceReportGenerator({ allowedClassIds }: AttendanceReportGeneratorProps) {
  const { classes } = useClasses();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const filteredClasses = allowedClassIds 
    ? classes.filter(c => allowedClassIds.includes(c.id))
    : classes;

  const { 
    dailyBreakdown, 
    studentSummary, 
    overallStats, 
    isLoading,
    dateRange 
  } = useAttendanceReports(selectedClass, period, selectedDate);

  const handleExportCSV = () => {
    const csv = generateAttendanceCSV(studentSummary, dateRange);
    const filename = `attendance_report_${selectedClass}_${dateRange.start}_${dateRange.end}.csv`;
    downloadCSV(csv, filename);
  };

  const selectedClassInfo = classes.find(c => c.id === selectedClass);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Attendance Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.section && `- ${cls.section}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="bg-transparent text-sm font-medium border-none outline-none"
              />
            </div>

            <Button 
              variant="outline" 
              className="gap-2 ml-auto"
              onClick={handleExportCSV}
              disabled={!selectedClass || studentSummary.length === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedClass ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground">Select a Class</h3>
            <p className="text-sm text-muted-foreground">Choose a class to generate attendance report</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg. Attendance</p>
                    <p className="text-xl font-bold">{overallStats.averageAttendance}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="text-xl font-bold">{overallStats.present}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Absent</p>
                    <p className="text-xl font-bold">{overallStats.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Late</p>
                    <p className="text-xl font-bold">{overallStats.late}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                    <p className="text-xl font-bold">{overallStats.totalRecords}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedClassInfo?.name} {selectedClassInfo?.section && `- ${selectedClassInfo?.section}`} 
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({dateRange.start} to {dateRange.end})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="student" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="student">Student-wise</TabsTrigger>
                  <TabsTrigger value="daily">Day-wise</TabsTrigger>
                </TabsList>

                <TabsContent value="student">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Half Day</TableHead>
                        <TableHead className="text-center">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No attendance data found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        studentSummary.map(student => (
                          <TableRow key={student.student_id}>
                            <TableCell className="font-mono text-sm">{student.admission_number}</TableCell>
                            <TableCell className="font-medium">{student.student_name}</TableCell>
                            <TableCell className="text-center text-success">{student.present}</TableCell>
                            <TableCell className="text-center text-destructive">{student.absent}</TableCell>
                            <TableCell className="text-center text-warning">{student.late}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{student.half_day}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn(
                                student.attendance_percentage >= 90 ? 'bg-success/10 text-success' :
                                student.attendance_percentage >= 75 ? 'bg-warning/10 text-warning' :
                                'bg-destructive/10 text-destructive'
                              )}>
                                {student.attendance_percentage}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="daily">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Half Day</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyBreakdown.map(day => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">
                            {formatDateIndian(new Date(day.date))}
                          </TableCell>
                          <TableCell className="text-center text-success">{day.present}</TableCell>
                          <TableCell className="text-center text-destructive">{day.absent}</TableCell>
                          <TableCell className="text-center text-warning">{day.late}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{day.half_day}</TableCell>
                          <TableCell className="text-center">{day.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn(
                              day.percentage >= 90 ? 'bg-success/10 text-success' :
                              day.percentage >= 75 ? 'bg-warning/10 text-warning' :
                              'bg-destructive/10 text-destructive'
                            )}>
                              {day.percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
