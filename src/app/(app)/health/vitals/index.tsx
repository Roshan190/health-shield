import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { SelectChip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSupabase } from '@/lib/supabase/client';
import type { Vital, VitalType } from '@/lib/supabase/database.types';
import {
  formatVitalValue,
  formatVitalWhen,
  VITAL_TYPES,
  vitalTypeLabel,
} from '@/lib/vitals/format';
import { vitalVisual } from '@/lib/vitals/visuals';

type Filter = 'all' | VitalType;

function trendSummary(rows: Vital[]) {
  if (rows.length === 0) {
    return null;
  }
  const latest = rows[0];
  const previous = rows[1];
  if (!previous) {
    return `Latest: ${formatVitalValue(
      latest.vital_type,
      latest.value_primary,
      latest.value_secondary,
      latest.unit
    )}`;
  }
  const delta = Number(latest.value_primary) - Number(previous.value_primary);
  const sign = delta > 0 ? '+' : '';
  const deltaText =
    latest.vital_type === 'blood_pressure'
      ? `${sign}${delta.toFixed(0)} sys vs prior`
      : `${sign}${delta.toFixed(latest.vital_type === 'weight' ? 1 : 0)} vs prior`;
  return `Latest ${formatVitalValue(
    latest.vital_type,
    latest.value_primary,
    latest.value_secondary,
    latest.unit
  )} · ${deltaText}`;
}

export default function VitalsListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await getSupabase()
      .from('vitals')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setVitals([]);
    } else {
      setVitals(data ?? []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(
    () => (filter === 'all' ? vitals : vitals.filter((v) => v.vital_type === filter)),
    [filter, vitals]
  );

  const trendRows = useMemo(() => {
    if (filter === 'all') {
      return [];
    }
    return filtered.slice(0, 8);
  }, [filter, filtered]);

  const spark = useMemo(() => {
    if (trendRows.length < 2) {
      return null;
    }
    const values = [...trendRows].reverse().map((r) => Number(r.value_primary));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((v) => (v - min) / span);
  }, [trendRows]);

  return (
    <Screen
      title="Vitals"
      subtitle="Manual logs for your records — not a diagnosis."
      headerRight={
        !loading && vitals.length > 0 ? (
          <Button label="Log" icon="add" size="sm" onPress={() => router.push('/health/vitals/new')} />
        ) : undefined
      }>
      {loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <EmptyState icon="cloud-offline" tint="red" title="Couldn't load vitals" message={error}>
          <Button label="Try again" icon="refresh" onPress={load} />
        </EmptyState>
      ) : vitals.length === 0 ? (
        <EmptyState
          icon="heart"
          tint="teal"
          accessories={['water', 'fitness']}
          title="Log your first reading"
          message="Blood pressure, blood sugar, and weight — kept private to your account. This is for personal tracking, not medical advice.">
          <Button label="Log a vital" icon="add" onPress={() => router.push('/health/vitals/new')} />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          <View style={styles.chips}>
            <SelectChip
              label="All"
              selected={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            {VITAL_TYPES.map((item) => (
              <SelectChip
                key={item.value}
                label={item.label}
                selected={filter === item.value}
                onPress={() => setFilter(item.value)}
              />
            ))}
          </View>

          {filter !== 'all' && trendRows.length > 0 ? (
            <Card variant="tinted" style={styles.trendCard}>
              <View style={styles.trendHeader}>
                <IconBadge
                  icon={vitalVisual(filter).icon}
                  tint={vitalVisual(filter).tint}
                  size={40}
                />
                <View style={styles.trendBody}>
                  <ThemedText type="smallBold">{vitalTypeLabel(filter)} trend</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {trendSummary(trendRows)}
                  </ThemedText>
                </View>
              </View>
              {spark ? (
                <View style={styles.sparkRow}>
                  {spark.map((n, i) => (
                    <View
                      key={`${i}-${n}`}
                      style={[
                        styles.sparkBar,
                        {
                          height: 8 + n * 28,
                          backgroundColor: theme.accent,
                          opacity: 0.35 + n * 0.65,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <ThemedText type="caption" themeColor="textTertiary">
                  Log another reading to see a short trend.
                </ThemedText>
              )}
            </Card>
          ) : null}

          {filtered.length === 0 ? (
            <Card variant="muted">
              <ThemedText type="small" themeColor="textSecondary">
                No {filter === 'all' ? '' : `${vitalTypeLabel(filter).toLowerCase()} `}readings yet.
              </ThemedText>
            </Card>
          ) : (
            filtered.map((vital, index) => {
              const visual = vitalVisual(vital.vital_type);
              return (
                <Animated.View key={vital.id} entering={FadeInDown.delay(index * 35).springify()}>
                  <PressableCard
                    style={styles.vitalCard}
                    onPress={() => router.push(`/health/vitals/${vital.id}`)}>
                    <IconBadge icon={visual.icon} tint={visual.tint} size={46} />
                    <View style={styles.vitalBody}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {formatVitalValue(
                          vital.vital_type,
                          vital.value_primary,
                          vital.value_secondary,
                          vital.unit
                        )}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                        {vitalTypeLabel(vital.vital_type)} · {formatVitalWhen(vital.recorded_at)}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                  </PressableCard>
                </Animated.View>
              );
            })
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.half,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  trendCard: {
    gap: Spacing.three,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  trendBody: {
    flex: 1,
    gap: Spacing.half,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 36,
  },
  sparkBar: {
    flex: 1,
    borderRadius: 3,
    minWidth: 6,
  },
  vitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  vitalBody: {
    flex: 1,
    gap: Spacing.half,
  },
});
