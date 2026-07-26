import { Linking } from 'react-native';

import {
  getAppleHealthModule,
  getHealthKitQuery,
  appleHealthUnsupportedReason,
} from '@/lib/apple-health/runtime';
import {
  loadAppleHealthPrefs,
  saveAppleHealthPrefs,
} from '@/lib/apple-health/preferences';
import { toISODate } from '@/lib/dates';
import { getSupabase } from '@/lib/supabase/client';
import type { PlatformHealthMetric } from '@/lib/supabase/database.types';

const LOOKBACK_DAYS = 7;

/** Read-only thin set — mirrors Health Connect (D-011 / slice 2.4). */
const READ_TYPES = ['stepCount', 'heartRate', 'sleepAnalysis'] as const;

/** HKCategoryValueSleepAnalysis: asleep / core / deep / REM (not inBed or awake). */
const SLEEP_ASLEEP_VALUES = new Set([1, 3, 4, 5]);

export type AppleHealthStatus =
  | { kind: 'unsupported'; reason: string }
  | { kind: 'unavailable'; detail: string }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export type DailyAggregate = {
  metric: PlatformHealthMetric;
  day: string;
  value_primary: number;
  unit: string;
};

function lookbackRange() {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (LOOKBACK_DAYS - 1));
  return { start, end };
}

export async function getAppleHealthStatus(): Promise<AppleHealthStatus> {
  const unsupported = appleHealthUnsupportedReason();
  if (unsupported) {
    return { kind: 'unsupported', reason: unsupported };
  }

  const AH = await getAppleHealthModule();
  if (!AH) {
    return {
      kind: 'unavailable',
      detail:
        'Could not load Apple Health. Rebuild with a development client that includes the native module.',
    };
  }

  try {
    if (!AH.isAvailable()) {
      return {
        kind: 'unavailable',
        detail: 'HealthKit is not available on this device.',
      };
    }
    return { kind: 'ready' };
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Apple Health status check failed',
    };
  }
}

export async function connectAppleHealth(): Promise<{
  ok: boolean;
  granted: string[];
  message?: string;
}> {
  const status = await getAppleHealthStatus();
  if (status.kind === 'unsupported') {
    return { ok: false, granted: [], message: status.reason };
  }
  if (status.kind === 'unavailable' || status.kind === 'error') {
    return {
      ok: false,
      granted: [],
      message: status.kind === 'error' ? status.message : status.detail,
    };
  }

  const AH = await getAppleHealthModule();
  if (!AH) {
    return { ok: false, granted: [], message: 'Apple Health module unavailable' };
  }

  try {
    // HealthKit hides read-auth status; completing the sheet is our opt-in signal.
    await AH.requestAuthorization({
      read: [...READ_TYPES],
      write: [],
    });
  } catch (e) {
    return {
      ok: false,
      granted: [],
      message: e instanceof Error ? e.message : 'Authorization failed',
    };
  }

  const prefs = await loadAppleHealthPrefs();
  await saveAppleHealthPrefs({ ...prefs, connected: true });
  return { ok: true, granted: [...READ_TYPES] };
}

/**
 * Clear local opt-in. HealthKit cannot revoke access from the app —
 * user must change Sources in the Health app.
 */
export async function disconnectAppleHealth(): Promise<{ ok: boolean; message?: string }> {
  await saveAppleHealthPrefs({ connected: false, lastSyncedAt: null });
  return {
    ok: true,
    message:
      'Disconnected in HealthShield. To revoke system access, open Health → Sharing → Apps → HealthShield.',
  };
}

export async function openAppleHealthApp() {
  try {
    await Linking.openURL('x-apple-health://');
  } catch {
    // No-op if the URL scheme is unavailable (e.g. Simulator edge cases).
  }
}

async function readDailyAggregates(): Promise<{
  samples: DailyAggregate[];
  metricErrors: string[];
}> {
  const Query = await getHealthKitQuery();
  if (!Query) {
    return { samples: [], metricErrors: ['Native module unavailable'] };
  }

  const { start, end } = lookbackRange();
  const out: DailyAggregate[] = [];
  const metricErrors: string[] = [];

  try {
    const stepStats = await new Query()
      .type('stepCount', 'statistics')
      .dateRange(start, end)
      .aggregations(['cumulativeSum'])
      .interval('day')
      .executeStatistics();
    const rows = Array.isArray(stepStats) ? stepStats : [stepStats];
    for (const row of rows) {
      const total = Number(row.sumQuantity ?? 0);
      if (total <= 0) {
        continue;
      }
      out.push({
        metric: 'steps',
        day: toISODate(new Date(row.startDate)),
        value_primary: Math.round(total),
        unit: 'steps',
      });
    }
  } catch (e) {
    metricErrors.push(`Steps: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const hrStats = await new Query()
      .type('heartRate', 'statistics')
      .dateRange(start, end)
      .aggregations(['discreteAverage'])
      .interval('day')
      .executeStatistics();
    const rows = Array.isArray(hrStats) ? hrStats : [hrStats];
    for (const row of rows) {
      const avg = Number(row.averageQuantity ?? 0);
      if (avg <= 0) {
        continue;
      }
      out.push({
        metric: 'heart_rate',
        day: toISODate(new Date(row.startDate)),
        value_primary: Math.round(avg),
        unit: 'bpm',
      });
    }
  } catch (e) {
    metricErrors.push(`HeartRate: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const sleepSamples = await new Query()
      .type('sleepAnalysis', 'category')
      .dateRange(start, end)
      .ascending(true)
      .execute();

    const minutesByDay = new Map<string, number>();
    for (const sample of sleepSamples) {
      const value = Number(
        'value' in sample ? (sample as { value: number }).value : Number.NaN
      );
      if (!SLEEP_ASLEEP_VALUES.has(value)) {
        continue;
      }
      const startMs = new Date(sample.startDate).getTime();
      const endMs = new Date(sample.endDate).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        continue;
      }
      const minutes = (endMs - startMs) / 60_000;
      // Attribute to the local calendar day of the sleep end (morning).
      const day = toISODate(new Date(sample.endDate));
      minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + minutes);
    }

    for (const [day, minutes] of minutesByDay) {
      const rounded = Math.round(minutes);
      if (rounded <= 0) {
        continue;
      }
      out.push({
        metric: 'sleep',
        day,
        value_primary: rounded,
        unit: 'min',
      });
    }
  } catch (e) {
    metricErrors.push(`Sleep: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { samples: out, metricErrors };
}

/** Pull last 7 days of aggregates and upsert into Supabase. */
export async function syncAppleHealthDaily(userId: string): Promise<{
  ok: boolean;
  upserted: number;
  message?: string;
  samples: DailyAggregate[];
  metricErrors: string[];
}> {
  const prefs = await loadAppleHealthPrefs();
  if (!prefs.connected) {
    return {
      ok: false,
      upserted: 0,
      message: 'Connect Apple Health first',
      samples: [],
      metricErrors: [],
    };
  }

  const status = await getAppleHealthStatus();
  if (status.kind !== 'ready') {
    return {
      ok: false,
      upserted: 0,
      message:
        status.kind === 'unsupported'
          ? status.reason
          : status.kind === 'error'
            ? status.message
            : status.detail,
      samples: [],
      metricErrors: [],
    };
  }

  const { samples, metricErrors } = await readDailyAggregates();
  if (samples.length === 0) {
    await saveAppleHealthPrefs({
      connected: true,
      lastSyncedAt: new Date().toISOString(),
    });
    const detail =
      metricErrors.length > 0
        ? ` Read errors: ${metricErrors.join(' · ')}`
        : ' Check Health → Sharing → Apps → HealthShield for Steps, Heart Rate, and Sleep, and that those types have data for the last 7 days.';
    return {
      ok: true,
      upserted: 0,
      message: `Synced — no steps, heart rate, or sleep samples in the last 7 days.${detail}`,
      samples: [],
      metricErrors,
    };
  }

  const syncedAt = new Date().toISOString();
  const rows = samples.map((s) => ({
    user_id: userId,
    source: 'apple_health' as const,
    metric: s.metric,
    day: s.day,
    value_primary: s.value_primary,
    unit: s.unit,
    synced_at: syncedAt,
    updated_at: syncedAt,
  }));

  const { error } = await getSupabase()
    .from('platform_health_daily')
    .upsert(rows, { onConflict: 'user_id,source,metric,day' });

  if (error) {
    return { ok: false, upserted: 0, message: error.message, samples, metricErrors };
  }

  await saveAppleHealthPrefs({ connected: true, lastSyncedAt: syncedAt });
  return { ok: true, upserted: rows.length, samples, metricErrors };
}
