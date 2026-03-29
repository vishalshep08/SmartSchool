import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudyMaterials, uploadMaterialFile, type MaterialType } from '@/hooks/useStudyMaterials';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, BookOpen, Loader2, Trash2, Pencil, Link2,
  FileText, Upload, X, Calendar, Video, FileCheck,
  BookMarked, ClipboardList, Filter, StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const MATERIAL_TYPES: { value: MaterialType; label: string; icon: any; color: string }[] = [
  { value: 'lecture_link', label: 'Lecture Link',  icon: Video,        color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'notes',        label: 'Notes',          icon: StickyNote,   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'syllabus',     label: 'Syllabus',       icon: BookMarked,   color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'assignment',   label: 'Assignment',     icon: ClipboardList,color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'other',        label: 'Other',          icon: FileText,     color: 'bg-purple-100 text-purple-800 border-purple-200' },
];

function getMaterialMeta(type: MaterialType) {
  return MATERIAL_TYPES.find(m => m.value === type) || MATERIAL_TYPES[4];
}

const EMPTY_FORM = {
  class_id: '',
  subject: '',
  topic: '',
  material_type: '' as MaterialType | '',
  title: '',
  description: '',
  lecture_url: '',
  material_date: format(new Date(), 'yyyy-MM-dd'),
};

export default function StudyMaterials() {
  const { user } = useAuth();
  const { teacher, materials, isLoading, createMaterial, updateMaterial, deleteMaterial } =
    useStudyMaterials();

  const [filterClass, setFilterClass] = useState('all');
  const [filterType, setFilterType]   = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch teacher's assigned subjects/classes from employees table (not teachers table)
  const { data: teacherRecord } = useQuery({
    queryKey: ['teacher-employee', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from('employees')
        .select('id, subjects_assigned, classes_assigned')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch classes
  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, section').order('name');
      return data || [];
    },
  });

  const assignedClassIds: string[] = teacherRecord?.classes_assigned || [];
  const classes = allClasses.filter((c: any) =>
    assignedClassIds.length === 0 ? true : assignedClassIds.includes(c.id)
  );

  const subjects: string[] = teacherRecord?.subjects_assigned || [];

  // Apply filters
  const filtered = materials.filter(m => {
    if (filterClass !== 'all' && m.class_id !== filterClass) return false;
    if (filterType !== 'all' && m.material_type !== filterType) return false;
    if (filterSubject !== 'all' && m.subject !== filterSubject) return false;
    return true;
  });

  // All subjects from materials for filter dropdown
  const allSubjectsInMaterials = [...new Set(materials.map(m => m.subject))];

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setFile(null);
    setDialogOpen(true);
  };

  const openEdit = (m: any) => {
    setEditTarget(m);
    setForm({
      class_id:      m.class_id,
      subject:       m.subject,
      topic:         m.topic,
      material_type: m.material_type,
      title:         m.title,
      description:   m.description || '',
      lecture_url:   m.lecture_url || '',
      material_date: m.material_date,
    });
    setFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.class_id || !form.subject || !form.topic || !form.material_type || !form.title) return;

    setUploading(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;

      if (file && teacher?.id) {
        const uploaded = await uploadMaterialFile(file, teacher.id);
        fileUrl  = uploaded.url;
        fileName = uploaded.name;
        fileSize = uploaded.size;
      }

      const payload: any = {
        class_id:      form.class_id,
        subject:       form.subject,
        topic:         form.topic,
        material_type: form.material_type as MaterialType,
        title:         form.title,
        description:   form.description || null,
        lecture_url:   form.lecture_url || null,
        material_date: form.material_date,
        ...(fileUrl ? { file_url: fileUrl, file_name: fileName, file_size: fileSize } : {}),
      };

      if (editTarget) {
        await updateMaterial.mutateAsync({ id: editTarget.id, ...payload });
      } else {
        await createMaterial.mutateAsync(payload);
      }

      setDialogOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const isLectureLink = form.material_type === 'lecture_link';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Study Materials</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage lecture links, notes, syllabi and assignments for your classes.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-md">
          <Plus className="w-4 h-4" />
          Upload Material
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {allClasses.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {allSubjectsInMaterials.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MATERIAL_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterClass !== 'all' || filterType !== 'all' || filterSubject !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterClass('all'); setFilterType('all'); setFilterSubject('all'); }} className="gap-1 text-muted-foreground">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Materials grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-display font-semibold text-foreground mb-2">No materials yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Upload your first study material so students never fall behind.</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Upload Material
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((m, i) => {
            const meta = getMaterialMeta(m.material_type);
            const Icon = meta.icon;
            return (
              <div
                key={m.id}
                className="glass-card overflow-hidden hover-lift opacity-0 animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Colored top strip */}
                <div className={cn('h-1.5 w-full', {
                  'bg-gradient-to-r from-blue-500 to-blue-400':   m.material_type === 'lecture_link',
                  'bg-gradient-to-r from-yellow-500 to-yellow-400': m.material_type === 'notes',
                  'bg-gradient-to-r from-green-500 to-green-400':  m.material_type === 'syllabus',
                  'bg-gradient-to-r from-orange-500 to-orange-400': m.material_type === 'assignment',
                  'bg-gradient-to-r from-purple-500 to-purple-400': m.material_type === 'other',
                })} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{m.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.topic}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(m)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', meta.color)}>{meta.label}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{m.subject}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {(m as any).classes?.name}{(m as any).classes?.section ? ` - ${(m as any).classes.section}` : ''}
                    </Badge>
                  </div>

                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(m.material_date), 'dd MMM yyyy')}
                    </div>
                    {m.lecture_url && (
                      <a href={m.lecture_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                        <Link2 className="w-3 h-3" /> Open Link
                      </a>
                    )}
                    {m.file_url && !m.lecture_url && (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                        <FileText className="w-3 h-3" /> View File
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? 'Edit Study Material' : 'Upload Study Material'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Row 1: Class + Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Class *</Label>
                <Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length > 0
                      ? classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</SelectItem>
                      ))
                      : allClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                {subjects.length > 0 ? (
                  <Select value={form.subject} onValueChange={v => setForm(p => ({ ...p, subject: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    required
                    placeholder="e.g., Mathematics"
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="mt-1.5"
                  />
                )}
              </div>
            </div>

            {/* Material Type */}
            <div>
              <Label>Material Type *</Label>
              <Select value={form.material_type} onValueChange={v => setForm(p => ({ ...p, material_type: v as MaterialType }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon className="w-4 h-4" /> {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title + Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input
                  required
                  placeholder="Material title"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Topic / Chapter *</Label>
                <Input
                  required
                  placeholder="e.g., Chapter 3: Algebra"
                  value={form.topic}
                  onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                required
                value={form.material_date}
                onChange={e => setForm(p => ({ ...p, material_date: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            {/* Lecture URL (only for lecture_link type) */}
            {isLectureLink && (
              <div>
                <Label>Lecture URL *</Label>
                <div className="relative mt-1.5">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    required={isLectureLink}
                    placeholder="https://youtube.com/..."
                    value={form.lecture_url}
                    onChange={e => setForm(p => ({ ...p, lecture_url: e.target.value }))}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {/* File upload (non-lecture types) */}
            {!isLectureLink && (
              <div>
                <Label>Attach File (PDF, DOCX, PNG, JPG)</Label>
                {file ? (
                  <div className="mt-1.5 flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <FileCheck className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PNG, JPG up to 20MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                />
              </div>
            )}

            {/* Description */}
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of what this material covers..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="mt-1.5 min-h-20"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={createMaterial.isPending || updateMaterial.isPending || uploading}
                className="bg-gradient-to-r from-primary to-primary/80 gap-2"
              >
                {(createMaterial.isPending || updateMaterial.isPending || uploading) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {editTarget ? 'Save Changes' : 'Upload Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{deleteTarget?.title}</strong>"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMaterial.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
