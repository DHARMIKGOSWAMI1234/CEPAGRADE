import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showBack?: boolean;
  backTo?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Inspection Service Error',
  message = 'An error occurred while communicating with the CEPA GRADE backend.',
  onRetry,
  showBack = false,
  backTo = '/history',
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`p-8 sm:p-12 max-w-md mx-auto text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 ring-8 ring-rose-50/50 dark:ring-rose-950/40 border border-rose-200/50 dark:border-rose-800/50 shadow-soft-sm">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button variant="primary" onClick={onRetry} icon={<RefreshCw className="w-4 h-4" />}>
            Retry Request
          </Button>
        )}
        {showBack && (
          <Button variant="outline" onClick={() => navigate(backTo)} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Inspections
          </Button>
        )}
      </div>
    </div>
  );
};
