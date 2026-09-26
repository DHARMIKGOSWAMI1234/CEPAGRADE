import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface DemoWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptsRemaining: number;
}

export const DemoWelcomeModal: React.FC<DemoWelcomeModalProps> = ({
  isOpen,
  onClose,
  attemptsRemaining,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to the CEPA GRADE Demo"
    >
      <div className="bg-white dark:bg-[#0D0D0F] border border-zinc-200 dark:border-[#27272A] rounded-2xl shadow-soft-lg max-w-md w-full p-6 sm:p-7 space-y-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demo Session</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to the CEPA GRADE Demo
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            This demo lets you explore the inspection workflow using the available local/demo environment.
          </p>
        </div>

        <div className="space-y-2.5 p-3.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>Preloaded test onion photographs ready for immediate optical scanning.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>YOLOv8 instance segmentation and MobileNetV3 quality models running locally.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>Deterministic grading and downloadable PDF certificate generation.</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
          Note: This demonstration environment is for evaluation. You have {attemptsRemaining} demo session{attemptsRemaining === 1 ? '' : 's'} remaining on this device.
        </p>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs shadow-soft-sm transition-all flex items-center justify-center space-x-2"
          >
            <span>Start Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
