import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | 'amber'
    | 'emerald'
    | 'blue'
    | 'rose'
    | 'slate';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const variantStyles = {
    default: 'bg-zinc-100 dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
    primary: 'bg-brand-50 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 border-brand-200 dark:border-brand-800/60',
    slate: 'bg-zinc-100 dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800/60',
    danger: 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60',
    rose: 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60',
    info: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    purple: 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800/60',
  };

  const dotColors: Record<string, string> = {
    default: 'bg-zinc-400 dark:bg-zinc-500',
    primary: 'bg-brand-500',
    slate: 'bg-zinc-400 dark:bg-zinc-500',
    success: 'bg-emerald-500',
    emerald: 'bg-emerald-500',
    warning: 'bg-amber-500',
    amber: 'bg-amber-500',
    danger: 'bg-red-500',
    rose: 'bg-red-500',
    info: 'bg-blue-500',
    blue: 'bg-blue-500',
    purple: 'bg-fuchsia-500',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-lg border font-mono tracking-tight select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || 'bg-zinc-400'}`} />
      )}
      {children}
    </span>
  );
};
