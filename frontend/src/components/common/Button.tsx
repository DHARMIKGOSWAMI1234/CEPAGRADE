import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] min-h-[40px] touch-manipulation';

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2 text-sm gap-2 min-h-[42px]',
    lg: 'px-6 py-2.5 text-base gap-2.5 min-h-[48px]',
  };

  const variantStyles = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-soft-sm hover:shadow-soft-md focus:ring-brand-500 active:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white',
    secondary: 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-soft-sm focus:ring-zinc-700 dark:bg-[#18181B] dark:hover:bg-zinc-700 dark:border dark:border-[#27272A]',
    outline: 'border border-zinc-200 dark:border-[#27272A] bg-white dark:bg-[#0D0D0F] hover:bg-zinc-50 dark:hover:bg-[#18181B] text-zinc-800 dark:text-zinc-200 shadow-soft-sm focus:ring-brand-500',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white focus:ring-zinc-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-soft-sm focus:ring-red-500 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft-sm focus:ring-emerald-500 active:bg-emerald-800',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
