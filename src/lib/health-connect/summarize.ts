import type { PlatformHealthDaily, PlatformHealthMetric } from '@/lib/supabase/database.types';
import { formatMetricValue, metricLabel } from '@/lib/health-connect/format';

export type MetricSeries = {
  metric: PlatformHealthMetric;
  label: string;
  unit: string;
  /** Oldest → newest for charting */
  points: { day: string; value: number }[];
  latest: { day: string; value: number } | null;
  previous: { day: string; value: number } | null;
};

const METRIC_ORDER: PlatformHealthMetric[] = ['steps', 'heart_rate', 'sleep'];

/** Group daily rows into per-metric series (oldest → newest). */
export function buildMetricSeries(rows: PlatformHealthDaily[]): MetricSeries[] {
  const byMetric = new Map<PlatformHealthMetric, PlatformHealthDaily[]>();

  for (const row of rows) {
    const list = byMetric.get(row.metric) ?? [];
    list.push(row);
    byMetric.set(row.metric, list);
  }

  return METRIC_ORDER.map((metric) => {
    const list = (byMetric.get(metric) ?? []).slice().sort((a, b) => a.day.localeCompare(b.day));
    const points = list.map((r) => ({ day: r.day, value: Number(r.value_primary) }));
    const latest = points.length ? points[points.length - 1] : null;
    const previous = points.length > 1 ? points[points.length - 2] : null;
    return {
      metric,
      label: metricLabel(metric),
      unit: list[0]?.unit ?? defaultUnit(metric),
      points,
      latest,
      previous,
    };
  }).filter((s) => s.points.length > 0);
}

function defaultUnit(metric: PlatformHealthMetric) {
  switch (metric) {
    case 'steps':
      return 'steps';
    case 'heart_rate':
      return 'bpm';
    case 'sleep':
      return 'min';
  }
}

export function formatDayShort(day: string) {
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return day;
  }
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDelta(
  metric: PlatformHealthMetric,
  latest: number,
  previous: number,
  unit: string
) {
  const delta = latest - previous;
  if (Math.abs(delta) < 0.05) {
    return { text: 'Same as prior day', tone: 'neutral' as const };
  }
  const sign = delta > 0 ? '+' : '−';
  const abs = Math.abs(delta);
  let magnitude: string;
  if (metric === 'sleep') {
    const mins = Math.round(abs);
    magnitude = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  } else if (metric === 'steps') {
    magnitude = Math.round(abs).toLocaleString('en-IN');
  } else {
    magnitude = `${Math.round(abs)} ${unit}`;
  }
  return {
    text: `${sign}${magnitude} vs prior day`,
    tone: (delta > 0 ? 'up' : 'down') as 'up' | 'down',
  };
}

export function formatLatestDisplay(series: MetricSeries) {
  if (!series.latest) {
    return '—';
  }
  return formatMetricValue(series.metric, series.latest.value, series.unit);
}

/** Normalize 0–1 for spark bars; empty → []. */
export function sparkNorms(values: number[]) {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => (v - min) / span);
}
