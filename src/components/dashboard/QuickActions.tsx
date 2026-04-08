import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  CalendarCheck, 
  BookPlus, 
  MessageSquarePlus,
  ClipboardList,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { 
    label: 'Mark Attendance', 
    icon: CalendarCheck, 
    to: '/attendance',
    color: 'from-success/20 to-success/10 hover:from-success/30 hover:to-success/20 text-success'
  },
  { 
    label: 'Add Homework', 
    icon: BookPlus, 
    to: '/homework',
    color: 'from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 text-primary'
  },
  { 
    label: 'Add Student', 
    icon: UserPlus, 
    to: '/students',
    color: 'from-accent/20 to-accent/10 hover:from-accent/30 hover:to-accent/20 text-accent'
  },
  { 
    label: 'Raise Issue', 
    icon: MessageSquarePlus, 
    to: '/issues',
    color: 'from-warning/20 to-warning/10 hover:from-warning/30 hover:to-warning/20 text-warning'
  },
  { 
    label: 'View Timetable', 
    icon: ClipboardList, 
    to: '/timetable',
    color: 'from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 text-primary'
  },
  { 
    label: 'Send Notice', 
    icon: Bell, 
    to: '/calendar',
    color: 'from-destructive/20 to-destructive/10 hover:from-destructive/30 hover:to-destructive/20 text-destructive'
  },
];

export function QuickActions() {
  return (
    <div className="glass-card p-6 animate-fade-up">
      <h3 className="font-heading font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <Link
              key={action.label}
              to={action.to}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br transition-all duration-200 hover:scale-105 opacity-0 animate-scale-in',
                action.color
              )}
              style={{ animationDelay: `${index * 50 + 100}ms` }}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium text-center">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
