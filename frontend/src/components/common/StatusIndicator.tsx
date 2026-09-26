import React from 'react';

export type SystemStatusType = 'online' | 'offline' | 'warning' | 'processing';

interface StatusIndicatorProps {
  status: SystemStatusType;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  pulse = true,
  className = '',
}) => {
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  const statusConfigs = {
    online: {
      color: 'bg-emerald-500',
      ring: 'bg-emerald-400',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      defaultLabel: 'Online',
    },
    offline: {
      color: 'bg-rose-500',
      ring: 'bg-rose-400',
      textColor: 'text-rose-700 dark:text-rose-300',
      defaultLabel: 'Offline',
    },
    warning: {
      color: 'bg-amber-500',
      ring: 'bg-amber-400',
      textColor: 'text-amber-700 dark:text-amber-300',
      defaultLabel: 'Attention',
    },
    processing: {
      color: 'bg-blue-500',
      ring: 'bg-blue-400',
      textColor: 'text-blue-700 dark:text-blue-300',
      defaultLabel: 'Processing',
    },
  };

  const config = statusConfigs[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`} title={displayLabel}>
      <span className="relative flex shrink-0 items-center justify-center">
        {pulse && (status === 'online' || status === 'processing') && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.ring}`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${dotSizes[size]} ${config.color}`} />
      </span>
      {displayLabel && (
        <span className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} ${config.textColor}`}>
          {displayLabel}
        </span>
      )}
    </div>
  );
};
