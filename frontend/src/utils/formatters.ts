/**
 * Formatting helpers for ONIONVISION dashboard
 */

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatPercent(value?: number | null, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatMm(value?: number | null, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Calibration required';
  }
  return `${value.toFixed(decimals)} mm`;
}

export function formatScore(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${Math.round(value)} / 100`;
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
