import { useState, useEffect, useCallback, useRef } from 'react';
import { getInspection, processInspection } from '../api/inspections';
import type { InspectionDetailResponse } from '../api/types';

export function useInspection(inspectionId?: string, autoTriggerProcess: boolean = false, referenceDiameterMm?: number) {
  const [inspection, setInspection] = useState<InspectionDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const isTriggeredRef = useRef<boolean>(false);

  const fetchInspection = useCallback(async () => {
    if (!inspectionId) return;
    try {
      const data = await getInspection(inspectionId);
      setInspection(data);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load inspection details');
      return null;
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    if (!inspectionId) return;

    let isMounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      // If requested, trigger process on mount if not already triggered
      if (autoTriggerProcess && !isTriggeredRef.current) {
        isTriggeredRef.current = true;
        try {
          const processed = await processInspection(inspectionId, referenceDiameterMm);
          if (isMounted) {
            setInspection(processed);
            setLoading(false);
            return;
          }
        } catch (err: any) {
          if (isMounted) {
            setError(err?.response?.data?.detail || err?.message || 'Failed to process inspection');
            setLoading(false);
          }
        }
      }

      // Initial fetch
      const current = await fetchInspection();

      // If pending, poll every 2 seconds
      if (current && current.status === 'pending') {
        timerRef.current = setInterval(async () => {
          if (!isMounted) return;
          const pollResult = await fetchInspection();
          if (pollResult && pollResult.status !== 'pending') {
            clearInterval(timerRef.current);
          }
        }, 2000);
      }
    };

    run();

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [inspectionId, autoTriggerProcess, referenceDiameterMm, fetchInspection]);

  return {
    inspection,
    loading,
    error,
    refetch: fetchInspection,
  };
}
