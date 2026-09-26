import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  FileText,
  Download,
  ExternalLink,
  Calendar,
  Layers,
  Award,
  RefreshCw,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useInspections } from '../hooks/useInspections';
import { formatDate, formatScore } from '../utils/formatters';
import type { LayoutContextType } from '../components/layout/AppLayout';

export const Reports: React.FC = () => {
  const { inspections, loading, error, refetch } = useInspections(0, 50);
  const outletContext = useOutletContext<LayoutContextType | undefined>();

  const completedInspections = inspections.filter(
    (i) => i.status === 'completed' || i.status === 'review_required'
  );

  const handleDownloadPdf = (inspectionId: string) => {
    const downloadUrl = `/api/inspections/${inspectionId}/report/pdf`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `ONIONVISION_Report_${inspectionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPdf = (inspectionId: string) => {
    window.open(`/api/inspections/${inspectionId}/report/pdf`, '_blank');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Header
        title="Report Center"
        subtitle="Download, print and preview official ReportLab PDF quality assessment documents"
        onOpenMobileMenu={outletContext?.openMobileMenu}
        action={
          <div className="flex items-center gap-2">
            <Link to="/new">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                className="font-semibold shadow-xs"
              >
                + New Inspection
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <PageContainer maxWidth="wide">
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] rounded-2xl p-6 shadow-soft-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 rounded-full border border-brand-200 dark:border-brand-900">
                  Official Document Repository
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  PDF Verification Ready
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-2">
                Batch Quality & Traceability Certificates
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Generate and export standardized inspection summaries containing multi-stage vision metrics,
                defect rates, calibrated millimeter sizes, and deterministic prototype grade allocations.
              </p>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono bg-white dark:bg-[#121214] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0">
              Report Engine: ReportLab 5.0 (Offline)
            </div>
          </div>

          {loading ? (
            <Loading label="Loading inspection documents..." />
          ) : error ? (
            <ErrorState title="Report Center Error" message={error} onRetry={refetch} />
          ) : completedInspections.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No inspection reports available"
              description="Complete an inspection to generate exportable PDF quality assessments and batch traceability reports."
              actionText="+ Start New Inspection"
              onAction={() => window.location.assign('/new')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {completedInspections.map((item) => (
                <div
                  key={item.inspection_id}
                  className="bg-white dark:bg-[#0D0D0F] rounded-2xl border border-zinc-200/90 dark:border-[#27272A] p-5 shadow-soft-sm hover:shadow-soft-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Ref & Score */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-[#18181B] px-2.5 py-1 rounded-lg">
                        {item.inspection_id}
                      </span>
                      {item.quality_score !== null && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          Score: {formatScore(item.quality_score)}
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Generated: {formatDate(item.completed_at || item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Total Sample: {item.total_onions ?? '—'} Produce Units</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-zinc-400" />
                        <span>
                          Status: <strong className="uppercase text-zinc-700 dark:text-zinc-300">{item.status.replace('_', ' ')}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-[#27272A] flex items-center justify-between gap-2">
                    <Link
                      to={`/inspections/${item.inspection_id}/report`}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Preview Sheet
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownloadPdf(item.inspection_id)}
                        icon={<Download className="w-3.5 h-3.5" />}
                        title="Download PDF report directly"
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPdf(item.inspection_id)}
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        title="Open PDF report in new browser tab"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
};
