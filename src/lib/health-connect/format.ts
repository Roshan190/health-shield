import type { PlatformHealthMetric } from '@/lib/supabase/database.types';

export function metricLabel(metric: PlatformHealthMetric) {
  switch (metric) {
    case 'steps':
      return 'Steps';
    case 'heart_rate':
      return 'Heart rate';
    case 'sleep':
      return 'Sleep';
    default:
      return metric;
  }
}

export function formatMetricValue(metric: PlatformHealthMetric, value: number, unit: string) {
  if (metric === 'sleep') {
    const hours = Math.floor(value / 60);
    const mins = Math.round(value % 60);
    if (hours <= 0) {
      return `${mins} min`;
    }
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (metric === 'steps') {
    return `${Math.round(value).toLocaleString('en-IN')} ${unit}`;
  }
  return `${Math.round(value)} ${unit}`;
}

export function formatSyncedAt(iso: string | null) {
  if (!iso) {
    return 'Never synced';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Never synced';
  }
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
