import React from 'react';
import { useTheme } from '../../hooks/useTheme';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'mark' | 'image';
  animate?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  collapsed = false,
  showSubtitle = true,
  size = 'md',
  variant = 'mark',
  animate = false,
}) => {
  const { theme } = useTheme();

  const iconSizes = {
    sm: 'w-8 h-8 rounded-lg p-1',
    md: 'w-10 h-10 rounded-xl p-1.5',
    lg: 'w-14 h-14 rounded-2xl p-2',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  if (variant === 'image' && !collapsed) {
    const logoSrc = theme === 'dark' ? '/brand/cepa-grade-logo-dark.png' : '/brand/cepa-grade-logo-light.png';
    const imgHeights = {
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-14',
    };
    return (
      <div className={`flex items-center select-none ${className}`}>
        <img
          src={logoSrc}
          alt="CEPA GRADE — Smart Onion Grading for a Better Tomorrow"
          className={`${imgHeights[size]} w-auto object-contain transition-opacity duration-200`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Vision Focus & Stylized Onion Icon */}
      <div
        className={`relative shrink-0 ${iconSizes[size]} bg-white dark:bg-[#121214] border border-pink-200/80 dark:border-pink-900/40 shadow-soft-sm flex items-center justify-center overflow-hidden`}
      >
        <img
          src="/brand/cepa-grade-icon.png"
          alt="CEPA GRADE Icon"
          className={`w-full h-full object-contain ${animate ? 'animate-pulse' : ''}`}
        />
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black ${titleSizes[size]} tracking-tight leading-none flex items-center`}
            >
              <span className="text-[#0F172A] dark:text-[#FAFAFA]">CEPA</span>
              <span className="text-brand-500 dark:text-brand-400 ml-1">GRADE</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-900">
              v1.0
            </span>
          </div>
          {showSubtitle && (
            <span
              className={`${subtitleSizes[size]} font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase mt-1 truncate`}
            >
              Smart Onion Grading
            </span>
          )}
        </div>
      )}
    </div>
  );
};
