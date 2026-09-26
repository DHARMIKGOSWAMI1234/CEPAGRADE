import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  collapsed = false,
  showSubtitle = true,
  size = 'md',
  animate = false,
}) => {
  const iconSizes = {
    sm: 'w-8 h-8 rounded-lg p-1.5',
    md: 'w-10 h-10 rounded-xl p-2',
    lg: 'w-14 h-14 rounded-2xl p-2.5',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Vision + Agricultural Icon */}
      <div className={`relative shrink-0 ${iconSizes[size]} bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 shadow-soft-sm flex items-center justify-center border border-brand-400/40`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full text-white ${animate ? 'animate-pulse' : ''}`}
        >
          {/* Optical Scanner Reticle Marks */}
          <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.5" />
          <line x1="20" y1="2" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="34" x2="20" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="20" x2="6" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="34" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

          {/* Onion Bulb Silhouette */}
          <path
            d="M20 7C17 11 11 17 11 23C11 28.5 15 32 20 32C25 32 29 28.5 29 23C29 17 23 11 20 7Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Inner Concentric Tunic Curves */}
          <path
            d="M20 12C18 15 15 19 15 23.5C15 27 17.2 29.5 20 29.5C22.8 29.5 25 27 25 23.5C25 19 22 15 20 12Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />

          {/* Core Central Aperture Node */}
          <circle cx="20" cy="23" r="2.2" fill="#F472B6" />

          {/* Top Sprout Tip */}
          <path d="M19 7L20 4L21 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-black ${titleSizes[size]} tracking-tight text-zinc-900 dark:text-zinc-50 leading-none`}>
              ONION<span className="text-brand-500 dark:text-brand-400">VISION</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-900">
              v1.0
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wide mt-1 truncate">
              AI Quality Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
