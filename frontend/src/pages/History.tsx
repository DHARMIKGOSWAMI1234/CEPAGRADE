import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  Calendar,
  Layers,
  FileText,
  ArrowRight,
  RefreshCw,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useInspections } from '../hooks/useInspections';
import { formatDate, formatPercent, formatScore } from '../utils/formatters';
import type { LayoutContextType } from '../components/layout/AppLayout';

export const History: React.FC = () => {
  const { inspections, loading, error, refetch } = useInspections(0, 100);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const navigate = useNavigate();
  const outletContext = useOutletContext<LayoutContextType | undefined>();

  // Filter
  const filtered = inspections.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      return (
        item.inspection_id.toLowerCase().includes(q) ||
        (item.status && item.status.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort by date
  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? db - da : da - db;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="emerald" dot>Completed</Badge>;
      case 'review_required':
        return <Badge variant="amber" dot>Needs Review</Badge>;
      case 'pending':
        return <Badge variant="blue" dot>Processing</Badge>;
      case 'failed':
        return <Badge variant="rose" dot>Failed</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Header
        title="Inspection History"
        subtitle="Traceable chronological record of optical quality inspections and grading batches"
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
          {/* Controls Bar */}
          <div className="bg-zinc-50 dark:bg-[#0D0D0F] rounded-2xl border border-zinc-200/90 dark:border-[#27272A] p-4 shadow-soft-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Inspection ID..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 font-medium"
              />
            </div>

            {/* Filters and Sorting */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1 bg-white dark:bg-[#121214] p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                {(['ALL', 'completed', 'review_required', 'pending', 'failed'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        statusFilter === st
                          ? 'bg-brand-500 text-white shadow-xs font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              >
                Date {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <Card padding="none" className="overflow-hidden">
            {loading && inspections.length === 0 ? (
              <div className="p-12">
                <Loading label="Querying historical inspection ledger..." />
              </div>
            ) : error ? (
              <div className="p-8">
                <ErrorState
                  title="Failed to Load History"
                  message={error}
                  onRetry={refetch}
                />
              </div>
            ) : sorted.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={Inbox}
                  title="No inspection records found"
                  description={
                    searchTerm || statusFilter !== 'ALL'
                      ? 'No inspections matched your filter criteria.'
                      : 'You have not performed any inspections yet. Create your first automated quality scan now.'
                  }
                  actionText={searchTerm || statusFilter !== 'ALL' ? 'Clear Filters' : '+ Start New Inspection'}
                  onAction={
                    searchTerm || statusFilter !== 'ALL'
                      ? () => {
                          setSearchTerm('');
                          setStatusFilter('ALL');
                        }
                      : () => navigate('/new')
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-[#27272A] bg-zinc-50 dark:bg-[#0D0D0F] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Inspection ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-center">Produce Units</th>
                      <th className="py-3 px-4 text-center">Quality Score</th>
                      <th className="py-3 px-4 text-center">Defect Rate</th>
                      <th className="py-3 px-4 text-center">Triage</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-[#27272A]">
                    {sorted.map((item) => {
                      const isReview = item.status === 'review_required';
                      const targetUrl = `/inspections/${item.inspection_id}/results`;
                      return (
                        <tr
                          key={item.inspection_id}
                          className="hover:bg-zinc-50 dark:hover:bg-[#121214] transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono text-xs text-zinc-900 dark:text-zinc-100 font-bold">
                            <Link
                              to={targetUrl}
                              className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
                            >
                              {item.inspection_id}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              {formatDate(item.created_at)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-[#18181B] px-2.5 py-0.5 rounded-full font-mono">
                              <Layers className="w-3 h-3 text-zinc-400" />
                              {item.total_onions ?? '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-xs tabular-nums">
                            {item.quality_score !== null && item.quality_score !== undefined ? (
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold ${
                                  item.quality_score >= 80
                                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                                    : item.quality_score >= 60
                                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                                    : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40'
                                }`}
                              >
                                {formatScore(item.quality_score)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono">
                            {formatPercent(item.defect_rate)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isReview ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <ShieldAlert className="w-3.5 h-3.5" /> Required
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={targetUrl}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2.5 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/40"
                              >
                                <span>Results</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              <Link
                                to={`/inspections/${item.inspection_id}/report`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:underline px-2.5 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#18181B]"
                              >
                                <FileText className="w-3 h-3 text-zinc-400" />
                                <span>Report</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </PageContainer>
    </div>
  );
};
