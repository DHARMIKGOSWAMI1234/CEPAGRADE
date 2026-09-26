import { useState, useEffect, useCallback } from 'react';
import { listInspections } from '../api/inspections';
import type { InspectionSummary } from '../api/types';

export function useInspections(skip: number = 0, limit: number = 50) {
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInspections(skip, limit);
      setInspections(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [skip, limit]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Derive genuine stats from real database results
  const totalInspections = inspections.length;
  const totalOnionsInspected = inspections.reduce((sum, item) => sum + (item.total_onions || 0), 0);
  
  const scoredInspections = inspections.filter((i) => i.quality_score !== null && i.quality_score !== undefined);
  const averageQualityScore = scoredInspections.length > 0
    ? scoredInspections.reduce((sum, item) => sum + (item.quality_score || 0), 0) / scoredInspections.length
    : null;

  const reviewRequiredCount = inspections.filter((i) => i.status === 'review_required').length;

  return {
    inspections,
    loading,
    error,
    refetch: fetchInspections,
    stats: {
      totalInspections,
      totalOnionsInspected,
      averageQualityScore,
      reviewRequiredCount,
    },
  };
}
