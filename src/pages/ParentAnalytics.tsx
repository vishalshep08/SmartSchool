import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import {
  CalendarCheck, BookOpen, IndianRupee, MessageSquare,
  FileText, TrendingUp, BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Color constants ────────────────────────────────
const ATT_COLORS: Record<string, string> = {
  present: '#22C55E',
  absent: '#EF4444',
  half_day: '#F59E0B',
  leave: '#3B82F6',
  late: '#8B5CF6',
};

const SUBJECT_COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#06B6D4',
];

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getMonthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month]} ${String(year).slice(-2)}`;
}

// ─── Attendance Donut ───────────────────────────────
function AttendanceDonut({ data, percentage }: { data: Record<string, number> | null, percentage: number }) {
  if (!data || Object.values(data).every(v => v === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm">No attendance data for this period</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Present', value: data.present || 0, color: '#22C55E' },
    { name: 'Absent', value: data.absent || 0, color: '#EF4444' },
    { name: 'Half Day', value: data.half_day || 0, color: '#F59E0B' },
    { name: 'Leave', value: data.leave || 0, color: '#3B82F6' },
  ].filter(d => d.value > 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(val: number, name: string) => [`${val} days`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
        <span className={`text-3xl font-bold ${percentage >= 75 ? 'text-green-600' : 'text-red-500'}`}>
          {percentage}%
        </span>
        <span className="text-xs text-gray-500">Attendance</span>
      </div>
      <p className="text-center text-xs text-gray-500 mt-1">
        75% minimum required —{' '}
        <span className={percentage >= 75 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
          {percentage >= 75 ? '✓ On track' : '✗ Below minimum'}
        </span>
      </p>
    </div>
  );
}

// ─── Attendance Trend ───────────────────────────────
function AttendanceTrend({ data }: { data: Array<{ month: string; percentage: number }> | null }) {
  if (!data || data.length === 0 || data.every(d => d.percentage === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-2">📈</p>
          <p className="text-sm">No trend data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(val: number) => [`${val}%`, 'Attendance']} />
        <ReferenceLine
          y={75}
          stroke="#EF4444"
          strokeDasharray="4 4"
          label={{ value: '75% min', position: 'insideTopRight', fontSize: 11, fill: '#EF4444' }}
        />
        <Bar dataKey="percentage" radius={[6, 6, 0, 0]} fill="#4F46E5" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Attendance Calendar Heatmap ────────────────────
function AttendanceCalendar({ data }: { data: Record<string, string> | null }) {
  const dObj = new Date();
  const year = dObj.getFullYear();
  const month = dObj.getMonth() + 1;

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-sm">No calendar data for this month</p>
        </div>
      </div>
    );
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const statusColors: Record<string, string> = {
    present: 'bg-green-500',
    absent: 'bg-red-500',
    half_day: 'bg-yellow-400',
    leave: 'bg-blue-400',
    late: 'bg-violet-400',
    sunday: 'bg-gray-200',
    none: 'bg-gray-50 border border-gray-200',
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-1 font-medium">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status = data[dateStr] || 'none';
          const isSunday = new Date(year, month - 1, day).getDay() === 0;
          const colorClass = isSunday ? statusColors.sunday : (statusColors[status] || statusColors.none);

          return (
            <div
              key={day}
              className={`h-8 w-full rounded-md ${colorClass} flex items-center 
                justify-center text-xs font-medium transition-transform hover:scale-110
                ${status !== 'none' && !isSunday ? 'text-white shadow-sm' : 'text-gray-600'}`}
              title={`${dateStr}: ${isSunday ? 'Sunday' : status}`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {[
          { label: 'Present', cls: 'bg-green-500' },
          { label: 'Absent', cls: 'bg-red-500' },
          { label: 'Half Day', cls: 'bg-yellow-400' },
          { label: 'Leave', cls: 'bg-blue-400' },
          { label: 'Sunday', cls: 'bg-gray-200' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${l.cls}`} />
            <span className="text-xs text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Homework by Subject ────────────────────────────
function HomeworkBySubject({ data }: { data: Array<{ subject: string; count: number }> | null }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-2">📚</p>
          <p className="text-sm">No homework data this month</p>
        </div>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={90}
          dataKey="count"
          nameKey="subject"
          label={({ subject, percent }: any) =>
            `${subject} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(val: number, name: string) => [`${val} assignments`, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Homework Status ────────────────────────────────
function HomeworkStatus({ data }: { data: { completed: number; pending: number; overdue: number } | null }) {
  if (!data || (data.completed === 0 && data.pending === 0 && data.overdue === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-2">📝</p>
          <p className="text-sm">No assignments active</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Completed', value: data.completed, color: '#22C55E' },
    { name: 'Pending', value: data.pending, color: '#F59E0B' },
    { name: 'Overdue', value: data.overdue, color: '#EF4444' },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 70, right: 20 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Fee Progress ───────────────────────────────────
function FeeProgress({ data }: { data: { total_amount: number; paid_amount: number; balance_amount: number; status: string } | null }) {
  if (!data || data.total_amount === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-sm">No fee records found</p>
        </div>
      </div>
    );
  }

  const paidPct = data.total_amount > 0 ? Math.round((data.paid_amount / data.total_amount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span className="text-green-600 font-semibold">
          Paid: ₹{(data.paid_amount || 0).toLocaleString('en-IN')}
        </span>
        <span className="text-red-500 font-semibold">
          Due: ₹{(data.balance_amount || 0).toLocaleString('en-IN')}
        </span>
      </div>
      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
          style={{ width: `${Math.max(paidPct, 1)}%` }}
        >
          {paidPct >= 10 && (
            <span className="text-white text-xs font-bold">{paidPct}%</span>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-500">
        ₹{(data.paid_amount || 0).toLocaleString('en-IN')} paid of ₹{(data.total_amount || 0).toLocaleString('en-IN')} total ({data.status})
      </p>
    </div>
  );
}

// ─── Fee Timeline ───────────────────────────────────
function FeeTimeline({ payments }: { payments: Array<{ date: string; amount: number }> | null }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400">
        <p className="text-sm">No payments recorded yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={payments}>
        <defs>
          <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => format(new Date(d), 'dd MMM')} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']} labelFormatter={(d) => format(new Date(d), 'dd MMM yyyy')} />
        <Area type="monotone" dataKey="amount" stroke="#4F46E5" fill="url(#feeGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Remarks Breakdown ──────────────────────────────
function RemarksBreakdown({ data }: { data: Array<{ name: string; count: number }> | null }) {
  const COLORS = ['#F59E0B', '#3B82F6', '#6B7280', '#EC4899', '#10B981'];
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-2">💬</p>
          <p className="text-sm">No remarks this year</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={4}
          dataKey="count"
          nameKey="name"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(val: number, name: string) => [`${val} remarks`, name]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Performance Radar ──────────────────────────────
function PerformanceSummary({ data }: { data: Array<{ subject: string; value: number }> | null }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p className="text-sm">Cannot calculate performance score</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#E5E7EB" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6B7280' }} />
        <Radar
          name="Performance"
          dataKey="value"
          stroke="#4F46E5"
          fill="#4F46E5"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Document Pipeline ──────────────────────────────
function DocumentPipeline({ stages }: { stages: Record<string, number> | null }) {
  if (!stages || Object.keys(stages).length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 w-full">
        <div className="text-center">
          <p className="text-4xl mb-2">📄</p>
          <p className="text-sm">No document requests</p>
        </div>
      </div>
    );
  }

  const stageConfig = [
    { key: 'submitted', label: 'Submitted', color: '#9CA3AF' },
    { key: 'clerk_review', label: 'Under Review', color: '#F59E0B' },
    { key: 'principal_review', label: 'With Principal', color: '#F97316' },
    { key: 'clerk_issuing', label: 'Being Prepared', color: '#3B82F6' },
    { key: 'ready', label: 'Ready', color: '#22C55E' },
    { key: 'downloaded', label: 'Downloaded', color: '#6B7280' },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {stageConfig.map(stage => {
        if (!stages[stage.key]) return null;
        return (
          <div
            key={stage.key}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-sm font-medium text-gray-700">{stage.label}</span>
            <span className="text-sm font-bold" style={{ color: stage.color }}>
              {stages[stage.key] || 0}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────
export default function ParentAnalytics() {
  const { user } = useAuth();
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  // Key prop pattern — when selectedStudentId changes,
  // component re-mounts and fetches fresh data
  const fetchAllAnalytics = useCallback(async (studentId: string, classId: string) => {
    if (!studentId || !classId) {
      setError('Student or class information not available.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      const currentMonthStart = new Date(year, month, 1)
        .toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      // Fetch last 6 months for trend & remarks to be safe
      const threeMonthsAgoObj = new Date(year, month - 2, 1);
      const threeMonthsAgo = threeMonthsAgoObj.toISOString().split('T')[0];

      // Run ALL queries in parallel — no sequential awaits
      const [
        attendanceResult,
        homeworkResult,
        feeResult,
        feePaymentsResult,
        remarksResult,
        docRequestsResult,
      ] = await Promise.allSettled([
        // Attendance — current month (will fetch all to do trend as well)
        supabase
          .from('student_attendance')
          .select('date, status')
          .eq('student_id', studentId)
          .gte('date', threeMonthStart(threeMonthsAgoObj))
          .lte('date', today),

        // Homework — class based
        supabase
          .from('homework')
          .select('subject, title, due_date, created_at')
          .eq('class_id', classId)
          .gte('created_at', currentMonthStart),

        // Fee — use maybeSingle NOT single
        (supabase as any)
          .from('student_fees')
          .select('id, total_amount, paid_amount, balance_amount, status')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Fee payments history (fetched sequentially below if fee exists)
        Promise.resolve({ data: [] }),

        // Remarks — last 6 months
        supabase
          .from('student_remarks')
          .select('category, created_at, is_read_by_parent')
          .eq('student_id', studentId)
          .gte('created_at', threeMonthsAgo),

        // Document requests
        (supabase as any)
          .from('document_requests')
          .select('current_stage, document_type, requested_at')
          .eq('student_id', studentId),
      ]);

      // Extract data safely — handle both success and failure
      const attendanceAll = attendanceResult.status === 'fulfilled'
        ? (attendanceResult.value.data || [])
        : [];
        
      const attendance = attendanceAll.filter((a: any) => a.date >= currentMonthStart);

      const homework = homeworkResult.status === 'fulfilled'
        ? (homeworkResult.value.data || [])
        : [];

      const fee = feeResult.status === 'fulfilled'
        ? feeResult.value.data  // can be null — that's fine
        : null;

      // Handle fee payments sequentially if fee exists, to be safe.
      let feePayments: any[] = [];
      if (fee?.id) {
        const { data: fp } = await (supabase as any)
          .from('fee_payments')
          .select('amount_paid, payment_date')
          .eq('student_fee_id', fee.id)
          .order('payment_date', { ascending: true });
        feePayments = fp || [];
      }

      const remarks = remarksResult.status === 'fulfilled'
        ? (remarksResult.value.data || [])
        : [];

      const docRequests = docRequestsResult.status === 'fulfilled'
        ? (docRequestsResult.value.data || [])
        : [];

      // Process attendance
      const attendanceByStatus = {
        present: attendance.filter((a: any) => a.status === 'present').length,
        absent: attendance.filter((a: any) => a.status === 'absent').length,
        half_day: attendance.filter((a: any) => a.status === 'half_day').length,
        leave: attendance.filter((a: any) => a.status === 'leave').length,
      };
      
      const totalMarked = attendance.length;
      const attendancePct = totalMarked > 0
        ? Math.round(((attendanceByStatus.present + attendanceByStatus.half_day * 0.5)
            / totalMarked) * 100)
        : 0;

      // Build calendar data (date → status map)
      const calendarData: Record<string, string> = {};
      attendance.forEach((a: any) => { calendarData[a.date] = a.status; });

      // Process homework
      const todayStr = today;
      const homeworkBySubject: Record<string, number> = {};
      homework.forEach((h: any) => {
        homeworkBySubject[h.subject] = (homeworkBySubject[h.subject] || 0) + 1;
      });
      const homeworkSubjectData = Object.entries(homeworkBySubject)
        .map(([subject, count]) => ({ subject, count }));

      const pendingHW = homework.filter((h: any) => h.due_date >= todayStr).length;
      const overdueHW = homework.filter((h: any) => h.due_date < todayStr).length;
      const completedHW = 0; // no submission tracking yet

      // Process fee
      const feeData = fee || {
        total_amount: 0,
        paid_amount: 0,
        balance_amount: 0,
        status: 'No Record',
      };

      // Process fee payments for timeline
      const feeTimeline = feePayments.map(p => ({
        date: p.payment_date,
        amount: p.amount_paid,
      }));

      // Process remarks
      const remarksByCategory = {
        behaviour: remarks.filter((r: any) => r.category === 'Behaviour').length,
        academic: remarks.filter((r: any) => r.category === 'Academic Progress').length,
        general: remarks.filter((r: any) => r.category === 'General').length,
      };
      const remarksChartData = [
        { name: 'Behaviour', count: remarksByCategory.behaviour },
        { name: 'Academic', count: remarksByCategory.academic },
        { name: 'General', count: remarksByCategory.general },
      ].filter(r => r.count > 0);

      // Process document requests by stage
      const docStages: Record<string, number> = {};
      docRequests.forEach((d: any) => {
        docStages[d.current_stage] = (docStages[d.current_stage] || 0) + 1;
      });

      // Build 3-month trend data
      const trendData = [-2, -1, 0].map(offset => {
        const d = new Date(year, month + offset, 1);
        const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const mEnd = new Date(year, month + offset + 1, 0)
          .toISOString().split('T')[0];
          
        const mAtt = attendanceAll.filter((a: any) =>
          a.date >= mStart && a.date <= mEnd
        );
        const mPresent = mAtt.filter((a: any) => a.status === 'present' || a.status === 'late').length;
        const mTotal = mAtt.length;
        return {
          month: getMonthLabel(d.getMonth() + 1, d.getFullYear()),
          percentage: mTotal > 0
            ? Math.round((mPresent / mTotal) * 100) : 0,
        };
      });

      // Performance radar data (normalize to 0-100)
      const radarData = [
        { subject: 'Attendance', value: attendancePct },
        {
          subject: 'Homework',
          value: homework.length > 0
            ? Math.max(0, 100 - (overdueHW / homework.length) * 100) : 100
        },
        {
          subject: 'Fee Status',
          value: feeData.total_amount > 0
            ? Math.round((feeData.paid_amount / feeData.total_amount) * 100) : 100
        },
        {
          subject: 'Behaviour',
          value: remarksByCategory.behaviour > 0 ? 70 : 90
        },
        {
          subject: 'Academics',
          value: remarksByCategory.academic > 0 ? 75 : 85
        },
      ];

      setAnalyticsData({
        attendance: attendanceByStatus,
        attendancePct,
        calendarData,
        totalMarked,
        trendData,
        homework: {
          bySubject: homeworkSubjectData,
          pending: pendingHW,
          overdue: overdueHW,
          completed: completedHW,
          total: homework.length,
        },
        fee: feeData,
        feeTimeline,
        remarks: {
          byCategory: remarksChartData,
          total: remarks.length,
          unread: remarks.filter((r: any) => !r.is_read_by_parent).length,
        },
        docStages,
        radarData,
      });

    } catch (err: any) {
      console.error('[ANALYTICS] Error:', err);
      setError(`Failed to load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  function threeMonthStart(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // Get student list for this parent on mount
  useEffect(() => {
    let cancelled = false;
    const fetchStudents = async () => {
      try {
        const { data: parent } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (!parent || cancelled) return;

        const { data: links } = await supabase
          .from('parent_student_link')
          .select(`
            student_id,
            students (id, full_name, class_id,
              classes (name, section))
          `)
          .eq('parent_id', parent.id);

        if (cancelled) return;

        const students = (links || []).map((l: any) => ({
          id: l.students?.id,
          name: l.students?.full_name,
          classId: l.students?.class_id,
          className: `${l.students?.classes?.name || ''} ${l.students?.classes?.section || ''}`.trim(),
        }));

        setStudentList(students);

        // Auto-select first student
        if (students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(students[0].id);
          setSelectedClassId(students[0].classId);
        }
      } catch (err) {
        console.error('[ANALYTICS] Student fetch error:', err);
      }
    };

    if (user?.id) fetchStudents();
    return () => { cancelled = true; };
  }, [user]);

  // When student changes — clear old data first, then fetch new
  useEffect(() => {
    if (!selectedStudentId || !selectedClassId) return;

    // Clear previous data immediately to prevent showing wrong child's data
    setAnalyticsData(null);
    setLoading(true);

    // Small delay to ensure clean state
    const timer = setTimeout(() => {
      fetchAllAnalytics(selectedStudentId, selectedClassId);
    }, 50);

    return () => clearTimeout(timer);
  }, [selectedStudentId, selectedClassId, fetchAllAnalytics]);

  const handleTabChange = (val: string) => {
    const idx = parseInt(val);
    if (studentList[idx]) {
      setSelectedStudentId(studentList[idx].id);
      setSelectedClassId(studentList[idx].classId);
    }
  };

  const currentStudent = studentList.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            {currentStudent?.name || 'Child'}'s Performance Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual overview of school performance
          </p>
        </div>
      </div>

      {/* Child Switcher */}
      {studentList.length > 1 && (
        <Tabs
          value={studentList.findIndex(s => s.id === selectedStudentId).toString()}
          onValueChange={handleTabChange}
        >
          <TabsList>
            {studentList.map((child, idx) => (
              <TabsTrigger key={child.id} value={idx.toString()}>
                {child.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-72 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-64 gap-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchAllAnalytics(selectedStudentId, selectedClassId)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      ) : !analyticsData ? (
        <div className="flex items-center justify-center min-h-64">
          <p className="text-gray-400">Select a student to view analytics</p>
        </div>
      ) : (
        <>
          {/* Section 5 — Performance Radar (top) */}
          <Card className="animate-fade-up border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceSummary data={analyticsData.radarData} />
            </CardContent>
          </Card>

          {/* Section 1 — Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="animate-fade-up" style={{ animationDelay: '50ms' }}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-green-600" />
                  Monthly Attendance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceDonut data={analyticsData.attendance} percentage={analyticsData.attendancePct} />
              </CardContent>
            </Card>

            <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  3-Month Attendance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceTrend data={analyticsData.trendData} />
              </CardContent>
            </Card>
          </div>

          {/* Calendar Heatmap */}
          <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                Attendance Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceCalendar data={analyticsData.calendarData} />
            </CardContent>
          </Card>

          {/* Section 2 — Homework */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Homework by Subject
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeworkBySubject data={analyticsData.homework.bySubject} />
              </CardContent>
            </Card>

            <Card className="animate-fade-up" style={{ animationDelay: '250ms' }}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Homework Completion Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeworkStatus data={analyticsData.homework} />
              </CardContent>
            </Card>
          </div>

          {/* Section 3 — Fees */}
          <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-green-600" />
                Fee Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FeeProgress data={analyticsData.fee} />
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Payment History</h4>
                <FeeTimeline payments={analyticsData.feeTimeline} />
              </div>
            </CardContent>
          </Card>

          {/* Section 4 & 6 — Remarks + Documents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            <Card className="animate-fade-up" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  Remarks by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RemarksBreakdown data={analyticsData.remarks.byCategory} />
              </CardContent>
            </Card>

            <Card className="animate-fade-up" style={{ animationDelay: '400ms' }}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Document Request Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center">
                <DocumentPipeline stages={analyticsData.docStages} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
