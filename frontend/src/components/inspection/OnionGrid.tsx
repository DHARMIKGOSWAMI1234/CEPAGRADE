import React, { useState } from 'react';
import { Filter, SlidersHorizontal, ShieldAlert } from 'lucide-react';
import type { OnionResultResponse } from '../../api/types';
import { OnionCard } from './OnionCard';

interface OnionGridProps {
  onions: OnionResultResponse[];
  onSelectOnion: (onion: OnionResultResponse) => void;
}

export const OnionGrid: React.FC<OnionGridProps> = ({ onions, onSelectOnion }) => {
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterReview, setFilterReview] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'number' | 'size' | 'confidence'>('number');

  // Filter
  const filtered = onions.filter((o) => {
    if (filterReview && !o.needs_review) return false;
    if (filterGrade === 'ALL') return true;
    return o.grade === filterGrade;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'size') {
      const sa = a.size_mm ?? a.size_pixels ?? 0;
      const sb = b.size_mm ?? b.size_pixels ?? 0;
      return sb - sa;
    }
    if (sortBy === 'confidence') {
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    }
    return a.onion_number - b.onion_number;
  });

  const gradeCounts = {
    ALL: onions.length,
    'Grade A': onions.filter((o) => o.grade === 'Grade A').length,
    'Grade B': onions.filter((o) => o.grade === 'Grade B').length,
    'Grade C': onions.filter((o) => o.grade === 'Grade C').length,
    Reject: onions.filter((o) => o.grade === 'Reject').length,
  };

  const reviewCount = onions.filter((o) => o.needs_review).length;

  return (
    <div className="space-y-5">
      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['ALL', 'Grade A', 'Grade B', 'Grade C', 'Reject'] as const).map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => setFilterGrade(grade)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterGrade === grade
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {grade === 'ALL' ? 'All Onions' : grade} ({gradeCounts[grade]})
            </button>
          ))}

          {reviewCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterReview(!filterReview)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                filterReview
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Needs Review ({reviewCount})
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="number">Onion Number (#)</option>
            <option value="size">Size (Diameter)</option>
            <option value="confidence">Model Confidence</option>
          </select>
        </div>
      </div>

      {/* Grid or Empty */}
      {sorted.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          No onions match the selected filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((onion) => (
            <OnionCard
              key={onion.id || onion.onion_number}
              onion={onion}
              onClick={() => onSelectOnion(onion)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
