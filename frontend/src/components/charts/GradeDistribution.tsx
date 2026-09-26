import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

interface GradeDistributionProps {
  distribution: {
    A: number;
    B: number;
    C: number;
    Reject: number;
    [key: string]: number;
  };
}

export const GradeDistributionChart: React.FC<GradeDistributionProps> = ({ distribution }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = [
    { grade: 'Grade A', count: distribution.A || 0, color: '#059669' },
    { grade: 'Grade B', count: distribution.B || 0, color: '#2563eb' },
    { grade: 'Grade C', count: distribution.C || 0, color: '#d97706' },
    { grade: 'Reject', count: distribution.Reject || 0, color: '#e11d48' },
  ];

  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        No graded onions in this dataset
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={isDark ? '#334155' : '#f1f5f9'}
          />
          <XAxis
            dataKey="grade"
            tickLine={false}
            axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
            allowDecimals={false}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: any) => [`${value} onions`, 'Count']}
            contentStyle={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '0.75rem',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
