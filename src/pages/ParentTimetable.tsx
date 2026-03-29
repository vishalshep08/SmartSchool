import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTimetable } from '@/hooks/useTimetable';
import { useParentData } from '@/hooks/useParentData';
import { useTeacherProfiles } from '@/hooks/useTeachers';
import { cn } from '@/lib/utils';
import { Clock, User } from 'lucide-react';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const days = [1, 2, 3, 4, 5, 6];

const defaultTimeSlots = [
    { start: '08:00', end: '08:45', label: '08:00 - 08:45' },
    { start: '08:50', end: '09:35', label: '08:50 - 09:35' },
    { start: '09:40', end: '10:25', label: '09:40 - 10:25' },
    { start: '10:30', end: '10:45', label: '10:30 - 10:45', isBreak: true },
    { start: '10:45', end: '11:30', label: '10:45 - 11:30' },
    { start: '11:35', end: '12:20', label: '11:35 - 12:20' },
    { start: '12:25', end: '13:10', label: '12:25 - 13:10' },
    { start: '13:15', end: '14:00', label: '13:15 - 14:00', isBreak: true },
    { start: '14:00', end: '14:45', label: '14:00 - 14:45' },
    { start: '14:50', end: '15:30', label: '14:50 - 15:30' },
];

const subjectColors: Record<string, string> = {
    'Mathematics': 'bg-primary/10 text-primary border-primary/20',
    'English': 'bg-success/10 text-success border-success/20',
    'Science': 'bg-warning/10 text-warning border-warning/20',
    'History': 'bg-destructive/10 text-destructive border-destructive/20',
    'Hindi': 'bg-primary/10 text-primary border-primary/20',
    'Physics': 'bg-warning/10 text-warning border-warning/20',
    'Chemistry': 'bg-success/10 text-success border-success/20',
    'Biology': 'bg-accent/10 text-accent border-accent/20',
};

export default function ParentTimetable() {
    const { linkedStudents, isLoading: parentLoading } = useParentData();
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const selectedChild = linkedStudents[selectedChildIndex] || null;

    const classId = selectedChild?.class_id || undefined;
    const { timetable, isLoading } = useTimetable(classId);
    const { teacherProfiles } = useTeacherProfiles();

    const getTeacherName = (teacherId: string | null) => {
        if (!teacherId) return 'TBA';
        const teacher = teacherProfiles.find((t: any) => t.id === teacherId);
        return teacher?.profile?.full_name || 'Unknown';
    };

    const getSlot = (day: number, startTime: string) => {
        return timetable.find(slot =>
            slot.day_of_week === day &&
            slot.start_time.startsWith(startTime.slice(0, 5))
        );
    };

    const todayIdx = new Date().getDay();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Class Timetable"
                description={selectedChild ? `Timetable for ${selectedChild.full_name}'s class` : 'View your child\'s class timetable'}
                breadcrumbs={[{ label: 'Home', href: '/parent/dashboard' }, { label: 'Timetable' }]}
            />

            {linkedStudents.length > 1 && (
                <Tabs value={selectedChildIndex.toString()} onValueChange={v => setSelectedChildIndex(parseInt(v))}>
                    <TabsList>
                        {linkedStudents.map((child: any, idx: number) => (
                            <TabsTrigger key={child.id} value={idx.toString()}>{child.full_name}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            )}

            {parentLoading ? (
                <Skeleton className="h-96 w-full rounded-xl" />
            ) : !classId ? (
                <EmptyState icon={Clock} title="No Class Assigned" description="Your child is not assigned to any class yet" />
            ) : isLoading ? (
                <Skeleton className="h-96 w-full rounded-xl" />
            ) : timetable.length === 0 ? (
                <EmptyState icon={Clock} title="No Timetable Available" description="The timetable for this class hasn't been set up yet" />
            ) : (
                <div className="glass-card overflow-hidden animate-fade-up">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="p-4 text-left text-sm font-medium text-muted-foreground w-32">Time</th>
                                    {dayLabels.map((day, idx) => (
                                        <th key={day} className={cn('p-4 text-center text-sm font-medium', todayIdx === idx + 1 ? 'text-primary bg-primary/5' : 'text-muted-foreground')}>
                                            {day}
                                            {todayIdx === idx + 1 && <span className="block text-xs text-primary">Today</span>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {defaultTimeSlots.map(timeSlot => (
                                    <tr key={timeSlot.label} className={cn('border-b border-border last:border-0', timeSlot.isBreak && 'bg-muted/30')}>
                                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{timeSlot.label}</td>
                                        {days.map(day => {
                                            const slot = getSlot(day, timeSlot.start);
                                            if (timeSlot.isBreak) {
                                                return (
                                                    <td key={day} className="p-3 text-center">
                                                        <span className="text-xs text-muted-foreground italic">
                                                            {timeSlot.label.includes('13:') || timeSlot.label.includes('14:00') ? '🍽️ Lunch' : '☕ Break'}
                                                        </span>
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td key={day} className={cn('p-2', todayIdx === day && 'bg-primary/5')}>
                                                    {slot ? (
                                                        <div className={cn('p-3 rounded-lg border-2', subjectColors[slot.subject] || 'bg-muted/50 text-muted-foreground border-border')}>
                                                            <p className="font-medium text-sm">{slot.subject}</p>
                                                            <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
                                                                <User className="w-3 h-3" />
                                                                <span>{getTeacherName(slot.teacher_id).split(' ').pop()}</span>
                                                            </div>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
