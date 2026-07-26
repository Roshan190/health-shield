import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card, PressableCard } from '@/components/card';
import { Chip } from '@/components/chip';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type TintName } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSyncedAt } from '@/lib/health-connect/format';
import { loadHealthConnectPrefs } from '@/lib/health-connect/preferences';
import { reminderSummary } from '@/lib/medications/format';
import { getSupabase } from '@/lib/supabase/client';
import type { Medication, Vital } from '@/lib/supabase/database.types';
import { formatVitalValue, formatVitalWhen, vitalTypeLabel } from '@/lib/vitals/format';

type HubLink = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: TintName;
  route: string;
};

const LINKS: HubLink[] = [
  {
    key: 'vitals',
    title: 'Vitals',
    subtitle: 'Blood pressure, sugar, and weight',
    icon: 'heart',
    tint: 'teal',
    route: '/health/vitals',
  },
  {
    key: 'medications',
    title: 'Medications',
    subtitle: 'Your list and local dose reminders',
    icon: 'medical',
    tint: 'violet',
    route: '/health/medications',
  },
  {
    key: 'records',
    title: 'Records',
    subtitle: 'Reports, prescriptions, and scans',
    icon: 'folder-open',
    tint: 'blue',
    route: '/health/records',
  },
];

export default function HealthHubScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [latestVital, setLatestVital] = useState<Vital | null>(null);
  const [activeMeds, setActiveMeds] = useState<Medication[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [hcConnected, setHcConnected] = useState(false);
  const [hcSyncedAt, setHcSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const [vitalsRes, medsRes, recordsRes, hcPrefs] = await Promise.all([
      supabase
        .from('vitals')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('medications').select('*').eq('active', true).order('name'),
      supabase.from('medical_records').select('id'),
      loadHealthConnectPrefs(),
    ]);

    setLatestVital(vitalsRes.data ?? null);
    setActiveMeds(medsRes.data ?? []);
    setRecordCount(recordsRes.data?.length ?? 0);
    setHcConnected(hcPrefs.connected);
    setHcSyncedAt(hcPrefs.lastSyncedAt);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const nextReminder = activeMeds.find((m) => m.reminder_enabled && m.reminder_times.length > 0);

  function metaFor(key: string) {
    if (key === 'vitals') {
      if (!latestVital) {
        return 'No readings yet';
      }
      return `${vitalTypeLabel(latestVital.vital_type)} · ${formatVitalValue(
        latestVital.vital_type,
        latestVital.value_primary,
        latestVital.value_secondary,
        latestVital.unit
      )} · ${formatVitalWhen(latestVital.recorded_at)}`;
    }
    if (key === 'medications') {
      if (nextReminder) {
        return `${nextReminder.name} · ${reminderSummary(true, nextReminder.reminder_times)}`;
      }
      if (activeMeds.length) {
        return `${activeMeds.length} active`;
      }
      return 'No medications yet';
    }
    if (recordCount) {
      return `${recordCount} document${recordCount === 1 ? '' : 's'}`;
    }
    return 'No documents yet';
  }

  return (
    <Screen
      title="Health"
      subtitle="Vitals, meds, and records — one place."
      headerRight={<IconBadge icon="fitness" tint="teal" size={44} />}>
      <Card variant="tinted" style={styles.disclaimer}>
        <IconBadge icon="information-circle" tint="slate" size={36} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.disclaimerText}>
          For your records only. HealthShield does not diagnose or replace clinical advice.
        </ThemedText>
      </Card>

      <View style={styles.list}>
        {LINKS.map((link, index) => (
          <Animated.View key={link.key} entering={FadeInDown.delay(index * 45).springify()}>
            <PressableCard style={styles.linkCard} onPress={() => router.push(link.route as never)}>
              <IconBadge icon={link.icon} tint={link.tint} size={48} />
              <View style={styles.linkBody}>
                <ThemedText type="smallBold">{link.title}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {link.subtitle}
                </ThemedText>
                {loading ? (
                  <Skeleton width="70%" height={12} />
                ) : (
                  <ThemedText type="caption" themeColor="textTertiary" numberOfLines={2}>
                    {metaFor(link.key)}
                  </ThemedText>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </PressableCard>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(180).springify()}>
        <PressableCard
          style={styles.linkCard}
          onPress={() => router.push('/health/connect')}>
          <IconBadge icon="watch" tint="green" size={48} />
          <View style={styles.linkBody}>
            <ThemedText type="smallBold">Health Connect</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Read-only steps, heart rate, and sleep (Android)
            </ThemedText>
            <ThemedText type="caption" themeColor="textTertiary" numberOfLines={2}>
              {loading
                ? '…'
                : hcConnected
                  ? `Connected · ${formatSyncedAt(hcSyncedAt)}`
                  : 'Not connected · needs a development build'}
            </ThemedText>
          </View>
          <Chip label="Android" tint="green" />
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </PressableCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  disclaimerText: {
    flex: 1,
  },
  list: {
    gap: Spacing.two + Spacing.half,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  linkBody: {
    flex: 1,
    gap: 2,
  },
});
