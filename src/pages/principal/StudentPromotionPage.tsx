import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string;
  roll_number: string | null;
  admission_number: string | null;
  class_id: string;
  classes: {
    id: string;
    name: string;
    section: string;
    grade: number | null;
  } | null;
}

interface ClassInfo {
  id: string;
  name: string;
  section: string;
  grade: number | null;
}

interface PromotionEntry {
  toClassId: string;
  type: 'promoted' | 'detained' | 'passed_out';
}

type Step = 'review' | 'confirm' | 'done';

export default function StudentPromotionPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [promotionMap, setPromotionMap] = useState<Record<string, PromotionEntry>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('review');
  const [currentAcYear, setCurrentAcYear] = useState('');
  const [nextAcYear, setNextAcYear] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentsRes, classesRes] = await Promise.all([
          supabase
            .from('students')
            .select(`
              id, full_name, admission_number, roll_number,
              class_id,
              classes (id, name, section, grade)
            `)
            .eq('is_active', true)
            .order('class_id')
            .order('roll_number'),
          supabase
            .from('classes')
            .select('id, name, section, grade')
            .order('grade'),
        ]);

        if (cancelled) return;

        const studentsData = (studentsRes.data || []) as Student[];
        const classesData = (classesRes.data || []) as ClassInfo[];

        setStudents(studentsData);
        setClasses(classesData);

        // Initialize promotion map — default each student to promoted to next grade
        const initMap: Record<string, PromotionEntry> = {};
        studentsData.forEach(s => {
          const currentGrade = s.classes?.grade;
          const nextClass = classesData.find(
            c => c.grade === (currentGrade != null ? currentGrade + 1 : null)
          );
          initMap[s.id] = {
            toClassId: nextClass?.id || '',
            type: nextClass ? 'promoted' : 'passed_out',
          };
        });
        setPromotionMap(initMap);
      } catch (err: any) {
        console.error('Promotion page load error:', err);
        toast.error('Failed to load student data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handlePromoteAll = async () => {
    if (!currentAcYear || !nextAcYear) {
      toast.error('Please enter both academic year values');
      return;
    }
    setSubmitting(true);

    try {
      // Process in batches to avoid too many parallel requests
      for (const student of students) {
        const promo = promotionMap[student.id];
        if (!promo) continue;

        const toClass = classes.find(c => c.id === promo.toClassId);

        // Record in history
        await (supabase as any).from('student_promotion_history').insert({
          student_id: student.id,
          from_class_id: student.class_id,
          to_class_id: promo.toClassId || null,
          from_class_name: student.classes ? `${student.classes.name} ${student.classes.section}` : 'Unknown',
          to_class_name: toClass ? `${toClass.name} ${toClass.section}` : 'Passed Out',
          academic_year: currentAcYear,
          promotion_type: promo.type,
          promoted_by: user?.id,
        });

        if (promo.type === 'promoted' && promo.toClassId) {
          // Move to next class
          await supabase
            .from('students')
            .update({ class_id: promo.toClassId })
            .eq('id', student.id);
        } else if (promo.type === 'passed_out') {
          // Archive the student
          await supabase
            .from('students')
            .update({ is_active: false } as any)
            .eq('id', student.id);
        }
        // 'detained' — stays in same class, no update needed
      }

      setStep('done');
    } catch (err: any) {
      console.error('Promotion error:', err);
      toast.error(`Promotion failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Group students by current class
  const studentsByClass = students.reduce((acc: Record<string, Student[]>, s) => {
    const key = s.classes ? `${s.classes.name} ${s.classes.section}` : 'Unknown Class';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const typeColors = {
    promoted: 'bg-emerald-500 text-white',
    detained: 'bg-red-500 text-white',
    passed_out: 'bg-gray-500 text-white',
  };

  const typeLabels = {
    promoted: 'Promote',
    detained: 'Detain',
    passed_out: 'Pass Out',
  };

  // ─── Done Screen ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-5 text-center p-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promotion Complete! 🎉</h2>
          <p className="text-gray-500 mt-2">
            {students.length} students have been processed from{' '}
            <strong>{currentAcYear}</strong> to <strong>{nextAcYear}</strong>.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-indigo-600" />
          Year-End Student Promotion
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Review each student's promotion status carefully. This action cannot be undone.
        </p>
      </div>

      {/* Academic Year Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Academic Year <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 2025-2026"
            value={currentAcYear}
            onChange={e => setCurrentAcYear(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Promoting To (Next Year) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 2026-2027"
            value={nextAcYear}
            onChange={e => setNextAcYear(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Important: This action is irreversible</p>
          <p className="text-xs text-amber-700 mt-1">
            Promoted students will move to their new class. Detained students stay in the same class.
            Passed-out students (final class) will be archived. Review every row carefully.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(['promoted', 'detained', 'passed_out'] as const).map(type => {
          const count = Object.values(promotionMap).filter(p => p.type === type).length;
          return (
            <div key={type} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-sm">
              <span className={`w-2 h-2 rounded-full ${
                type === 'promoted' ? 'bg-emerald-500' : type === 'detained' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span className="text-gray-600 capitalize">{type.replace('_', ' ')}: </span>
              <span className="font-bold text-gray-900">{count}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-sm">
          <span className="text-indigo-600">Total:</span>
          <span className="font-bold text-indigo-700">{students.length}</span>
        </div>
      </div>

      {/* Student List Grouped by Class */}
      {Object.entries(studentsByClass).map(([className, studs]) => (
        <div key={className} className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3 flex items-center justify-between">
            <h3 className="text-white font-semibold">{className}</h3>
            <span className="text-indigo-200 text-sm">{studs.length} students</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">Student</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">Promote To Class</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {studs.map(student => (
                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {student.admission_number && `#${student.admission_number}`}
                      {student.roll_number && ` · Roll: ${student.roll_number}`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={promotionMap[student.id]?.toClassId || ''}
                      onChange={e => setPromotionMap(prev => ({
                        ...prev,
                        [student.id]: {
                          toClassId: e.target.value,
                          type: e.target.value ? 'promoted' : 'passed_out',
                        },
                      }))}
                      disabled={promotionMap[student.id]?.type === 'detained'}
                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-full max-w-44 disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <option value="">— Passed Out —</option>
                      {classes
                        .filter(c => c.id !== student.class_id)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.section}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {(['promoted', 'detained', 'passed_out'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setPromotionMap(prev => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], type },
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                            promotionMap[student.id]?.type === type
                              ? typeColors[type]
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {typeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {students.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No active students found</p>
        </div>
      )}

      {/* Action Buttons */}
      {students.length > 0 && (
        <div className="mt-6">
          {step === 'review' && (
            <div className="flex justify-end">
              <button
                onClick={() => setStep('confirm')}
                disabled={!currentAcYear || !nextAcYear}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Review & Confirm
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mt-2">
              <h3 className="font-bold text-red-800 text-lg mb-2">⚠️ Final Confirmation Required</h3>
              <p className="text-red-700 text-sm mb-4">
                You are about to process <strong>{students.length} students</strong> from academic year{' '}
                <strong>{currentAcYear}</strong> to <strong>{nextAcYear}</strong>.{' '}
                <strong>This cannot be undone.</strong> Please confirm you have reviewed all rows.
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setStep('review')}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  ← Go Back & Review
                </button>
                <button
                  onClick={handlePromoteAll}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors text-sm"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Yes, Process All Promotions'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
