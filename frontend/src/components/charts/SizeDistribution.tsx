import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

interface SizeDistributionProps {
  sizesMm: number[];
}

export const SizeDistributionChart: React.FC<SizeDistributionProps> = ({ sizesMm }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!sizesMm || sizesMm.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm p-4 text-center">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Physical Size Unavailable</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          Calibration reference required for physical millimetre calculations. Measurements stored in camera pixels.
        </p>
      </div>
    );
  }

  // Create histogram bins: <40mm, 40-50mm, 50-60mm, 60-70mm, 70-80mm, >80mm
  const bins = [
    { range: '< 40 mm', count: 0 },
    { range: '40–50 mm', count: 0 },
    { range: '50–60 mm', count: 0 },
    { range: '60–70 mm', count: 0 },
    { range: '70–80 mm', count: 0 },
    { range: '> 80 mm', count: 0 },
  ];

  sizesMm.forEach((sz) => {
    if (sz < 40) bins[0].count++;
    else if (sz < 50) bins[1].count++;
    else if (sz < 60) bins[2].count++;
    else if (sz < 70) bins[3].count++;
    else if (sz < 80) bins[4].count++;
    else bins[5].count++;
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={isDark ? '#334155' : '#f1f5f9'}
          />
          <XAxis
            dataKey="range"
            tickLine={false}
            axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
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
          <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
