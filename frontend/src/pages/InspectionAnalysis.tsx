import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { InspectionProgress } from '../components/inspection/InspectionProgress';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useInspection } from '../hooks/useInspection';

export const InspectionAnalysis: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();

  // If inspection status is pending, trigger process if needed or poll
  const { inspection, loading, error, refetch } = useInspection(inspectionId, true);

  useEffect(() => {
    if (
      inspection &&
      (inspection.status === 'completed' || inspection.status === 'review_required')
    ) {
      const timer = setTimeout(() => {
        navigate(`/inspections/${inspectionId}/results`);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [inspection, inspectionId, navigate]);

  if (loading && !inspection) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header
          title="Inspection Analysis"
          subtitle={`Inspection ID: ${inspectionId}`}
          showBack
          backTo="/"
        />
        <PageContainer>
          <Loading fullPage label="Initializing Computer Vision Execution Pipeline..." />
        </PageContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header
          title="Inspection Analysis"
          subtitle={`Inspection ID: ${inspectionId}`}
          showBack
          backTo="/"
        />
        <PageContainer>
          <ErrorState title="Analysis Failed" message={error} onRetry={refetch} />
        </PageContainer>
      </div>
    );
  }

  const isComplete =
    inspection?.status === 'completed' || inspection?.status === 'review_required';
  const isReview = inspection?.status === 'review_required';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Header
        title="Pipeline Processing"
        subtitle={`Tracking Reference: ${inspectionId}`}
        showBack
        backTo="/"
        action={
          isComplete ? (
            <Link to={`/inspections/${inspectionId}/results`}>
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                View Results
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              icon={<RefreshCw className="w-4 h-4 animate-spin" />}
            >
              Processing
            </Button>
          )
        }
      />

      <PageContainer maxWidth="standard">
        <div className="space-y-6">
          <InspectionProgress status={inspection?.status || 'pending'} />

          {isComplete && (
            <div
              className={`rounded-2xl p-6 text-center space-y-3 border shadow-sm ${
                isReview
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-900 mx-auto shadow-xs">
                {isReview ? (
                  <ShieldAlert className="w-6 h-6 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                All 9 Pipeline Stages Successfully Executed
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Detected{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {inspection?.total_onions ?? 0}
                </strong>{' '}
                individual onion bulbs. Extracted polygon contours, predicted surface health, and computed deterministic grades.
              </p>
              <div className="pt-2">
                <Link to={`/inspections/${inspectionId}/results`}>
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="font-bold shadow-md"
                  >
                    Proceed to Results Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
};
