import { useState } from 'react';
import { useParentData } from '@/hooks/useParentData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  behaviour: 'bg-warning/10 text-warning border-warning/30',
  'academic progress': 'bg-primary/10 text-primary border-primary/30',
  general: 'bg-muted text-muted-foreground',
};

export default function ParentRemarks() {
  const { linkedStudents, isLoading: loadingParent } = useParentData();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const selectedChild = linkedStudents[selectedChildIndex] || null;
  const queryClient = useQueryClient();

  const { data: remarks = [], isLoading } = useQuery({
    queryKey: ['parent-child-remarks', selectedChild?.id],
    queryFn: async () => {
      if (!selectedChild?.id) return [];
      const { data, error } = await supabase
        .from('student_remarks')
        .select('*, employees(id, user_id)')
        .eq('student_id', selectedChild.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch teacher names
      const teacherUserIds = data?.map((r: any) => r.employees?.user_id).filter(Boolean) || [];
      if (teacherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', teacherUserIds);
        return data?.map((r: any) => ({
          ...r,
          teacher_name: profiles?.find(p => p.user_id === r.employees?.user_id)?.full_name || 'Teacher',
        })) || [];
      }
      return data || [];
    },
    enabled: !!selectedChild?.id,
  });

  // Mark as read
  const markRead = useMutation({
    mutationFn: async (remarkId: string) => {
      await supabase
        .from('student_remarks')
        .update({ is_read_by_parent: true, read_at: new Date().toISOString() })
        .eq('id', remarkId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-child-remarks'] }),
  });

  if (loadingParent) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Remarks — {selectedChild?.full_name || 'Select Child'}
      </h1>

      {linkedStudents.length > 1 && (
        <Tabs value={selectedChildIndex.toString()} onValueChange={v => setSelectedChildIndex(parseInt(v))}>
          <TabsList>
            {linkedStudents.map((child: any, idx: number) => (
              <TabsTrigger key={child.id} value={idx.toString()}>{child.full_name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {selectedChild ? (
        isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
        ) : remarks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No remarks have been posted yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {remarks.map((remark: any) => {
              const isUnread = !remark.is_read_by_parent;
              return (
                <Card
                  key={remark.id}
                  className={cn(isUnread && 'border-primary/30 bg-primary/5')}
                  onClick={() => { if (isUnread) markRead.mutate(remark.id); }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn('capitalize', categoryColors[remark.category?.toLowerCase()] || categoryColors.general)}>
                            {remark.category}
                          </Badge>
                          {isUnread && (
                            <Badge className="bg-primary text-primary-foreground text-xs">New</Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-foreground mb-1">{remark.title}</h3>
                        {remark.description && (
                          <p className="text-sm text-muted-foreground mb-2">{remark.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>By {remark.teacher_name || 'Teacher'}</span>
                          <span>{format(new Date(remark.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>
      )}
    </div>
  );
}
