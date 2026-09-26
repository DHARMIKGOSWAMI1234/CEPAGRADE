import React from 'react';
import {
  Ruler,
  Activity,
  Percent,
  Sparkles,
  ShieldAlert,
  XCircle,
  Info,
  Scale,
  MinusCircle,
  Check,
} from 'lucide-react';
import type { OnionResultResponse } from '../../api/types';
import { getGradeBadge, getQualityBadge } from '../../utils/grading';
import { formatPercent } from '../../utils/formatters';

interface GradingExplainabilityProps {
  onion: OnionResultResponse;
}

export const GradingExplainability: React.FC<GradingExplainabilityProps> = ({ onion }) => {
  const gradeInfo = getGradeBadge(onion.grade);
  const qualityInfo = getQualityBadge(onion.quality_class);

  // Missing data protection
  const sizeMm =
    onion.size_mm !== null && onion.size_mm !== undefined && !isNaN(onion.size_mm)
      ? onion.size_mm
      : null;

  const defectPct =
    onion.defect_area !== null && onion.defect_area !== undefined && !isNaN(onion.defect_area)
      ? onion.defect_area
      : null;

  const confPct =
    onion.confidence !== null && onion.confidence !== undefined && !isNaN(onion.confidence)
      ? onion.confidence
      : null;

  const bd = onion.breakdown;

  // Derive values from breakdown or deterministic fallback rules
  const sizeImpact = bd?.size?.score_impact ?? (
    sizeMm === null ? 0 :
    sizeMm >= 50.0 && sizeMm <= 85.0 ? 0 :
    (sizeMm >= 40.0 && sizeMm < 50.0) || (sizeMm > 85.0 && sizeMm <= 95.0) ? -10.0 :
    (sizeMm >= 30.0 && sizeMm < 40.0) || sizeMm > 95.0 ? -25.0 : -45.0
  );
  const sizeRule = bd?.size?.rule || (
    sizeMm === null ? 'Planar reference required' :
    sizeMm >= 50.0 && sizeMm <= 85.0 ? '50.0 – 85.0 mm (Grade A band)' :
    (sizeMm >= 40.0 && sizeMm < 50.0) || (sizeMm > 85.0 && sizeMm <= 95.0) ? '40.0–50.0 mm or 85.0–95.0 mm (Grade B band)' :
    (sizeMm >= 30.0 && sizeMm < 40.0) || sizeMm > 95.0 ? '30.0–40.0 mm or > 95.0 mm (Grade C band)' :
    '< 30.0 mm (Severely undersized)'
  );
  const sizeResult = bd?.size?.result || (
    sizeMm === null ? 'Not calibrated' :
    sizeMm >= 50.0 && sizeMm <= 85.0 ? 'Optimal diameter' :
    (sizeMm >= 40.0 && sizeMm < 50.0) || (sizeMm > 85.0 && sizeMm <= 95.0) ? 'Acceptable diameter' :
    (sizeMm >= 30.0 && sizeMm < 40.0) || sizeMm > 95.0 ? 'Under / Oversized' :
    'Severely undersized'
  );

  const isUnhealthy = (onion.quality_class || '').toLowerCase() === 'unhealthy';
  const healthImpact = bd?.health?.score_impact ?? (isUnhealthy ? -40.0 : 0.0);
  const healthRule = bd?.health?.result || (isUnhealthy ? 'Visual quality defect detected' : 'Sound visual appearance');
  const healthResult = bd?.health?.result || (isUnhealthy ? 'Defective' : 'Sound');

  const defectImpact = bd?.defects?.score_impact ?? (
    defectPct === null ? 0 :
    defectPct <= 5.0 ? 0 :
    defectPct <= 20.0 ? -15.0 :
    defectPct <= 40.0 ? -30.0 : -50.0
  );
  const defectRule = bd?.defects?.rule || (
    defectPct === null ? 'Surface defect analysis' :
    defectPct <= 5.0 ? '≤ 5.0% surface area' :
    defectPct <= 20.0 ? '5.1% – 20.0% surface area' :
    defectPct <= 40.0 ? '20.1% – 40.0% surface area' :
    '> 40.0% surface area'
  );
  const defectResult = bd?.defects?.result || (
    defectPct === null ? 'Not measured' :
    defectPct <= 5.0 ? 'Negligible defect' :
    defectPct <= 20.0 ? 'Minor defect' :
    defectPct <= 40.0 ? 'Moderate defect' :
    'Severe defect'
  );

  const confNeedsReview = Boolean(onion.needs_review);
  const confImpact = bd?.confidence?.score_impact ?? (confNeedsReview && (confPct ?? 1) < 0.65 ? -15.0 : 0.0);
  const confRule = bd?.confidence?.rule || ((confPct ?? 1) >= 0.65 ? '≥ 65.0% confidence' : '< 65.0% confidence');
  const confResult = bd?.confidence?.result || (
    confNeedsReview ? 'Review recommended' : 'High certainty'
  );

  const computedScore = bd?.final?.quality_score ?? onion.quality_score ?? Math.max(
    0.0,
    Math.min(100.0, 100.0 + sizeImpact + healthImpact + defectImpact + confImpact)
  );

  const totalDeductions = Math.abs(sizeImpact) + Math.abs(healthImpact) + Math.abs(defectImpact) + Math.abs(confImpact);
  const isReject = (onion.grade || '').toLowerCase() === 'reject' || computedScore < 45.0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-6 p-6">
      {/* 1. Header & Quality Score Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-wider uppercase font-bold text-slate-500 dark:text-slate-400">
              Grade Explainability & Traceability
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Why This Grade: {onion.grade || 'Pending Evaluation'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent scoring breakdown based on deterministic rule-based evaluation
          </p>
        </div>

        {/* Quality Score Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block">
              Quality Score
            </span>
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {computedScore.toFixed(0)}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ 100</span>
            </div>
          </div>

          <div className={`px-4 py-3 rounded-xl border font-black text-sm text-center shadow-xs ${gradeInfo.badge}`}>
            {onion.grade || 'Grade C'}
          </div>
        </div>
      </div>

      {/* 2. Disambiguation Banner: Reject vs Review Required */}
      {isReject && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <span className="font-bold text-sm block">Quality Rejection</span>
            <p className="leading-relaxed">
              This produce unit did not meet commercial grade standards. Its quality score fell below the minimum marketable threshold (Score &lt; 45.0) or severe surface defects were identified.
            </p>
          </div>
        </div>
      )}

      {confNeedsReview && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <span className="font-bold text-sm block">Operator Review Recommended</span>
            <p className="leading-relaxed">
              Flagged for visual inspection due to measurement or model uncertainty (e.g. classification confidence below 65%, contour anomaly, or uncalibrated physical scale).
              <strong className="block mt-0.5 font-semibold text-amber-800 dark:text-amber-300">
                Notice: This is an audit verification flag and does NOT imply automatic product rejection.
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* 3. Four Core Physical & Visual Measurements */}
      <div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-2.5">
          Observed Instance Measurements
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Diameter */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Ruler className="w-3.5 h-3.5" /> Diameter
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {sizeMm !== null ? `${sizeMm.toFixed(1)} mm` : <span className="text-amber-600 dark:text-amber-400 text-xs font-normal">Not measured</span>}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {sizeMm !== null ? 'Calibrated physical size' : 'Reference coin required'}
            </span>
          </div>

          {/* Defect Area */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Percent className="w-3.5 h-3.5" /> Defect Area
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {defectPct !== null ? `${defectPct.toFixed(1)}%` : <span className="text-slate-400 text-xs font-normal">Not measured</span>}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Surface blemish extent
            </span>
          </div>

          {/* Health Class */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Activity className="w-3.5 h-3.5" /> Health State
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${qualityInfo.dot}`} />
              <span>{qualityInfo.label || 'Not available'}</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              MobileNetV3 classifier
            </span>
          </div>

          {/* Confidence */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5" /> AI Confidence
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {confPct !== null ? formatPercent(confPct * 100, 1) : <span className="text-slate-400 text-xs font-normal">Not available</span>}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Target certainty threshold &ge; 65%
            </span>
          </div>
        </div>
      </div>

      {/* 4. Structured Score Breakdown Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
            Scoring Criteria Breakdown
          </span>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Starting Base: <strong>100.0 pts</strong>
          </span>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
          {/* Criterion: Size / Diameter */}
          <div className="p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 max-w-md">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">Physical Diameter</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
                  ({sizeMm !== null ? `${sizeMm.toFixed(1)} mm` : 'Not calibrated'})
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Rule: {sizeRule} &rarr; <em>{sizeResult}</em>
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {sizeImpact === 0 ? 'No deduction' : `${sizeImpact} pts`}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                  sizeImpact === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {sizeImpact === 0 ? '0.0' : `${sizeImpact.toFixed(1)}`}
              </span>
            </div>
          </div>

          {/* Criterion: Health Classification */}
          <div className="p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 max-w-md">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">Health Classification</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  ({qualityInfo.label || 'Not available'})
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Rule: {healthRule} &rarr; <em>{healthResult}</em>
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {healthImpact === 0 ? 'No deduction' : `${healthImpact} pts`}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                  healthImpact === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {healthImpact === 0 ? '0.0' : `${healthImpact.toFixed(1)}`}
              </span>
            </div>
          </div>

          {/* Criterion: Defect Area */}
          <div className="p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 max-w-md">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">Surface Blemishes</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
                  ({defectPct !== null ? `${defectPct.toFixed(1)}%` : '0.0%'})
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Rule: {defectRule} &rarr; <em>{defectResult}</em>
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {defectImpact === 0 ? 'No deduction' : `${defectImpact} pts`}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                  defectImpact === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {defectImpact === 0 ? '0.0' : `${defectImpact.toFixed(1)}`}
              </span>
            </div>
          </div>

          {/* Criterion: Model Confidence */}
          <div className="p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 max-w-md">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">Inference Confidence</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
                  ({confPct !== null ? `${(confPct * 100).toFixed(1)}%` : 'Not available'})
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Rule: {confRule} &rarr; <em>{confResult}</em>
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {confImpact === 0 ? 'No deduction' : `${confImpact} pts`}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                  confImpact === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {confImpact === 0 ? '0.0' : `${confImpact.toFixed(1)}`}
              </span>
            </div>
          </div>

          {/* Final Score Calculation Row */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-black text-slate-900 dark:text-white text-sm">
                Final Quality Score: {computedScore.toFixed(1)} / 100
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Formula: 100.0 (Base) {totalDeductions > 0 ? `− ${totalDeductions.toFixed(1)} (Total Deductions)` : '− 0.0'} &rarr; Assigned <strong>{onion.grade || 'Grade C'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Result:</span>
              <span className={`text-xs px-3 py-1 rounded-lg font-black border ${gradeInfo.badge}`}>
                {onion.grade || 'Grade C'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Rule Justification Bullet Points (Backend Reasons) */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block">
          Automated Decision Justifications
        </span>
        <ul className="space-y-2 text-xs">
          {onion.reasons && onion.reasons.length > 0 ? (
            onion.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                {reason.toLowerCase().includes('defect') || reason.toLowerCase().includes('undersized') || reason.toLowerCase().includes('unhealthy') ? (
                  <MinusCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{reason}</span>
              </li>
            ))
          ) : (
            <li className="flex items-start gap-2.5 text-slate-600 dark:text-slate-400">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>Standard surface evaluation verified under deterministic quality thresholds.</span>
            </li>
          )}
        </ul>
      </div>

      {/* 6. Honest Disclaimer & Metrology Notice */}
      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>Rule-based grading assessment:</strong> This grade is determined by the CEPA GRADE automated evaluation engine using deterministic diameter, defect area, and health scoring rules. It does not constitute official statutory certification (e.g. AGMARK or NAFED).
        </span>
      </div>
    </div>
  );
};
