import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { getReviewStatusBadge } from '../../utils/grading';

interface ConfidenceBadgeProps {
  reviewStatus?: string | null;
  needsReview?: boolean | null;
  qualityConfidence?: number | null;
  segmentationConfidence?: number | null;
  showDetails?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  reviewStatus,
  needsReview,
  qualityConfidence,
  segmentationConfidence,
  showDetails = false,
}) => {
  const badgeInfo = getReviewStatusBadge(reviewStatus, needsReview);

  const getIcon = () => {
    if (reviewStatus === 'AUTO_ACCEPTABLE' && !needsReview) {
      return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (reviewStatus === 'MANUAL_REVIEW_REQUIRED') {
      return <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />;
    }
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
  };

  return (
    <div className="space-y-1">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold tracking-wide border dark:bg-opacity-20 ${badgeInfo.bg}`}
      >
        {getIcon()}
        <span>{badgeInfo.label}</span>
      </div>

      {showDetails && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-0.5 font-mono">
          {segmentationConfidence !== null && segmentationConfidence !== undefined && (
            <div>
              Seg Conf: {(segmentationConfidence * 100).toFixed(1)}%
            </div>
          )}
          {qualityConfidence !== null && qualityConfidence !== undefined && (
            <div>
              Health Conf: {(qualityConfidence * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};
