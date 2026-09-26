import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface ConfidenceMeterProps {
  segmentation?: number | null;
  health?: number | null;
  combined?: number | null;
  segmentationConfidence?: number | null;
  healthConfidence?: number | null;
  combinedConfidence?: number | null;
  className?: string;
  compact?: boolean;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  segmentation,
  health,
  combined,
  segmentationConfidence,
  healthConfidence,
  combinedConfidence,
  className = '',
  compact = false,
}) => {
  const actualSeg = segmentation ?? segmentationConfidence ?? null;
  const actualHealth = health ?? healthConfidence ?? null;
  const actualCombined = combined ?? combinedConfidence ?? null;

  const segVal = actualSeg !== null && actualSeg !== undefined
    ? Math.round(actualSeg * 100)
    : null;
  const healthVal = actualHealth !== null && actualHealth !== undefined
    ? Math.round(actualHealth * 100)
    : null;

  // Calculate combined if not explicitly provided
  let combVal: number | null = null;
  if (actualCombined !== null && actualCombined !== undefined) {
    combVal = Math.round(actualCombined * 100);
  } else if (segVal !== null && healthVal !== null) {
    combVal = Math.round((segVal + healthVal) / 2);
  } else {
    combVal = healthVal ?? segVal;
  }

  const getBarColor = (val: number | null) => {
    if (val === null) return 'bg-slate-300 dark:bg-slate-700';
    if (val >= 90) return 'bg-emerald-500 dark:bg-emerald-400';
    if (val >= 75) return 'bg-blue-500 dark:bg-blue-400';
    if (val >= 60) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-rose-500 dark:bg-rose-400';
  };

  const renderBar = (label: string, value: number | null, subtitle?: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {label}
        </span>
        <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
          {value !== null ? `${value}%` : '—'}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(value)}`}
          style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }}
        />
      </div>
      {subtitle && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500">{subtitle}</p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div
        className={`space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 ${className}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Model Confidence
          </span>
          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
            {combVal !== null ? `${combVal}%` : '—'}
          </span>
        </div>
        {renderBar('Combined Inference', combVal)}
      </div>
    );
  }

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Model Confidence Evidence
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Multimodal verification breakdown
            </span>
          </div>
        </div>
        {combVal !== null && (
          <div className="text-right">
            <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
              {combVal}%
            </span>
            <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Combined Score
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3.5">
        {renderBar(
          'Instance Segmentation Confidence',
          segVal,
          'YOLOv8n-seg mask boundary localization certainty'
        )}
        {renderBar(
          'Health Classification Confidence',
          healthVal,
          'MobileNetV3-Small surface defect assessment'
        )}
        {renderBar(
          'Combined Decision Confidence',
          combVal,
          'Weighted composite certainty for automated triage'
        )}
      </div>

      <div className="flex items-start gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Notice:</strong> Model confidence denotes mathematical neural network softmax certainty on visible features, not empirical validation accuracy or laboratory shelf-life prediction.
        </p>
      </div>
    </div>
  );
};
