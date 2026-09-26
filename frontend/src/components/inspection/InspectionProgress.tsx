import React from 'react';
import {
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  ShieldAlert,
  FileCheck,
  Scan,
  Coins,
  Crop,
  Ruler,
  Activity,
  Sliders,
  Award,
  Database,
} from 'lucide-react';

interface InspectionProgressProps {
  status: 'pending' | 'completed' | 'review_required' | 'failed';
  errorMessage?: string;
}

export const InspectionProgress: React.FC<InspectionProgressProps> = ({
  status,
  errorMessage,
}) => {
  const stages = [
    {
      id: 1,
      name: 'Image Validation',
      desc: 'Resolution, optical format & color-space verification',
      icon: FileCheck,
    },
    {
      id: 2,
      name: 'Segmentation',
      desc: 'YOLOv8n-seg instance polygons & bounding boxes',
      icon: Scan,
    },
    {
      id: 3,
      name: 'Reference Detection',
      desc: 'Planar coin / calibration disc localization',
      icon: Coins,
    },
    {
      id: 4,
      name: 'Onion Extraction',
      desc: 'Individual masked bulb isolation & zeroing',
      icon: Crop,
    },
    {
      id: 5,
      name: 'Morphometry',
      desc: 'Area, perimeter, circularity & physical mm scale',
      icon: Ruler,
    },
    {
      id: 6,
      name: 'Quality Classification',
      desc: 'MobileNetV3-Small Healthy vs Unhealthy analysis',
      icon: Activity,
    },
    {
      id: 7,
      name: 'Confidence Review',
      desc: 'Quality threshold evaluation & review triage',
      icon: Sliders,
    },
    {
      id: 8,
      name: 'Grading',
      desc: 'Transparent deterministic prototype rules (Grade A/B/C/Reject)',
      icon: Award,
    },
    {
      id: 9,
      name: 'Persistence',
      desc: 'SQLite batch record creation & report readiness',
      icon: Database,
    },
  ];

  const isCompleted = status === 'completed' || status === 'review_required';
  const isReviewRequired = status === 'review_required';
  const isFailed = status === 'failed';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
      {/* Header with Pipeline Verification Indicator */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-600 dark:text-emerald-400 font-semibold">
            Inspection Pipeline Flow
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {isCompleted
              ? isReviewRequired
                ? 'Pipeline Complete (Review Recommended)'
                : 'Pipeline Execution Complete'
              : isFailed
              ? 'Pipeline Execution Terminated'
              : 'Executing Real Computer Vision Pipeline...'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated multi-stage vision pipeline with real-time model inference and deterministic grading
          </p>
        </div>

        <div className="font-mono text-xs shrink-0">
          {isCompleted ? (
            isReviewRequired ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                VERIFIED • REVIEW QUEUED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ALL STAGES VERIFIED
              </span>
            )
          ) : isFailed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              EXECUTION ERROR
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              RUNNING INFERENCE
            </span>
          )}
        </div>
      </div>

      {/* 9-Stage Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stages.map((stage) => {
          let stageStatus = 'Waiting';
          let borderClass = 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60';
          let titleClass = 'text-slate-700 dark:text-slate-300';
          let iconElement = <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />;

          if (isCompleted) {
            stageStatus = 'Complete';
            borderClass = 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20';
            titleClass = 'text-emerald-950 dark:text-emerald-200';
            iconElement = <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
          } else if (isFailed) {
            stageStatus = 'Failed';
            borderClass = 'border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20';
            titleClass = 'text-rose-950 dark:text-rose-200';
            iconElement = <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
          } else {
            stageStatus = 'Processing';
            borderClass = 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/20 dark:bg-emerald-950/10 animate-pulse';
            titleClass = 'text-slate-900 dark:text-white';
            iconElement = <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin shrink-0" />;
          }

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${borderClass}`}
            >
              <div className="mt-0.5">{iconElement}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs font-semibold ${titleClass} truncate`}>
                    {stage.id}. {stage.name}
                  </p>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
                    {stageStatus}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Details */}
      {errorMessage && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
          <p className="font-semibold text-rose-900 dark:text-rose-200 mb-1">Execution Failure Details:</p>
          <p className="font-mono">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};
