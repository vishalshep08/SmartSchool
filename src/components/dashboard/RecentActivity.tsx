import { useState } from 'react';
import { 
  CheckCircle, BookOpen, Wrench, Calendar, DollarSign, 
  UserPlus, GraduationCap, Mail, Upload, FileText, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

const iconMap: Record<string, React.ElementType> = {
  CREATE_TEACHER: UserPlus,
  CREATE_STUDENT: GraduationCap,
  ASSIGN_HOMEWORK: BookOpen,
  SUBMIT_HOMEWORK: FileText,
  SEND_EMAIL: Mail,
  UPLOAD_TEACHER_DOC: Upload,
  UPLOAD_HOMEWORK_FILE: Upload,
  UPDATE_RECORD: Wrench,
  DELETE_RECORD: Wrench,
};

const colorMap: Record<string, string> = {
  CREATE_TEACHER: 'bg-success/10 text-success',
  CREATE_STUDENT: 'bg-primary/10 text-primary',
  ASSIGN_HOMEWORK: 'bg-primary/10 text-primary',
  SUBMIT_HOMEWORK: 'bg-success/10 text-success',
  SEND_EMAIL: 'bg-accent/10 text-accent',
  UPLOAD_TEACHER_DOC: 'bg-warning/10 text-warning',
  UPLOAD_HOMEWORK_FILE: 'bg-warning/10 text-warning',
  UPDATE_RECORD: 'bg-muted text-muted-foreground',
  DELETE_RECORD: 'bg-destructive/10 text-destructive',
};

export function RecentActivity() {
  const [roleFilter, setRoleFilter] = useState('all');
  const { activities, isLoading } = useActivityLogs(roleFilter);

  return (
    <div className="glass-card p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Recent Activity</h3>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="parent">Parent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity yet.</p>
        ) : (
          activities.map((activity, index) => {
            const Icon = iconMap[activity.action_type] || CheckCircle;
            
            return (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 opacity-0 animate-slide-in-right"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  colorMap[activity.action_type] || 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
