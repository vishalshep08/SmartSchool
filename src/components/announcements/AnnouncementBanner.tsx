import { useActiveAnnouncements } from '@/hooks/useAnnouncements';
import { Megaphone, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceFromNow } from '@/lib/dateUtils';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export function AnnouncementBanner() {
    const { announcements, isLoading, markAsRead, unreadCount } = useActiveAnnouncements();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (isLoading || announcements.length === 0) return null;

    const latestAnnouncements = announcements.slice(0, 3);
    const expanded = announcements.find(a => a.id === expandedId);

    return (
        <>
            <div className="space-y-3 animate-fade-up" style={{ animationDelay: '50ms' }}>
                {unreadCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Megaphone className="w-4 h-4 text-primary" />
                        <span className="font-medium">Announcements</span>
                        <Badge variant="destructive" className="text-xs">{unreadCount} new</Badge>
                    </div>
                )}
                {latestAnnouncements.map(announcement => (
                    <div
                        key={announcement.id}
                        onClick={() => {
                            setExpandedId(announcement.id);
                            if (!announcement.is_read) markAsRead.mutate(announcement.id);
                        }}
                        className={`glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover-lift ${!announcement.is_read ? 'border-l-4 border-l-primary' : ''
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Megaphone className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm text-foreground">{announcement.title}</p>
                                        {!announcement.is_read && (
                                            <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">New</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{announcement.content}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceFromNow(announcement.created_at)}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Expanded View */}
            <Dialog open={!!expandedId} onOpenChange={() => setExpandedId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{expanded?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{expanded?.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{expanded?.created_at ? formatDistanceFromNow(expanded.created_at) : ''}</span>
                            <span>•</span>
                            <span>For: {expanded?.target_audience?.join(', ')}</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
