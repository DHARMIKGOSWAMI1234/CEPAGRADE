import React from 'react';
import { Card } from './Card';

interface MetricCardProps {
  label?: string;
  title?: string;
  value: React.ReactNode;
  subtext?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'pink' | 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  highlight?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  title,
  value,
  subtext,
  icon,
  variant = 'default',
  highlight = false,
  className = '',
}) => {
  const displayLabel = title || label || '';

  const iconBgStyles = {
    default: 'bg-zinc-100 dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800',
    slate: 'bg-zinc-100 dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800',
    pink: 'bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/60',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50',
    amber: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50',
    rose: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50',
    blue: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50',
  };

  const valueStyles = {
    default: 'text-zinc-900 dark:text-zinc-50',
    slate: 'text-zinc-900 dark:text-zinc-50',
    pink: 'text-brand-600 dark:text-brand-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    try {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-5 h-5" />;
    } catch {
      return null;
    }
  };

  return (
    <Card
      padding="md"
      hover
      highlight={highlight}
      className={`relative overflow-hidden transition-all duration-200 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
            {displayLabel}
          </p>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${valueStyles[variant]}`}
          >
            {value}
          </div>
          {subtext && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
              {subtext}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl shrink-0 ${iconBgStyles[variant]}`}>
            {renderIcon()}
          </div>
        )}
      </div>
    </Card>
  );
};
