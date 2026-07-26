import {
  aggregateDailyGroups,
  dayKeyFromAggregateStart,
  sleepMinutesFromSeconds,
} from '@/lib/health-connect/aggregate';
import {
  getHealthConnectModule,
  healthConnectUnsupportedReason,
} from '@/lib/health-connect/runtime';
import {
  loadHealthConnectPrefs,
  saveHealthConnectPrefs,
} from '@/lib/health-connect/preferences';
import { getSupabase } from '@/lib/supabase/client';
import type { PlatformHealthMetric } from '@/lib/supabase/database.types';

const LOOKBACK_DAYS = 7;

const READ_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Steps' as const },
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'SleepSession' as const },
];

export type HealthConnectStatus =
  | { kind: 'unsupported'; reason: string }
  | { kind: 'unavailable'; detail: string }
  | { kind: 'ready'; sdkAvailable: boolean }
  | { kind: 'error'; message: string };

export type DailyAggregate = {
  metric: PlatformHealthMetric;
  day: string;
  value_primary: number;
  unit: string;
};

export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  const unsupported = healthConnectUnsupportedReason();
  if (unsupported) {
    return { kind: 'unsupported', reason: unsupported };
  }

  const HC = await getHealthConnectModule();
  if (!HC) {
    return {
      kind: 'unavailable',
      detail: 'Could not load Health Connect. Rebuild with a development client that includes the native module.',
    };
  }

  try {
    const status = await HC.getSdkStatus();
    if (status === HC.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { kind: 'ready', sdkAvailable: true };
    }
    if (status === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return {
        kind: 'unavailable',
        detail: 'Health Connect needs an update. Open the Play Store and update Health Connect, then try again.',
      };
    }
    return {
      kind: 'unavailable',
      detail: 'Health Connect is not available on this device.',
    };
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Health Connect status check failed',
    };
  }
}

/** Request read permissions; returns granted record types. */
export async function connectHealthConnect(): Promise<{
  ok: boolean;
  granted: string[];
  message?: string;
}> {
  const status = await getHealthConnectStatus();
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

  const HC = await getHealthConnectModule();
  if (!HC) {
    return { ok: false, granted: [], message: 'Health Connect module unavailable' };
  }

  const initialized = await HC.initialize();
  if (!initialized) {
    return { ok: false, granted: [], message: 'Could not initialize Health Connect' };
  }

  const granted = await HC.requestPermission(READ_PERMISSIONS);
  const grantedTypes = granted
    .map((p) => ('recordType' in p ? String(p.recordType) : null))
    .filter((t): t is string => Boolean(t) && t !== 'BackgroundAccessPermission');

  if (grantedTypes.length === 0) {
    await saveHealthConnectPrefs({ connected: false, lastSyncedAt: null });
    return {
      ok: false,
      granted: [],
      message:
        'No permissions granted (dialog returned empty). In Health Connect → App permissions, confirm HealthShield is listed and allow Steps, Heart rate, and Sleep. If HealthShield is missing, rebuild the APK after the health permission declarations were added.',
    };
  }

  const prefs = await loadHealthConnectPrefs();
  await saveHealthConnectPrefs({ ...prefs, connected: true });
  return { ok: true, granted: grantedTypes };
}

export async function disconnectHealthConnect(): Promise<{ ok: boolean; message?: string }> {
  const HC = await getHealthConnectModule();
  if (HC) {
    try {
      await HC.initialize();
      await HC.revokeAllPermissions();
    } catch {
      // Still clear local opt-in if revoke fails (e.g. Expo Go leftover).
    }
  }
  await saveHealthConnectPrefs({ connected: false, lastSyncedAt: null });
  return { ok: true };
}

export async function openHealthConnectSettings() {
  const HC = await getHealthConnectModule();
  if (!HC) {
    return;
  }
  HC.openHealthConnectSettings();
}

async function readDailyAggregates(): Promise<{
  samples: DailyAggregate[];
  metricErrors: string[];
}> {
  const HC = await getHealthConnectModule();
  if (!HC) {
    return { samples: [], metricErrors: ['Native module unavailable'] };
  }

  await HC.initialize();

  const out: DailyAggregate[] = [];
  const metricErrors: string[] = [];

  try {
    const stepsGroups = await aggregateDailyGroups(HC, 'Steps', LOOKBACK_DAYS);
    for (const group of stepsGroups) {
      const total = Number(group.result.COUNT_TOTAL ?? 0);
      if (total <= 0) {
        continue;
      }
      out.push({
        metric: 'steps',
        day: dayKeyFromAggregateStart(group.startTime),
        value_primary: total,
        unit: 'steps',
      });
    }
  } catch (e) {
    metricErrors.push(`Steps: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const hrGroups = await aggregateDailyGroups(HC, 'HeartRate', LOOKBACK_DAYS);
    for (const group of hrGroups) {
      const avg = Number(group.result.BPM_AVG ?? 0);
      if (avg <= 0) {
        continue;
      }
      out.push({
        metric: 'heart_rate',
        day: dayKeyFromAggregateStart(group.startTime),
        value_primary: Math.round(avg),
        unit: 'bpm',
      });
    }
  } catch (e) {
    metricErrors.push(`HeartRate: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const sleepGroups = await aggregateDailyGroups(HC, 'SleepSession', LOOKBACK_DAYS);
    for (const group of sleepGroups) {
      // Library maps SLEEP_DURATION_TOTAL to seconds (not ms).
      const minutes = sleepMinutesFromSeconds(Number(group.result.SLEEP_DURATION_TOTAL ?? 0));
      if (minutes <= 0) {
        continue;
      }
      out.push({
        metric: 'sleep',
        day: dayKeyFromAggregateStart(group.startTime),
        value_primary: minutes,
        unit: 'min',
      });
    }
  } catch (e) {
    metricErrors.push(`SleepSession: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { samples: out, metricErrors };
}

/** Pull last 7 days of aggregates and upsert into Supabase. */
export async function syncHealthConnectDaily(userId: string): Promise<{
  ok: boolean;
  upserted: number;
  message?: string;
  samples: DailyAggregate[];
  metricErrors: string[];
}> {
  const prefs = await loadHealthConnectPrefs();
  if (!prefs.connected) {
    return {
      ok: false,
      upserted: 0,
      message: 'Connect Health Connect first',
      samples: [],
      metricErrors: [],
    };
  }

  const status = await getHealthConnectStatus();
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
    await saveHealthConnectPrefs({
      connected: true,
      lastSyncedAt: new Date().toISOString(),
    });
    const detail =
      metricErrors.length > 0
        ? ` Read errors: ${metricErrors.join(' · ')}`
        : ' Check that HealthShield has Steps/Heart rate/Sleep allowed under Health Connect → App permissions, and that those data types exist for the last 7 days.';
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
    source: 'health_connect' as const,
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

  await saveHealthConnectPrefs({ connected: true, lastSyncedAt: syncedAt });
  return { ok: true, upserted: rows.length, samples, metricErrors };
}
