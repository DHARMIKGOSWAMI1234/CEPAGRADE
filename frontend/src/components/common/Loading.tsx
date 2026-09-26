import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  label = 'Processing Inspection...',
  sublabel,
  size = 'md',
  fullPage = false,
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-12 h-12 rounded-full bg-brand-500/10 dark:bg-brand-500/20 animate-ping" />
        <Loader2 className={`${sizeMap[size]} text-brand-600 dark:text-brand-400 animate-spin`} />
      </div>
      {label && (
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label}
        </p>
      )}
      {sublabel && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          {sublabel}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
