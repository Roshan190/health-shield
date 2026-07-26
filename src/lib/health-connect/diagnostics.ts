import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { toISODate } from '@/lib/dates';
import { aggregateDailyGroups } from '@/lib/health-connect/aggregate';
import { loadHealthConnectPrefs } from '@/lib/health-connect/preferences';
import {
  getHealthConnectModule,
  healthConnectUnsupportedReason,
} from '@/lib/health-connect/runtime';

export type DiagnosticLine = {
  at: string;
  level: 'info' | 'warn' | 'error';
  message: string;
};

function nowIso() {
  return new Date().toISOString();
}

function line(level: DiagnosticLine['level'], message: string): DiagnosticLine {
  return { at: nowIso(), level, message };
}

/** Collect a shareable snapshot of Health Connect readiness (safe for on-device debugging). */
export async function runHealthConnectDiagnostics(): Promise<{
  lines: DiagnosticLine[];
  text: string;
}> {
  const lines: DiagnosticLine[] = [];

  lines.push(
    line(
      'info',
      `App ${Constants.expoConfig?.version ?? '?'} · ${Platform.OS} ${String(Platform.Version)} · ownership=${Constants.appOwnership ?? 'unknown'}`
    )
  );
  lines.push(line('info', `package=${Constants.expoConfig?.android?.package ?? 'n/a'}`));

  const unsupported = healthConnectUnsupportedReason();
  if (unsupported) {
    lines.push(line('error', `Unsupported: ${unsupported}`));
    return { lines, text: formatDiagnosticText(lines) };
  }

  const prefs = await loadHealthConnectPrefs();
  lines.push(
    line(
      'info',
      `Local prefs: connected=${prefs.connected} lastSyncedAt=${prefs.lastSyncedAt ?? 'null'}`
    )
  );

  const HC = await getHealthConnectModule();
  if (!HC) {
    lines.push(line('error', 'Native module import failed (null)'));
    return { lines, text: formatDiagnosticText(lines) };
  }
  lines.push(line('info', 'Native module loaded'));

  try {
    const sdkStatus = await HC.getSdkStatus();
    const label =
      sdkStatus === HC.SdkAvailabilityStatus.SDK_AVAILABLE
        ? 'SDK_AVAILABLE'
        : sdkStatus === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
          ? 'SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED'
          : sdkStatus === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE
            ? 'SDK_UNAVAILABLE'
            : `UNKNOWN(${sdkStatus})`;
    lines.push(line(sdkStatus === HC.SdkAvailabilityStatus.SDK_AVAILABLE ? 'info' : 'warn', `getSdkStatus=${label}`));
  } catch (e) {
    lines.push(line('error', `getSdkStatus threw: ${errMsg(e)}`));
  }

  try {
    const initialized = await HC.initialize();
    lines.push(line(initialized ? 'info' : 'error', `initialize()=${String(initialized)}`));
  } catch (e) {
    lines.push(line('error', `initialize threw: ${errMsg(e)}`));
  }

  try {
    const granted = await HC.getGrantedPermissions();
    lines.push(line('info', `getGrantedPermissions count=${granted.length}`));
    if (granted.length === 0) {
      lines.push(
        line(
          'warn',
          'No permissions granted to HealthShield yet. Open Health Connect → App permissions → HealthShield and allow Steps / Heart rate / Sleep. If HealthShield is missing from the list, the APK likely lacks health permission declarations — rebuild after app.json permissions fix.'
        )
      );
    } else {
      for (const p of granted) {
        lines.push(line('info', `granted: ${JSON.stringify(p)}`));
      }
    }
  } catch (e) {
    lines.push(line('error', `getGrantedPermissions threw: ${errMsg(e)}`));
  }

  // Probe each metric for the last 7 days without writing to Supabase.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const end = new Date();
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
  lines.push(
    line(
      'info',
      `Probe window ${toISODate(start)} → ${toISODate(end)} (${timeRangeFilter.startTime} … ${timeRangeFilter.endTime})`
    )
  );

  for (const recordType of ['Steps', 'HeartRate', 'SleepSession'] as const) {
    try {
      const mode = recordType === 'Steps' ? 'period' : 'duration';
      const groups = await aggregateDailyGroups(HC, recordType, 7);
      lines.push(line('info', `${recordType} aggregate (${mode}) groups=${groups.length}`));
      for (const g of groups.slice(0, 3)) {
        lines.push(
          line('info', `  ${recordType} ${g.startTime.slice(0, 10)} → ${JSON.stringify(g.result)}`)
        );
      }
      if (groups.length > 3) {
        lines.push(line('info', `  … ${groups.length - 3} more day(s)`));
      }
    } catch (e) {
      lines.push(line('error', `${recordType} aggregate failed: ${errMsg(e)}`));
    }
  }

  lines.push(
    line(
      'info',
      'Tip: Strava/Noise Fit must write Steps/Heart rate/Sleep into Health Connect for those metrics to appear. Check Health Connect → Data and access → Browse data.'
    )
  );

  return { lines, text: formatDiagnosticText(lines) };
}

function errMsg(e: unknown) {
  if (e instanceof Error) {
    return e.message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export function formatDiagnosticText(lines: DiagnosticLine[]) {
  return lines.map((l) => `[${l.level.toUpperCase()}] ${l.at} ${l.message}`).join('\n');
}
