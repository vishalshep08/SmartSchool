import React, { useState, useMemo } from 'react';
import { useTimetable } from '@/hooks/useTimetable';
import { useClasses } from '@/hooks/useStudents';
import { useTeacherProfiles } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Clock, Plus, User, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeIndian, getDayOfWeek } from '@/lib/dateUtils';

const days = [1, 2, 3, 4, 5, 6] as const; // Monday to Saturday
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Generate time slots dynamically from the timetable data
const defaultTimeSlots = [
  { start: '08:00', end: '08:45', label: '08:00 - 08:45' },
  { start: '08:50', end: '09:35', label: '08:50 - 09:35' },
  { start: '09:40', end: '10:25', label: '09:40 - 10:25' },
  { start: '10:30', end: '10:45', label: '10:30 - 10:45 (Break)', isBreak: true },
  { start: '10:45', end: '11:30', label: '10:45 - 11:30' },
  { start: '11:35', end: '12:20', label: '11:35 - 12:20' },
  { start: '12:25', end: '13:10', label: '12:25 - 13:10' },
  { start: '13:15', end: '14:00', label: '13:15 - 14:00 (Lunch)', isBreak: true },
  { start: '14:00', end: '14:45', label: '14:00 - 14:45' },
  { start: '14:50', end: '15:30', label: '14:50 - 15:30' },
];

const subjectColors: Record<string, string> = {
  'Mathematics': 'bg-primary/10 text-primary border-primary/20',
  'English': 'bg-success/10 text-success border-success/20',
  'Science': 'bg-warning/10 text-warning border-warning/20',
  'History': 'bg-destructive/10 text-destructive border-destructive/20',
  'Computer Science': 'bg-accent/10 text-accent border-accent/20',
  'Hindi': 'bg-primary/10 text-primary border-primary/20',
  'Physics': 'bg-warning/10 text-warning border-warning/20',
  'Chemistry': 'bg-success/10 text-success border-success/20',
  'Biology': 'bg-accent/10 text-accent border-accent/20',
};

export default function Timetable() {
  const { role } = useAuth();
  const { classes, isLoading: classesLoading } = useClasses();
  const { teacherProfiles } = useTeacherProfiles();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    teacher_id: '',
    room: '',
  });

  const { timetable, isLoading, createSlot, deleteSlot } = useTimetable(selectedClass || undefined);

  const classInfo = classes.find(c => c.id === selectedClass);
  const canManageTimetable = role === 'principal';

  // Merge default time slots with custom times from timetable data
  const timeSlots = useMemo(() => {
    const customSlots = timetable.map(slot => ({
      start: slot.start_time,
      end: slot.end_time,
      label: `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`,
      isBreak: false,
    }));
    
    // Combine and deduplicate by start time
    const allSlots = [...defaultTimeSlots];
    customSlots.forEach(customSlot => {
      if (!allSlots.find(s => s.start === customSlot.start)) {
        allSlots.push(customSlot);
      }
    });
    
    // Sort by start time
    return allSlots.sort((a, b) => a.start.localeCompare(b.start));
  }, [timetable]);

  const getSlotForDayAndTime = (day: number, startTime: string) => {
    return timetable.find(slot => 
      slot.day_of_week === day && 
      slot.start_time.startsWith(startTime.slice(0, 5))
    );
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return 'TBA';
    const teacher = teacherProfiles.find(t => t.id === teacherId);
    return teacher?.profile?.full_name || 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    await createSlot.mutateAsync({
      class_id: selectedClass,
      subject: formData.subject,
      day_of_week: parseInt(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
      teacher_id: formData.teacher_id || null,
      room: formData.room || null,
    });

    setFormData({
      subject: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      teacher_id: '',
      room: '',
    });
    setIsDialogOpen(false);
  };

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Timetable</h1>
          <p className="text-muted-foreground mt-1">View and manage class schedules</p>
        </div>
        {canManageTimetable && selectedClass && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Period</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={formData.day_of_week} onValueChange={(v) => setFormData({ ...formData, day_of_week: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day, idx) => (
                          <SelectItem key={day} value={String(day)}>{dayLabels[idx]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Input
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      placeholder="e.g., Room 101"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherProfiles.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.profile?.full_name || 'Unknown'} - {teacher.subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createSlot.isPending}>
                  {createSlot.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Period
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'class' | 'teacher')}>
            <TabsList>
              <TabsTrigger value="class">Class View</TabsTrigger>
              <TabsTrigger value="teacher">Teacher View</TabsTrigger>
            </TabsList>
          </Tabs>

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
        </div>
      </div>

      {!selectedClass ? (
        <div className="glass-card p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-foreground">Select a Class</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose a class to view its timetable</p>
        </div>
      ) : (
        <>
          {/* Class Info */}
          <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">
                  {classInfo?.name} {classInfo?.section && `- ${classInfo?.section}`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Grade {classInfo?.grade} • Academic Year {classInfo?.academic_year}
                </p>
              </div>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="glass-card overflow-hidden animate-fade-up" style={{ animationDelay: '200ms' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground w-32">
                        Time
                      </th>
                      {dayLabels.map((day) => (
                        <th 
                          key={day} 
                          className="p-4 text-center text-sm font-medium text-muted-foreground"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((timeSlot) => {
                      return (
                        <tr 
                          key={timeSlot.label} 
                          className={cn(
                            'border-b border-border last:border-0',
                            timeSlot.isBreak && 'bg-muted/30'
                          )}
                        >
                          <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                            {timeSlot.label}
                          </td>
                          {days.map((day) => {
                            const slot = getSlotForDayAndTime(day, timeSlot.start);
                            
                            if (timeSlot.isBreak) {
                              return (
                                <td key={day} className="p-3 text-center">
                                  <span className="text-xs text-muted-foreground italic">
                                    {timeSlot.label.includes('Lunch') ? '🍽️ Lunch' : '☕ Break'}
                                  </span>
                                </td>
                              );
                            }
                            
                            return (
                              <td key={day} className="p-2">
                                {slot ? (
                                  <div 
                                    className={cn(
                                      'p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 cursor-pointer relative group',
                                      subjectColors[slot.subject] || 'bg-muted/50 text-muted-foreground border-border'
                                    )}
                                  >
                                    <p className="font-medium text-sm">{slot.subject}</p>
                                    <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
                                      <User className="w-3 h-3" />
                                      <span>{getTeacherName(slot.teacher_id).split(' ').pop()}</span>
                                    </div>
                                    {slot.room && (
                                      <span className="text-xs opacity-60">{slot.room}</span>
                                    )}
                                    {canManageTimetable && (
                                      <button
                                        onClick={() => deleteSlot.mutate(slot.id)}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-destructive/20 hover:bg-destructive/30"
                                      >
                                        <Trash2 className="w-3 h-3 text-destructive" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-lg border-2 border-dashed border-border text-center">
                                    <span className="text-xs text-muted-foreground">-</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="glass-card p-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <h4 className="text-sm font-medium text-foreground mb-3">Subject Legend</h4>
            <div className="flex flex-wrap gap-3">
              {Object.entries(subjectColors).map(([subject, color]) => (
                <div 
                  key={subject}
                  className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', color)}
                >
                  {subject}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
