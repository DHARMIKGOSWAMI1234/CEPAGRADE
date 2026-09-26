import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Layers,
  HeartHandshake,
  Award,
  AlertTriangle,
  Plus,
  RefreshCw,
  BarChart3,
  PieChart as PieIcon,
  ArrowRight,
  ShieldCheck,
  PackageOpen,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { MetricCard } from '../components/common/MetricCard';
import { RecentInspections } from '../components/dashboard/RecentInspections';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { GradeDistributionChart } from '../components/charts/GradeDistribution';
import { QualityDistributionChart } from '../components/charts/QualityDistribution';
import { OnboardingTutorial } from '../components/onboarding/OnboardingTutorial';
import { DemoWelcomeModal } from '../components/onboarding/DemoWelcomeModal';
import { useInspections } from '../hooks/useInspections';
import { useAuth } from '../context/AuthContext';
import { formatScore } from '../utils/formatters';
import type { LayoutContextType } from '../components/layout/AppLayout';
import { useSearchParams } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isDemoUser, demoAttempts, maxDemoAttempts } = useAuth();
  const navigate = useNavigate();
  const { inspections, loading, error, refetch, stats } = useInspections();
  const outletContext = useOutletContext<LayoutContextType | undefined>();

  const isDemo = isDemoUser || user?.email === 'operator@cepagrade.ai';

  // Onboarding tutorial state (auto-shown for genuine new permanent users or when ?tour=true)
  const [showTutorial, setShowTutorial] = useState(() => {
    if (isDemo) return false;
    const tourParam = searchParams.get('tour') === 'true';
    const completed = localStorage.getItem('cepagrade_onboarding_completed') === 'true';
    return tourParam || !completed;
  });

  // Demo welcome modal state (shown on first entry to demo session)
  const [showDemoWelcome, setShowDemoWelcome] = useState(() => {
    if (!isDemo) return false;
    return localStorage.getItem('cepagrade_demo_welcomed') !== 'true';
  });

  // Aggregate quality and grade metrics from real historical database records
  const totalGradeDist = { A: 0, B: 0, C: 0, Reject: 0 };
  let totalHealthy = 0;
  let totalUnhealthy = 0;

  inspections.forEach((insp) => {
    if (insp.total_onions) {
      if (insp.defect_rate !== null && insp.defect_rate !== undefined) {
        const unhealthy = Math.round((insp.defect_rate / 100) * insp.total_onions);
        totalUnhealthy += unhealthy;
        totalHealthy += Math.max(0, insp.total_onions - unhealthy);
      } else {
        totalHealthy += insp.total_onions;
      }
    }
    // Estimate grade allocation based on score for macro distribution
    if (insp.quality_score !== null && insp.quality_score !== undefined) {
      if (insp.quality_score >= 80) totalGradeDist.A += insp.total_onions || 1;
      else if (insp.quality_score >= 65) totalGradeDist.B += insp.total_onions || 1;
      else if (insp.quality_score >= 50) totalGradeDist.C += insp.total_onions || 1;
      else totalGradeDist.Reject += insp.total_onions || 1;
    }
  });

  const getRoleHeaderGreeting = () => {
    switch (user?.role) {
      case 'supervisor':
        return 'Facility Quality & Batch Overview';
      case 'inspector':
        return 'Metrology & Technical Analysis Console';
      case 'farmer':
        return 'Produce Harvest & Grading Ledger';
      case 'operator':
      default:
        return 'Ready for your next inspection?';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name || 'Operator'}`}
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
                + Start New Inspection
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
        {loading && inspections.length === 0 ? (
          <Loading fullPage label="Connecting to CEPA GRADE Database..." />
        ) : error ? (
          <ErrorState
            title="Database Connection Offline"
            message={error}
            onRetry={refetch}
          />
        ) : (
          <div className="space-y-6">
            {/* Editorial Hero Banner */}
            <div className="rounded-2xl p-6 sm:p-8 bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all">
              <div className="max-w-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 rounded-full border border-brand-200 dark:border-brand-900">
                    {user?.role ? user.role.toUpperCase() : 'OPERATOR'} WORKSPACE
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">•</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Offline CV Pipeline Active
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {getRoleHeaderGreeting()}
                </h2>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Fast automated segmentation with calibrated scale detection and AI-assisted health classification. Capture images in high-resolution for instant grading certificates.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                <Link to="/new" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<Plus className="w-5 h-5" />}
                    className="w-full sm:w-auto font-bold"
                  >
                    + Start New Inspection
                  </Button>
                </Link>
                <Link to="/history" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto font-medium"
                  >
                    View All Batches
                  </Button>
                </Link>
              </div>
            </div>

            {/* Key KPI Metric Cards (Phase 08.2 Editorial styling) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Batches"
                value={stats.totalInspections}
                subtext={stats.totalInspections === 1 ? '1 batch recorded' : `${stats.totalInspections} batches in ledger`}
                icon={<Layers className="w-5 h-5" />}
                variant="default"
              />
              <MetricCard
                title="Onions Analyzed"
                value={stats.totalOnionsInspected}
                subtext={stats.totalOnionsInspected > 0 ? 'Individual bulbs cataloged' : 'Awaiting initial scan'}
                icon={<Award className="w-5 h-5" />}
                variant="pink"
              />
              <MetricCard
                title="Avg Quality Score"
                value={formatScore(stats.averageQualityScore)}
                subtext="Algorithmic batch mean"
                icon={<HeartHandshake className="w-5 h-5" />}
                variant="emerald"
              />
              <MetricCard
                title="Flagged for Triage"
                value={stats.reviewRequiredCount}
                subtext="Human verification queue"
                icon={<AlertTriangle className="w-5 h-5" />}
                variant={stats.reviewRequiredCount > 0 ? 'amber' : 'default'}
              />
            </div>

            {/* Historical Charts or Empty State */}
            {inspections.length === 0 ? (
              <Card padding="lg" className="border-brand-100 dark:border-brand-950/40">
                <div className="py-10 px-4 text-center max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-soft-sm">
                    <PackageOpen className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      Welcome to CEPA GRADE
                    </h2>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      No inspections yet.
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Start your first inspection to begin.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate('/new')}
                      icon={<Plus className="w-4 h-4" />}
                      className="font-semibold shadow-soft-sm"
                    >
                      Start New Inspection
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                {/* Batch Intelligence Analytics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card
                    title="Grade Distribution"
                    subtitle="Classification breakdown across completed inspections"
                    action={<BarChart3 className="w-4 h-4 text-zinc-400" />}
                  >
                    <div className="h-64">
                      <GradeDistributionChart distribution={totalGradeDist} />
                    </div>
                  </Card>

                  <Card
                    title="Health Ratio"
                    subtitle="Aggregate healthy produce vs. detected anomalies"
                    action={<PieIcon className="w-4 h-4 text-zinc-400" />}
                  >
                    <div className="h-64">
                      <QualityDistributionChart
                        healthyCount={totalHealthy}
                        unhealthyCount={totalUnhealthy}
                      />
                    </div>
                  </Card>
                </div>

                {/* Recent Historical Inspections Table */}
                <Card
                  title="Recent Inspection Batches"
                  subtitle="Latest automated vision records saved to database"
                  action={
                    <Link
                      to="/history"
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <span>Complete Ledger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                >
                  <RecentInspections inspections={inspections.slice(0, 5)} />
                </Card>
              </>
            )}
          </div>
        )}
      </PageContainer>

      {/* Guided First-Time Onboarding Tour */}
      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          if (searchParams.has('tour')) {
            searchParams.delete('tour');
            setSearchParams(searchParams);
          }
        }}
      />

      {/* Lightweight Demo User Welcome Modal */}
      <DemoWelcomeModal
        isOpen={showDemoWelcome}
        onClose={() => {
          localStorage.setItem('cepagrade_demo_welcomed', 'true');
          setShowDemoWelcome(false);
        }}
        attemptsRemaining={Math.max(0, maxDemoAttempts - demoAttempts)}
      />
    </div>
  );
};
