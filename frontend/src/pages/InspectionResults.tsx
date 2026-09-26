import React, { useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  FileText,
  RotateCcw,
  Sparkles,
  BarChart2,
  Layers,
  ShieldAlert,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { MetricCard } from '../components/common/MetricCard';
import { InspectionSummaryCard } from '../components/inspection/InspectionSummary';
import { SegmentationViewer } from '../components/inspection/SegmentationViewer';
import { OnionGrid } from '../components/inspection/OnionGrid';
import { GradeDistributionChart } from '../components/charts/GradeDistribution';
import { QualityDistributionChart } from '../components/charts/QualityDistribution';
import { SizeDistributionChart } from '../components/charts/SizeDistribution';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { OnionDetailModal } from './OnionDetail';
import { useInspection } from '../hooks/useInspection';
import { getAssetUrl } from '../api/client';
import { formatPercent } from '../utils/formatters';
import type { OnionResultResponse } from '../api/types';
import type { LayoutContextType } from '../components/layout/AppLayout';

export const InspectionResults: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { inspection, loading, error, refetch } = useInspection(inspectionId, false);
  const [selectedOnion, setSelectedOnion] = useState<OnionResultResponse | null>(null);
  const outletContext = useOutletContext<LayoutContextType | undefined>();

  if (loading && !inspection) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col">
        <Header
          title="Inspection Results"
          subtitle={`Inspection ID: ${inspectionId}`}
          showBack
          backTo="/history"
          onOpenMobileMenu={outletContext?.openMobileMenu}
        />
        <PageContainer>
          <Loading fullPage label="Retrieving Batch Inspection Intelligence..." />
        </PageContainer>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col">
        <Header
          title="Inspection Results"
          subtitle={`Inspection ID: ${inspectionId}`}
          showBack
          backTo="/history"
          onOpenMobileMenu={outletContext?.openMobileMenu}
        />
        <PageContainer>
          <ErrorState
            title="Inspection Unavailable"
            message={error || "We couldn't load this inspection."}
            onRetry={refetch}
          />
        </PageContainer>
      </div>
    );
  }

  const healthyCount = inspection.onions.filter((o) => o.quality_class === 'Healthy').length;
  const unhealthyCount = inspection.onions.filter((o) => o.quality_class === 'Unhealthy').length;
  const reviewQueueOnions = inspection.onions.filter((o) => o.needs_review);

  const sizesMm = inspection.onions
    .map((o) => o.size_mm)
    .filter((s): s is number => s !== null && s !== undefined);

  const gradeDist = inspection.grade_distribution || {
    A: inspection.onions.filter((o) => o.grade === 'Grade A').length,
    B: inspection.onions.filter((o) => o.grade === 'Grade B').length,
    C: inspection.onions.filter((o) => o.grade === 'Grade C').length,
    Reject: inspection.onions.filter((o) => o.grade === 'Reject').length,
  };

  const acceptedCount = (gradeDist.A || 0) + (gradeDist.B || 0);
  const rejectCount = gradeDist.Reject || 0;
  const reviewCount = reviewQueueOnions.length;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Header
        title="Inspection Results"
        subtitle={`Inspection Batch: ${inspection.inspection_id}`}
        showBack
        backTo="/history"
        onOpenMobileMenu={outletContext?.openMobileMenu}
        action={
          <div className="flex items-center gap-2">
            <Link to={`/inspections/${inspectionId}/report`}>
              <Button
                variant="outline"
                size="sm"
                icon={<FileText className="w-4 h-4" />}
              >
                Inspection Report
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <PageContainer maxWidth="wide">
        <div className="space-y-8">
          {/* Executive Overview KPI Quad: Total Analyzed, Accepted, Review, Reject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Analyzed"
              value={inspection.total_onions || 0}
              subtext="Detected produce units"
              icon={<Layers className="w-5 h-5" />}
              variant="default"
            />
            <MetricCard
              title="Accepted"
              value={acceptedCount}
              subtext="Grade A & Grade B produce"
              icon={<CheckCircle className="w-5 h-5" />}
              variant="emerald"
            />
            <MetricCard
              title="Review Required"
              value={reviewCount}
              subtext="Requires operator triage"
              icon={<AlertTriangle className="w-5 h-5" />}
              variant={reviewCount > 0 ? 'amber' : 'default'}
            />
            <MetricCard
              title="Reject"
              value={rejectCount}
              subtext="Sub-standard / Defective"
              icon={<XCircle className="w-5 h-5" />}
              variant={rejectCount > 0 ? 'rose' : 'default'}
            />
          </div>

          {/* High-Level Result Assessment Hero Card */}
          <InspectionSummaryCard inspection={inspection} />

          {/* Visual Inspection Area: Split View Original vs AI Segmentation */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  Visual Inspection Area
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Dual-panel comparison of raw optical capture versus real YOLOv8n-seg polygon masks
                </p>
              </div>
            </div>

            <SegmentationViewer
              originalImageUrl={inspection.image_url || `/api/inspections/${inspectionId}/image`}
              overlayImageUrl={inspection.overlay_url || `/api/inspections/${inspectionId}/overlay`}
              totalOnions={inspection.total_onions}
            />
          </section>

          {/* Dedicated Operator Review Queue (Displayed if any onion requires human attention) */}
          {reviewQueueOnions.length > 0 && (
            <section className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-6 shadow-soft-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-950 dark:text-amber-200">
                      Needs Review ({reviewQueueOnions.length} Onions)
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 max-w-2xl leading-relaxed">
                      These produce units require human verification because classification confidence or scale conditions triggered review engine safety thresholds.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviewQueueOnions.map((o) => {
                    const cropUrl = o.crop_url ? getAssetUrl(o.crop_url) : null;
                    return (
                      <div
                        key={o.id || o.onion_number}
                        className="bg-white dark:bg-[#0D0D0F] rounded-xl p-4 border border-amber-200 dark:border-amber-800/80 shadow-soft-sm flex gap-3.5 items-center"
                      >
                        {/* Crop preview */}
                        <div className="w-20 h-20 bg-zinc-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                          {cropUrl ? (
                            <img
                              src={cropUrl}
                              alt={`Onion #${o.onion_number}`}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-500">#{o.onion_number}</span>
                          )}
                        </div>

                        {/* Details & Actions */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              Onion #{o.onion_number}
                            </span>
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              {o.grade || 'Review'}
                            </span>
                          </div>

                          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium truncate">
                            {o.reasons && o.reasons.length > 0 ? o.reasons[0] : 'Low classification confidence'}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                            <span>
                              Confidence: <strong className="text-zinc-700 dark:text-zinc-200 font-mono">{o.confidence ? formatPercent(o.confidence * 100, 1) : '—'}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedOnion(o)}
                              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> Inspect
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Batch Intelligence Panel: 3 Clean Analytics Charts */}
          <section className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-500" />
                Batch Intelligence Panel
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Quality composition, prototype grade allocation, and physical size metrics
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card
                title="Grade Distribution"
                subtitle="Automated prototype rule breakdown"
              >
                <GradeDistributionChart distribution={gradeDist} />
              </Card>

              <Card
                title="Health Classification"
                subtitle="MobileNetV3 Healthy vs Unhealthy ratio"
              >
                <QualityDistributionChart
                  healthyCount={healthyCount}
                  unhealthyCount={unhealthyCount}
                />
              </Card>

              <Card
                title="Size Distribution"
                subtitle="Physical diameter histogram (mm)"
              >
                <SizeDistributionChart sizesMm={sizesMm} />
              </Card>
            </div>
          </section>

          {/* Individual Onion Inspection Area */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-500" />
                  Individual Onion Inspection ({inspection.onions.length})
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select any onion tile to inspect dual crops, geometric morphometry, and grading rationale
                </p>
              </div>
            </div>

            <OnionGrid
              onions={inspection.onions}
              onSelectOnion={(onion) => setSelectedOnion(onion)}
            />
          </section>
        </div>
      </PageContainer>

      {/* Individual Onion Detail Modal */}
      {selectedOnion && (
        <OnionDetailModal
          onion={selectedOnion}
          inspectionId={inspection.inspection_id}
          onClose={() => setSelectedOnion(null)}
        />
      )}
    </div>
  );
};
