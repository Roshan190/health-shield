import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { HealthMetricCards } from '@/components/health-metric-cards';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  loadAppleHealthPrefs,
  type AppleHealthPrefs,
} from '@/lib/apple-health/preferences';
import {
  connectAppleHealth,
  disconnectAppleHealth,
  getAppleHealthStatus,
  openAppleHealthApp,
  syncAppleHealthDaily,
  type AppleHealthStatus,
} from '@/lib/apple-health/sync';
import { formatSyncedAt } from '@/lib/health-connect/format';
import { getSupabase } from '@/lib/supabase/client';
import type { PlatformHealthDaily } from '@/lib/supabase/database.types';

export default function AppleHealthScreen() {
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [status, setStatus] = useState<AppleHealthStatus | null>(null);
  const [prefs, setPrefs] = useState<AppleHealthPrefs | null>(null);
  const [rows, setRows] = useState<PlatformHealthDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [nextStatus, nextPrefs] = await Promise.all([
      getAppleHealthStatus(),
      loadAppleHealthPrefs(),
    ]);
    setStatus(nextStatus);
    setPrefs(nextPrefs);

    if (user) {
      const { data, error: loadError } = await getSupabase()
        .from('platform_health_daily')
        .select('*')
        .eq('source', 'apple_health')
        .order('day', { ascending: false })
        .limit(21);
      if (loadError) {
        setError(loadError.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function onConnect() {
    setBusy(true);
    setError(null);
    setNote(null);
    const result = await connectAppleHealth();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'Could not connect');
      await refresh();
      return;
    }
    setNote(`Connected · reads ${result.granted.join(', ')}`);
    if (user) {
      setBusy(true);
      const sync = await syncAppleHealthDaily(user.id);
      setBusy(false);
      if (!sync.ok) {
        setError(sync.message ?? 'Sync failed');
      } else {
        setNote(sync.message ?? `Synced ${sync.upserted} daily values`);
      }
    }
    await refresh();
  }

  async function onSync() {
    if (!user) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    const sync = await syncAppleHealthDaily(user.id);
    setBusy(false);
    if (!sync.ok) {
      setError(sync.message ?? 'Sync failed');
    } else {
      const errTail =
        sync.metricErrors.length > 0 ? `\n${sync.metricErrors.join('\n')}` : '';
      setNote(`${sync.message ?? `Synced ${sync.upserted} daily values`}${errTail}`);
    }
    await refresh();
  }

  async function onDisconnect() {
    setBusy(true);
    setError(null);
    setNote(null);
    const result = await disconnectAppleHealth();
    setBusy(false);
    setNote(
      result.message ??
        'Disconnected. Past syncs stay in your account until you delete them or your account.'
    );
    await refresh();
  }

  const unsupported = status?.kind === 'unsupported';
  const unavailable = status?.kind === 'unavailable';
  const connected = Boolean(prefs?.connected);

  return (
    <Screen
      title="Apple Health"
      subtitle="Read-only steps, heart rate, and sleep."
      headerRight={<IconBadge icon="logo-apple" tint="slate" size={44} />}>
      <Card variant="tinted" style={styles.disclaimer}>
        <IconBadge icon="information-circle" tint="slate" size={36} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
          Consent-first and read-only. HealthShield never writes to Apple Health and does not
          diagnose from these values. iOS device testing is still pending (D-014).
        </ThemedText>
      </Card>

      {loading || !status || !prefs ? (
        <Card>
          <Skeleton width="50%" height={18} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
        </Card>
      ) : (
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Chip
              label={
                unsupported
                  ? 'Unavailable here'
                  : unavailable
                    ? 'Needs setup'
                    : connected
                      ? 'Connected'
                      : 'Not connected'
              }
              tint={connected ? 'green' : unsupported || unavailable ? 'amber' : 'slate'}
              icon={connected ? 'checkmark-circle' : 'heart'}
            />
            <ThemedText type="caption" themeColor="textTertiary">
              {formatSyncedAt(prefs.lastSyncedAt)}
            </ThemedText>
          </View>

          {status.kind === 'unsupported' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {status.reason}
            </ThemedText>
          ) : null}
          {status.kind === 'unavailable' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {status.detail}
            </ThemedText>
          ) : null}
          {status.kind === 'error' ? (
            <ThemedText type="small" themeColor="danger">
              {status.message}
            </ThemedText>
          ) : null}
          {status.kind === 'ready' && !connected ? (
            <ThemedText type="small" themeColor="textSecondary">
              Connect to pull the last 7 days of steps, average heart rate, and sleep duration into
              your private HealthShield account.
            </ThemedText>
          ) : null}
          {status.kind === 'ready' && connected ? (
            <ThemedText type="small" themeColor="textSecondary">
              Sync anytime to refresh the last 7 days. Empty days are skipped — we never invent
              missing samples.
            </ThemedText>
          ) : null}

          <View style={styles.actions}>
            {!unsupported && !connected ? (
              <Button
                label="Connect & sync"
                icon="link"
                loading={busy}
                onPress={onConnect}
                disabled={unavailable || status.kind === 'error'}
              />
            ) : null}
            {!unsupported && connected ? (
              <>
                <Button label="Sync now" icon="refresh" loading={busy} onPress={onSync} />
                <Button
                  label="Open Health app"
                  variant="secondary"
                  icon="open-outline"
                  onPress={() => openAppleHealthApp()}
                  disabled={busy}
                />
                <Button
                  label="Disconnect"
                  variant="danger"
                  onPress={onDisconnect}
                  disabled={busy}
                />
              </>
            ) : null}
          </View>
        </Card>
      )}

      {error ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.flex}>
            {error}
          </ThemedText>
        </Card>
      ) : null}
      {note ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <ThemedText type="small" themeColor="success" style={styles.flex}>
            {note}
          </ThemedText>
        </Card>
      ) : null}

      <View style={styles.metricsSection}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="stats-chart" tint="teal" size={34} />
          <View style={styles.metricsHeading}>
            <ThemedText type="section">Last 7 days</ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              Latest reading per metric — not a diagnosis
            </ThemedText>
          </View>
        </View>
        {loading ? (
          <Card style={styles.listCard}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="70%" height={28} />
            <Skeleton width="100%" height={48} radius={Radius.lg} />
          </Card>
        ) : (
          <HealthMetricCards rows={rows} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  flex: {
    flex: 1,
  },
  statusCard: {
    gap: Spacing.three,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  listCard: {
    gap: Spacing.three,
  },
  metricsSection: {
    gap: Spacing.three,
  },
  metricsHeading: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
});
