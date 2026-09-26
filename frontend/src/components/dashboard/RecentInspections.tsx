import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { InspectionSummary } from '../../api/types';
import { formatDate, formatScore } from '../../utils/formatters';
import { Badge } from '../common/Badge';

interface RecentInspectionsProps {
  inspections: InspectionSummary[];
}

export const RecentInspections: React.FC<RecentInspectionsProps> = ({ inspections }) => {
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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-850 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="py-3 px-4">Inspection</th>
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4 text-center">Onions</th>
            <th className="py-3 px-4 text-center">Quality Score</th>
            <th className="py-3 px-4 text-center">Review</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
          {inspections.map((item) => {
            const isReview = item.status === 'review_required';
            const targetUrl =
              item.status === 'pending'
                ? `/inspections/${item.inspection_id}`
                : `/inspections/${item.inspection_id}/results`;

            return (
              <tr
                key={item.inspection_id}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="py-3.5 px-4 font-mono text-xs text-slate-900 dark:text-white font-bold">
                  <Link
                    to={targetUrl}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                  >
                    {item.inspection_id}
                  </Link>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(item.created_at)}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full font-mono">
                    <Layers className="w-3 h-3 text-slate-500" />
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
                          : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                      }`}
                    >
                      {formatScore(item.quality_score)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {isReview ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="w-3.5 h-3.5" /> Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {getStatusBadge(item.status)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Link
                    to={targetUrl}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline px-2.5 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
