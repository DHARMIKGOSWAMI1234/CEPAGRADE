import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  X,
  Ruler,
  Sparkles,
  Layers,
  ShieldAlert,
  Info,
  Activity,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { ConfidenceMeter } from '../components/common/ConfidenceMeter';
import { getSingleOnion } from '../api/inspections';
import { getAssetUrl } from '../api/client';
import { getGradeBadge, getQualityBadge, getVarietyStyle } from '../utils/grading';
import { formatPercent } from '../utils/formatters';
import { GradingExplainability } from '../components/inspection/GradingExplainability';
import type { OnionResultResponse } from '../api/types';

interface OnionDetailViewProps {
  onion: OnionResultResponse;
  inspectionId: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const OnionDetailView: React.FC<OnionDetailViewProps> = ({
  onion,
  inspectionId,
  onClose,
  isModal = false,
}) => {
  const gradeInfo = getGradeBadge(onion.grade);
  const qualityInfo = getQualityBadge(onion.quality_class);
  const varietyInfo = getVarietyStyle(onion.variety);

  const cropUrl = onion.crop_url ? getAssetUrl(onion.crop_url) : null;
  const maskUrl = onion.mask_url ? getAssetUrl(onion.mask_url) : null;
  const morph = onion.morphometry;

  return (
    <div className={`space-y-6 ${isModal ? 'p-6' : ''}`}>
      {/* Top Header: Onion #01 & Grade */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Onion #{onion.onion_number}
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${varietyInfo.pill}`}
            >
              {varietyInfo.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Inspection Batch Reference: {inspectionId}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onion.quality_score !== null && onion.quality_score !== undefined && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block">
                Quality Score
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                {onion.quality_score.toFixed(0)}/100
              </span>
            </div>
          )}
          <span
            className={`text-base px-3.5 py-1 rounded-xl font-black border shadow-xs ${gradeInfo.badge}`}
          >
            {onion.grade || '—'}
          </span>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Visual: Original Crop vs Masked Crop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Crop */}
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-center">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2 px-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Original RGB Crop
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Bounding Box</span>
          </div>
          <div className="h-60 bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden">
            {cropUrl ? (
              <img
                src={cropUrl}
                alt={`Onion #${onion.onion_number} Original Crop`}
                className="max-h-full max-w-full object-contain p-2"
              />
            ) : (
              <span className="text-slate-500 text-xs font-mono">Original Crop Image</span>
            )}
          </div>
        </div>

        {/* Masked Crop */}
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-center">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2 px-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Isolated Masked Bulb
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Background Zeroed</span>
          </div>
          <div className="h-60 bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden">
            {maskUrl ? (
              <img
                src={maskUrl}
                alt={`Onion #${onion.onion_number} Masked Bulb`}
                className="max-h-full max-w-full object-contain p-2"
              />
            ) : (
              <span className="text-slate-500 text-xs font-mono">Segmented Mask Image</span>
            )}
          </div>
        </div>
      </div>

      {/* Quality & Confidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quality Assessment Card */}
        <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Surface Quality Analysis
            </span>
            <span className="text-[10px] font-mono text-slate-400">MobileNetV3</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${qualityInfo.dot}`} />
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {qualityInfo.label}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Confidence: {onion.confidence ? formatPercent(onion.confidence * 100, 1) : '—'}
            </span>
          </div>

          {onion.needs_review && (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Review recommended: confidence below high-certainty operational threshold.</span>
            </div>
          )}
        </div>

        {/* Model Confidence Breakdown Meter */}
        <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <ConfidenceMeter
            segmentation={onion.segmentation_confidence ?? null}
            health={onion.quality_confidence ?? onion.confidence ?? null}
            combined={onion.confidence ?? null}
          />
        </div>
      </div>

      {/* Geometry: Distinct Separation of Pixel Measurements vs Calibrated Physical Measurements */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Geometric Morphometry Analysis
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            Contour & Bounding Box
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Calibrated Physical Measurements Section */}
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold block mb-2">
              Calibrated Physical Measurements
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 block">
                  Physical Equivalent Diameter
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1 block">
                  {onion.size_mm !== null && onion.size_mm !== undefined
                    ? `${onion.size_mm.toFixed(1)} mm`
                    : 'Calibration required'}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {onion.size_mm !== null
                    ? 'Derived from reference disc pixel-to-millimeter ratio'
                    : 'Requires planar coin or calibration disc in capture'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Surface Defect Area (%)
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-1 block">
                  {onion.defect_area !== null && onion.defect_area !== undefined
                    ? `${onion.defect_area.toFixed(1)}%`
                    : '0.0%'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Calculated surface blemish extent
                </span>
              </div>
            </div>
          </div>

          {/* Raw Pixel Measurements Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-2">
              Sensor Pixel Measurements (Camera Coordinate Frame)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Area</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.area_pixels ? `${Math.round(morph.area_pixels).toLocaleString()} px²` : '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Perimeter</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.perimeter_pixels ? `${morph.perimeter_pixels.toFixed(1)} px` : '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Equivalent Diameter</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.equivalent_diameter_pixels
                    ? `${morph.equivalent_diameter_pixels.toFixed(1)} px`
                    : '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Circularity (4πA/P²)</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.circularity ? morph.circularity.toFixed(3) : '—'}
                </span>
                <span className="text-[10px] text-slate-400">1.0 = perfect circle</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Aspect Ratio</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.aspect_ratio ? morph.aspect_ratio.toFixed(2) : '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Major Axis</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.major_axis_pixels ? `${morph.major_axis_pixels.toFixed(1)} px` : '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Minor Axis</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.minor_axis_pixels ? `${morph.minor_axis_pixels.toFixed(1)} px` : '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block">Solidity</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {morph?.solidity ? morph.solidity.toFixed(3) : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Metrology distinction:</strong> Pixel measurements represent camera grid units. Physical millimetres are converted strictly through planar optical scale calibration.
            </span>
          </div>
        </div>
      </div>

      {/* Structured Explainability & Traceability Breakdown */}
      <GradingExplainability onion={onion} />
    </div>
  );
};

// Modal Wrapper for inline display
interface OnionDetailModalProps {
  onion: OnionResultResponse;
  inspectionId: string;
  onClose: () => void;
}

export const OnionDetailModal: React.FC<OnionDetailModalProps> = ({
  onion,
  inspectionId,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <OnionDetailView
          onion={onion}
          inspectionId={inspectionId}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};

// Dedicated Page View Route (/inspections/:inspectionId/onions/:onionId)
export const OnionDetailPage: React.FC = () => {
  const { inspectionId, onionId } = useParams<{ inspectionId: string; onionId: string }>();
  const [onion, setOnion] = useState<OnionResultResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inspectionId || !onionId) return;
    const fetchOnion = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSingleOnion(inspectionId, parseInt(onionId, 10));
        setOnion(data);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || err?.message || 'Onion details could not be retrieved.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchOnion();
  }, [inspectionId, onionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header
          title="Onion Instance Details"
          subtitle={`Inspection: ${inspectionId}`}
          showBack
          backTo={`/inspections/${inspectionId}/results`}
        />
        <PageContainer>
          <Loading fullPage label="Retrieving Onion Morphometry..." />
        </PageContainer>
      </div>
    );
  }

  if (error || !onion) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header
          title="Onion Instance Details"
          subtitle={`Inspection: ${inspectionId}`}
          showBack
          backTo={`/inspections/${inspectionId}/results`}
        />
        <PageContainer>
          <ErrorState
            title="Onion Not Found"
            message={error || 'Unable to find onion record.'}
          />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Header
        title={`Onion #${onion.onion_number} Morphometry`}
        subtitle={`Inspection Batch: ${inspectionId}`}
        showBack
        backTo={`/inspections/${inspectionId}/results`}
      />
      <PageContainer maxWidth="standard">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
          <OnionDetailView onion={onion} inspectionId={inspectionId!} isModal={false} />
        </div>
      </PageContainer>
    </div>
  );
};
