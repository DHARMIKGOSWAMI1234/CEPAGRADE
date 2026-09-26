import React from 'react';
import { ArrowRight, Ruler, ShieldCheck, Eye } from 'lucide-react';
import type { OnionResultResponse } from '../../api/types';
import { getAssetUrl } from '../../api/client';
import { getGradeBadge, getQualityBadge, getVarietyStyle } from '../../utils/grading';
import { formatMm } from '../../utils/formatters';
import { ConfidenceBadge } from './ConfidenceBadge';

interface OnionCardProps {
  onion: OnionResultResponse;
  onClick?: () => void;
}

export const OnionCard: React.FC<OnionCardProps> = ({ onion, onClick }) => {
  const gradeInfo = getGradeBadge(onion.grade);
  const qualityInfo = getQualityBadge(onion.quality_class);
  const varietyInfo = getVarietyStyle(onion.variety);

  const cropSrc = onion.crop_url ? getAssetUrl(onion.crop_url) : null;

  // Derive triple confidences
  const segConf = onion.segmentation_confidence !== null && onion.segmentation_confidence !== undefined
    ? Math.round(onion.segmentation_confidence * 100)
    : null;
  const healthConf = onion.quality_confidence !== null && onion.quality_confidence !== undefined
    ? Math.round(onion.quality_confidence * 100)
    : (onion.confidence ? Math.round(onion.confidence * 100) : null);
  const combConf = segConf !== null && healthConf !== null
    ? Math.round((segConf + healthConf) / 2)
    : (healthConf ?? segConf);

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft-sm hover:shadow-soft-md hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-all duration-200 cursor-pointer flex flex-col group"
    >
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-900 dark:text-white text-sm font-mono tracking-tight">
            #{String(onion.onion_number).padStart(2, '0')}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${varietyInfo.pill}`}>
            {varietyInfo.label}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${gradeInfo.badge}`}>
          {onion.grade || 'Grade C'}
        </span>
      </div>

      {/* Visual Crop Surface */}
      <div className="h-44 bg-slate-950 flex items-center justify-center overflow-hidden relative select-none">
        {cropSrc ? (
          <img
            src={cropSrc}
            alt={`Onion #${onion.onion_number} visual crop`}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="text-slate-500 text-xs flex flex-col items-center gap-1 font-mono">
            <span>Crop #{onion.onion_number}</span>
            <span className="text-[10px] text-slate-600">Bounding Box Detected</span>
          </div>
        )}

        {/* Quality status overlay tag */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border flex items-center gap-1.5 shadow-sm ${qualityInfo.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${qualityInfo.dot}`} />
            {qualityInfo.label}
          </span>
        </div>

        {/* Combined Confidence Tag */}
        {combConf !== null && (
          <div className="absolute bottom-2.5 right-2.5 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-mono border border-slate-700/60 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-brand-400" />
            <span>{combConf}%</span>
          </div>
        )}
      </div>

      {/* Card Content & Metrics */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
        {/* Physical Dimension vs Pixel Size */}
        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Ruler className="w-3.5 h-3.5 text-slate-400" />
            Size
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            {onion.size_mm !== null && onion.size_mm !== undefined ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatMm(onion.size_mm)}</span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 text-[11px] font-normal">Calibration required</span>
            )}
          </span>
        </div>

        {/* Confidence Triple Grid */}
        <div className="grid grid-cols-3 gap-1.5 text-center py-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Seg</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {segConf !== null ? `${segConf}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Health</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {healthConf !== null ? `${healthConf}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Combined</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {combConf !== null ? `${combConf}%` : '—'}
            </span>
          </div>
        </div>

        {/* Review Status */}
        <div>
          <ConfidenceBadge
            reviewStatus={onion.review_status}
            needsReview={onion.needs_review}
          />
        </div>

        {/* Action Button */}
        <div className="pt-1 flex items-center justify-between text-brand-700 dark:text-brand-400 font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            View Details
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
