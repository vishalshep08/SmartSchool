import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Plus, X } from 'lucide-react';

type RemarkType = 'positive' | 'negative' | 'neutral';
type RemarkCategory = 'behavior' | 'academic' | 'attendance' | 'participation' | 'other';

interface Remark {
  id: string;
  remark_type: RemarkType;
  category: RemarkCategory;
  title: string;
  description: string | null;
  created_at: string;
  is_read_by_parent: boolean;
  students: {
    full_name: string;
    admission_number: string;
    classes: { name: string; section: string } | null;
  } | null;
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  roll_number: string | null;
  classes: { id: string; name: string; section: string } | null;
}

interface FormState {
  student_id: string;
  remark_type: RemarkType;
  category: RemarkCategory;
  title: string;
  description: string;
}

const typeColors: Record<RemarkType, { bg: string; text: string; border: string }> = {
  positive: { bg: '#ECFDF5', text: '#059669', border: '#6EE7B7' },
  negative: { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
  neutral: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
};

const categoryLabels: Record<RemarkCategory, string> = {
  behavior: '🧠 Behavior',
  academic: '📚 Academic',
  attendance: '📅 Attendance',
  participation: '🙋 Participation',
  other: '📝 Other',
};

export default function TeacherRemarks() {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    student_id: '',
    remark_type: 'positive',
    category: 'academic',
    title: '',
    description: '',
  });

  // Fetch teacher's employee id
  useEffect(() => {
    let cancelled = false;
    const fetchEmployee = async () => {
      if (!user?.id) return;
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && emp) setEmployeeId(emp.id);
    };
    fetchEmployee();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Fetch all active students
  useEffect(() => {
    let cancelled = false;
    const fetchStudents = async () => {
      const { data } = await (supabase as any)
        .from('students')
        .select('id, full_name, admission_number, roll_number, classes(id, name, section)')
        .eq('is_active', true)
        .order('full_name');
      if (!cancelled) setStudents(data || []);
    };
    fetchStudents();
    return () => { cancelled = true; };
  }, []);

  const fetchRemarks = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('student_remarks')
        .select(`
          id, remark_type, category, title, description,
          created_at, is_read_by_parent,
          students(full_name, admission_number, classes(name, section))
        `)
        .eq('teacher_id', employeeId)
        .order('created_at', { ascending: false });
      setRemarks(data || []);
    } catch (err) {
      console.error('[TeacherRemarks] fetchRemarks error:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) fetchRemarks();
  }, [employeeId, fetchRemarks]);

  const handleSubmit = async () => {
    if (!form.student_id || !form.title.trim() || !employeeId) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('student_remarks')
        .insert({
          student_id: form.student_id,
          teacher_id: employeeId,
          remark_type: form.remark_type,
          category: form.category,
          title: form.title.trim(),
          description: form.description.trim() || null,
          is_read_by_parent: false,
        });

      if (error) throw error;

      // Notify parent via notifications table
      const student = students.find(s => s.id === form.student_id);
      if (student) {
        const { data: studentData } = await (supabase as any)
          .from('students')
          .select('parent_user_id')
          .eq('id', form.student_id)
          .maybeSingle();

        if (studentData?.parent_user_id) {
          await (supabase as any).from('notifications').insert({
            user_id: studentData.parent_user_id,
            title: 'New Remark from Teacher',
            message: `A new ${form.remark_type} remark has been added for ${student.full_name}: "${form.title}"`,
            is_read: false,
          });
        }
      }

      setForm({
        student_id: '',
        remark_type: 'positive',
        category: 'academic',
        title: '',
        description: '',
      });
      setShowForm(false);
      await fetchRemarks();
    } catch (err) {
      console.error('[TeacherRemarks] Submit error:', err);
      alert('Failed to submit remark. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (remarkId: string) => {
    if (!confirm('Delete this remark? This cannot be undone.')) return;
    await (supabase as any).from('student_remarks').delete().eq('id', remarkId);
    await fetchRemarks();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Student Remarks
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add and manage remarks for any student
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, hsl(245, 75%, 52%), hsl(260, 70%, 45%))' }}
        >
          <Plus className="w-4 h-4" />
          Add Remark
        </button>
      </div>

      {/* Modal Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-lg font-semibold text-gray-900">Add New Remark</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.student_id}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                >
                  <option value="">— Select Student —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                      {s.classes ? ` — ${s.classes.name}${s.classes.section ? ' ' + s.classes.section : ''}` : ''}
                      {' '}(Adm: {s.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Remark type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remark Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(['positive', 'negative', 'neutral'] as RemarkType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, remark_type: type }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                        form.remark_type === type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {type === 'positive' ? '✅ Positive' : type === 'negative' ? '⚠️ Negative' : '➖ Neutral'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as RemarkCategory }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                >
                  <option value="academic">📚 Academic</option>
                  <option value="behavior">🧠 Behavior</option>
                  <option value="attendance">📅 Attendance</option>
                  <option value="participation">🙋 Participation</option>
                  <option value="other">📝 Other</option>
                </select>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Brief title for the remark"
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/100</p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detailed description of the remark..."
                  rows={3}
                  maxLength={500}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/500</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, hsl(245, 75%, 52%), hsl(260, 70%, 45%))' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Remark'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remarks list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : remarks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquare className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">No remarks posted yet</p>
          <p className="text-sm mt-1">Click "Add Remark" to post your first remark</p>
        </div>
      ) : (
        <div className="space-y-3">
          {remarks.map(remark => {
            const colors = typeColors[remark.remark_type];
            return (
              <div
                key={remark.id}
                className="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderLeftWidth: '4px', borderLeftColor: colors.border }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {remark.remark_type === 'positive' ? '✅' : remark.remark_type === 'negative' ? '⚠️' : '➖'}
                        {' '}{remark.remark_type}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {categoryLabels[remark.category]}
                      </span>
                      {remark.is_read_by_parent ? (
                        <span className="text-xs text-green-600">✓ Read by parent</span>
                      ) : (
                        <span className="text-xs text-orange-500">● Not read yet</span>
                      )}
                    </div>

                    {/* Student info */}
                    <p className="text-xs text-muted-foreground mb-1">
                      {remark.students?.full_name}
                      {remark.students?.classes
                        ? ` — ${remark.students.classes.name}${remark.students.classes.section ? ' ' + remark.students.classes.section : ''}`
                        : ''}
                    </p>

                    {/* Content */}
                    <p className="font-semibold text-foreground text-sm">{remark.title}</p>
                    {remark.description && (
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{remark.description}</p>
                    )}

                    {/* Date */}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {new Date(remark.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(remark.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0 text-xl leading-none rounded"
                    title="Delete remark"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
