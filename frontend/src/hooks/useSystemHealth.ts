import { useState, useEffect, useCallback } from 'react';
import { checkHealth } from '../api/inspections';
import type { HealthResponse } from '../api/types';

export function useSystemHealth(pollIntervalMs: number = 10000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await checkHealth();
      setHealth(data);
      setIsOnline(data.status === 'healthy' || data.status === 'ok');
    } catch {
      setIsOnline(false);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchHealth, pollIntervalMs]);

  return {
    health,
    isOnline,
    loading,
    refetch: fetchHealth,
  };
}
