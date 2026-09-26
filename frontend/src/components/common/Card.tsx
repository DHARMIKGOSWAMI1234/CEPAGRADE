import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  highlight?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  padding = 'md',
  hover = false,
  highlight = false,
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const hoverStyle = hover
    ? 'transition-all duration-200 hover:shadow-soft-md hover:border-zinc-300 dark:hover:border-zinc-700'
    : '';

  const highlightStyle = highlight
    ? 'border-brand-500/50 dark:border-brand-500/40 ring-1 ring-brand-500/20 shadow-glow-pink'
    : 'border-zinc-200/90 dark:border-[#27272A]';

  return (
    <div
      className={`bg-white dark:bg-[#0D0D0F] rounded-2xl border shadow-soft-sm text-zinc-900 dark:text-zinc-100 ${paddingStyles[padding]} ${hoverStyle} ${highlightStyle} ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-zinc-100 dark:border-[#27272A]">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
