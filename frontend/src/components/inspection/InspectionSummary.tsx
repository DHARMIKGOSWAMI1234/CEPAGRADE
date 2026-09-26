import React from 'react';
import {
  Layers,
  Heart,
  AlertTriangle,
  Ruler,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import type { InspectionDetailResponse } from '../../api/types';
import { formatPercent, formatScore } from '../../utils/formatters';

interface InspectionSummaryProps {
  inspection: InspectionDetailResponse;
}

export const InspectionSummaryCard: React.FC<InspectionSummaryProps> = ({ inspection }) => {
  const healthyCount = inspection.onions.filter((o) => o.quality_class === 'Healthy').length;
  const unhealthyCount = inspection.onions.filter((o) => o.quality_class === 'Unhealthy').length;
  const reviewRequiredCount = inspection.onions.filter((o) => o.needs_review).length;
  const totalOnions = inspection.total_onions ?? inspection.onions.length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-950 text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-300 font-semibold bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-700/50">
              INSPECTION COMPLETE • {inspection.inspection_id}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5 tracking-tight">
            Batch Quality Assessment Overview
          </h2>
          <p className="text-xs text-emerald-200/80 mt-0.5">
            Automated deep vision classification, instance segmentation & deterministic grading
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left md:text-right bg-black/20 dark:bg-black/40 px-4 py-2 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-200 uppercase font-mono tracking-wider">Quality Score</span>
            <div className="text-2xl font-black text-white tracking-tight tabular-nums">
              {formatScore(inspection.quality_score)}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
        {/* Total Onions */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" /> Total Onions
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {totalOnions}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Detected instances</span>
        </div>

        {/* Healthy */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-emerald-500" /> Healthy
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
            {healthyCount}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {totalOnions > 0 ? formatPercent((healthyCount / totalOnions) * 100) : '—'}
          </span>
        </div>

        {/* Unhealthy / Defects */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Unhealthy
          </span>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
            {unhealthyCount}
          </div>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
            {totalOnions > 0 ? formatPercent((unhealthyCount / totalOnions) * 100) : '—'}
          </span>
        </div>

        {/* Average Size */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-slate-400" /> Average Size
          </span>
          <div className="mt-2">
            {inspection.average_size_mm !== null && inspection.average_size_mm !== undefined ? (
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums font-mono">
                {inspection.average_size_mm.toFixed(1)}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">mm</span>
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded inline-block">
                Uncalibrated
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
            {inspection.average_size_mm !== null ? 'Calibrated physical size' : 'Reference coin required'}
          </span>
        </div>

        {/* Defect Rate */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-slate-400" /> Defect Rate
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums font-mono">
            {formatPercent(inspection.defect_rate)}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Batch defect percentage</span>
        </div>

        {/* Review Required */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Review Queue
          </span>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
            {reviewRequiredCount}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {reviewRequiredCount > 0 ? 'Requires human verification' : 'Auto acceptable'}
          </span>
        </div>
      </div>

      {/* Metrology Disclaimer Banner */}
      {inspection.average_size_mm === null && (
        <div className="px-6 py-2.5 bg-amber-50/70 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>
            <strong>Physical calibration notice:</strong> Reference coin was not specified or detected. Morphometry dimensions are reported in sensor pixels.
          </span>
        </div>
      )}
    </div>
  );
};
