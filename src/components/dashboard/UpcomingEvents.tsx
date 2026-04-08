import { useUpcomingEvents } from '@/hooks/useEvents';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export function UpcomingEvents() {
  const { events, isLoading } = useUpcomingEvents(5);

  return (
    <div className="glass-card p-6 animate-fade-up">
      <h3 className="font-heading font-semibold text-foreground mb-4">Upcoming Events</h3>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
        ) : (
          events.map((event: any) => (
            <div key={event.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.start_date), 'EEEE, dd MMM yyyy')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
