import { toISODate } from '@/lib/dates';
import type { HealthConnectModule } from '@/lib/health-connect/runtime';

export type AggregateGroup = {
  startTime: string;
  endTime: string;
  result: Record<string, unknown>;
};

/**
 * Steps uses LocalDateTime filters for period aggregation in react-native-health-connect.
 * HeartRate / SleepSession still use Instant filters for period, which Android 14+/16 reject
 * with: "Either use TimeRangeFilter with LocalDateTime or AggregateGroupByDurationRequest".
 * Duration aggregation accepts Instant filters — use that for HR/Sleep.
 */
export async function aggregateDailyGroups(
  HC: HealthConnectModule,
  recordType: 'Steps' | 'HeartRate' | 'SleepSession',
  lookbackDays: number
): Promise<AggregateGroup[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (lookbackDays - 1));
  const end = new Date();

  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };

  if (recordType === 'Steps') {
    return HC.aggregateGroupByPeriod({
      recordType,
      timeRangeFilter,
      timeRangeSlicer: { period: 'DAYS', length: 1 },
    }) as Promise<AggregateGroup[]>;
  }

  return HC.aggregateGroupByDuration({
    recordType,
    timeRangeFilter,
    timeRangeSlicer: { duration: 'DAYS', length: 1 },
  }) as Promise<AggregateGroup[]>;
}

export function dayKeyFromAggregateStart(isoOrLocal: string) {
  // Period results may be LocalDateTime ("2026-07-22T00:00"); duration often Instant ISO.
  if (/^\d{4}-\d{2}-\d{2}/.test(isoOrLocal) && !isoOrLocal.includes('Z') && !isoOrLocal.includes('+')) {
    return isoOrLocal.slice(0, 10);
  }
  return toISODate(new Date(isoOrLocal));
}

/** Library exposes SleepSession SLEEP_DURATION_TOTAL in seconds. */
export function sleepMinutesFromSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return Math.round(seconds / 60);
}
