import { useState } from 'react';
import { useParentData } from '@/hooks/useParentData';
import { useParentStudyMaterials, type MaterialType } from '@/hooks/useStudyMaterials';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BookOpen, Link2, FileText, Download, Search, Filter,
  Video, StickyNote, BookMarked, ClipboardList, X, Calendar,
  GraduationCap, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const MATERIAL_TYPES: { value: MaterialType | 'all'; label: string; icon: any; color: string }[] = [
  { value: 'all',          label: 'All',           icon: Filter,       color: '' },
  { value: 'lecture_link', label: 'Lectures',      icon: Video,        color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'notes',        label: 'Notes',         icon: StickyNote,   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'syllabus',     label: 'Syllabus',      icon: BookMarked,   color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'assignment',   label: 'Assignments',   icon: ClipboardList,color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'other',        label: 'Other',         icon: FileText,     color: 'bg-purple-100 text-purple-800 border-purple-200' },
];

function getMaterialMeta(type: MaterialType) {
  return MATERIAL_TYPES.find(m => m.value === type) || MATERIAL_TYPES[5];
}

const TYPE_STRIP: Record<string, string> = {
  lecture_link: 'bg-gradient-to-r from-blue-500 to-blue-400',
  notes:        'bg-gradient-to-r from-yellow-500 to-yellow-400',
  syllabus:     'bg-gradient-to-r from-green-500 to-green-400',
  assignment:   'bg-gradient-to-r from-orange-500 to-orange-400',
  other:        'bg-gradient-to-r from-purple-500 to-purple-400',
};

export default function ParentStudyMaterials() {
  const { linkedStudents, isLoading: loadingParent } = useParentData();
  const [childIndex, setChildIndex] = useState(0);
  const selectedChild = linkedStudents[childIndex] || null;
  const classId = selectedChild?.class_id || selectedChild?.classes?.id || undefined;

  const { materials, isLoading } = useParentStudyMaterials(classId);

  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState<MaterialType | 'all'>('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterDate, setFilterDate]   = useState('');

  const allSubjects = [...new Set(materials.map(m => m.subject))];
  const allTopics   = [...new Set(materials.map(m => m.topic))];

  const filtered = materials.filter(m => {
    if (filterType !== 'all' && m.material_type !== filterType) return false;
    if (filterSubject !== 'all' && m.subject !== filterSubject) return false;
    if (filterTopic !== 'all' && m.topic !== filterTopic) return false;
    if (filterDate && m.material_date !== filterDate) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.title.toLowerCase().includes(q) &&
          !m.subject.toLowerCase().includes(q) &&
          !m.topic.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilterType('all'); setFilterSubject('all'); setFilterTopic('all');
    setFilterDate(''); setSearch('');
  };
  const hasFilters = filterType !== 'all' || filterSubject !== 'all' ||
    filterTopic !== 'all' || filterDate || search;

  if (loadingParent) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          Study Materials
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Access all study materials, notes, lecture videos and assignments uploaded by teachers.
        </p>
      </div>

      {/* Child selector */}
      {linkedStudents.length > 1 && (
        <Tabs value={childIndex.toString()} onValueChange={v => setChildIndex(parseInt(v))}>
          <TabsList>
            {linkedStudents.map((child: any, i: number) => (
              <TabsTrigger key={child.id} value={i.toString()}>{child.full_name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Info banner */}
      {selectedChild && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{selectedChild.full_name}</p>
            <p className="text-xs text-muted-foreground">
              Class {selectedChild.classes?.name || ''}{selectedChild.classes?.section ? ` - ${selectedChild.classes.section}` : ''}
              {' '}· All materials uploaded by your child's teachers are shown here
            </p>
          </div>
        </div>
      )}

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {MATERIAL_TYPES.map(t => {
          const Icon = t.icon;
          const isActive = filterType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value as any)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                isActive
                  ? t.value === 'all'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : cn('border', t.color, 'shadow-sm scale-[1.02]')
                  : 'bg-background text-muted-foreground border-border hover:border-primary/30'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.value !== 'all' && (
                <span className="text-[10px]">
                  ({materials.filter(m => m.material_type === t.value).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search title, subject, topic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {allSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterTopic} onValueChange={setFilterTopic}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {allTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="h-9 w-36"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground shrink-0">
          {filtered.length} material{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Materials */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !selectedChild ? (
        <div className="glass-card p-12 text-center">
          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-4" />
          <p className="text-muted-foreground">No child linked to your account.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No materials found</h3>
          <p className="text-muted-foreground text-sm">
            {hasFilters
              ? 'Try adjusting your filters to find more materials.'
              : "Teachers haven't uploaded any study materials yet for this class."}
          </p>
          {hasFilters && (
            <Button variant="outline" className="mt-4 gap-2" onClick={clearFilters}>
              <X className="w-4 h-4" /> Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((m, i) => {
            const meta = getMaterialMeta(m.material_type);
            const Icon = meta.icon;
            return (
              <div
                key={m.id}
                className="glass-card overflow-hidden hover-lift opacity-0 animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={cn('h-1.5', TYPE_STRIP[m.material_type])} />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground leading-tight">{m.title}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', meta.color)}>
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{m.subject}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          {m.topic}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-2">
                      {m.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(m.material_date), 'dd MMM yyyy')}
                      </span>
                      {(m as any).employees?.full_name && (
                        <span className="hidden sm:flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {(m as any).employees.full_name}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {m.lecture_url && (
                        <a
                          href={m.lecture_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                            <Video className="w-3.5 h-3.5" />
                            Watch
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                      {m.file_url && (
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={m.file_name || undefined}
                        >
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
