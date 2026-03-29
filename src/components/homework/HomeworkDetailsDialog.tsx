import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Calendar, 
  FileText,
  Users,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { formatDateIndian } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { SubmissionsTab } from './SubmissionsTab';

interface HomeworkDetailsDialogProps {
  homework: {
    id: string;
    title: string;
    description: string | null;
    subject: string;
    due_date: string;
    created_at: string;
    attachment_url: string | null;
    classes?: {
      name: string;
      section: string | null;
      grade: number;
    } | null;
    submissions?: Array<{
      id: string;
      status: string;
      submitted_at: string | null;
      student_id: string;
    }>;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HomeworkDetailsDialog({ 
  homework, 
  open, 
  onOpenChange 
}: HomeworkDetailsDialogProps) {
  if (!homework) return null;

  const dueDate = new Date(homework.due_date);
  const isOverdue = dueDate < new Date();
  const isDueSoon = !isOverdue && dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  
  const totalSubmissions = homework.submissions?.length || 0;
  const completedSubmissions = homework.submissions?.filter(
    s => s.status === 'submitted' || s.status === 'graded'
  ).length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            {homework.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="submissions" className="flex-1">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <BookOpen className="w-3 h-3" />
                {homework.subject}
              </Badge>
              {homework.classes && (
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  {homework.classes.name} {homework.classes.section && `- ${homework.classes.section}`}
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1",
                  isOverdue 
                    ? "border-destructive text-destructive" 
                    : isDueSoon 
                      ? "border-warning text-warning" 
                      : "border-success text-success"
                )}
              >
                <Calendar className="w-3 h-3" />
                Due: {formatDateIndian(dueDate)}
              </Badge>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Description
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {homework.description || 'No description provided.'}
              </p>
            </div>

            <Separator />

            {/* Submission Status */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                Submission Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{completedSubmissions}</p>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{totalSubmissions - completedSubmissions}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachment */}
            {homework.attachment_url && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Attachment
                  </h4>
                  <a 
                    href={homework.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Attachment
                  </a>
                </div>
              </>
            )}

            {/* Meta */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Created on {formatDateIndian(new Date(homework.created_at))}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-4">
            <SubmissionsTab homeworkId={homework.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
