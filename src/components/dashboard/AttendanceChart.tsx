import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AttendanceChartProps {
  present: number;
  absent: number;
  late?: number;
}

export function AttendanceChart({ present, absent, late = 0 }: AttendanceChartProps) {
  const total = present + absent + late;
  
  const data = [
    { name: 'Present', value: present, color: 'hsl(160, 84%, 39%)' },
    { name: 'Absent', value: absent, color: 'hsl(0, 84%, 60%)' },
    ...(late > 0 ? [{ name: 'Late', value: late, color: 'hsl(38, 92%, 50%)' }] : []),
  ];

  return (
    <div className="glass-card p-6 animate-fade-up">
      <h3 className="font-heading font-semibold text-foreground mb-4">Today's Attendance</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-2xl font-heading font-bold text-foreground">
          {Math.round((present / total) * 100)}%
        </span>
        <span className="text-sm text-muted-foreground">attendance rate</span>
      </div>
    </div>
  );
}
