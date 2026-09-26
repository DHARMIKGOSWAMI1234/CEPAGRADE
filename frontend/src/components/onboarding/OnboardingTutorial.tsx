import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  Play,
  ScanLine,
  Sparkles,
  FileText,
  History,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
} from 'lucide-react';

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Step {
  title: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
}

const STEPS: Step[] = [
  {
    badge: 'Step 1 of 7',
    title: 'Inspection Dashboard',
    description:
      'This is your inspection workspace. You can start a new inspection and review previous batches.',
    icon: LayoutDashboard,
    tip: 'Review high-level metrics including total produce analyzed, quality scores, and review queues.',
  },
  {
    badge: 'Step 2 of 7',
    title: 'New Inspection Setup',
    description:
      'Upload an onion image or supported inspection input here.',
    icon: UploadCloud,
    tip: 'Ensure overhead lighting and include a reference coin if you want millimeter physical scale calibration.',
  },
  {
    badge: 'Step 3 of 7',
    title: 'Run AI Inspection',
    description:
      'Start the AI inspection to process the uploaded image.',
    icon: Play,
    tip: 'Our pipeline coordinates YOLOv8 instance segmentation and MobileNetV3 health classification simultaneously.',
  },
  {
    badge: 'Step 4 of 7',
    title: 'Visual Results & Overlays',
    description:
      'Review detected onion instances, segmentation overlays, and inspection measurements.',
    icon: ScanLine,
    tip: 'Use the interactive split view slider to compare original camera captures with AI boundary masks.',
  },
  {
    badge: 'Step 5 of 7',
    title: 'Onion Details & Morphometry',
    description:
      'Open an individual onion to review its available measurements and health classification.',
    icon: Sparkles,
    tip: 'Inspect equivalent diameter (mm), bounding box crops, and isolated bulb masks with background zeroed.',
  },
  {
    badge: 'Step 6 of 7',
    title: 'Inspection Reports',
    description:
      'Generate and review the inspection report.',
    icon: FileText,
    tip: 'Download or print official PDF quality certificates complete with batch statistics and verification metadata.',
  },
  {
    badge: 'Step 7 of 7',
    title: 'Traceable History',
    description:
      'Review previous inspections from the History section.',
    icon: History,
    tip: 'Every processed batch is preserved in the database for auditing and quality trend analysis.',
  },
];

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' && currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const IconComponent = step.icon;
  const isLast = currentStep === STEPS.length - 1;

  const handleFinish = () => {
    localStorage.setItem('cepagrade_onboarding_completed', 'true');
    onClose();
    navigate('/new');
  };

  const handleSkip = () => {
    localStorage.setItem('cepagrade_onboarding_completed', 'true');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="CEPA GRADE Product Onboarding Tour"
    >
      <div className="bg-white dark:bg-[#0D0D0F] border border-zinc-200 dark:border-[#27272A] rounded-2xl shadow-soft-lg max-w-lg w-full p-6 sm:p-8 space-y-6 transition-all">
        
        {/* Header with Step Badge and Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 font-mono">
              {step.badge}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            title="Skip Tour"
            aria-label="Close Tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Visual Icon & Title */}
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-soft-sm">
            <IconComponent className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {step.title}
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {step.tip && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong className="text-zinc-900 dark:text-zinc-200 font-semibold block mb-0.5">
                Pro Tip:
              </strong>
              {step.tip}
            </div>
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 pt-2">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-7 bg-brand-500'
                  : idx < currentStep
                  ? 'w-2 bg-brand-300 dark:bg-brand-800'
                  : 'w-2 bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Footer Navigation Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-[#27272A]">
          <button
            type="button"
            id="onboarding-skip-btn"
            onClick={handleSkip}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                id="onboarding-back-btn"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                id="onboarding-finish-btn"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-semibold shadow-soft-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Start First Inspection</span>
              </button>
            ) : (
              <button
                type="button"
                id="onboarding-next-btn"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-semibold shadow-soft-sm transition-all cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
