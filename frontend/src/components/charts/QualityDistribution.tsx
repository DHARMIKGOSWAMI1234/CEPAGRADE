import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

interface QualityDistributionProps {
  healthyCount: number;
  unhealthyCount: number;
}

export const QualityDistributionChart: React.FC<QualityDistributionProps> = ({
  healthyCount,
  unhealthyCount,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = [
    { name: 'Healthy', value: healthyCount, color: '#059669' },
    { name: 'Unhealthy', value: unhealthyCount, color: '#e11d48' },
  ];

  const total = healthyCount + unhealthyCount;

  if (total === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        No quality classification data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            stroke={isDark ? '#0f172a' : '#ffffff'}
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any) => [
              `${value} (${((Number(value) / total) * 100).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '0.75rem',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
