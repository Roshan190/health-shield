import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type TintName } from '@/constants/theme';
import { useTheme, useTints } from '@/hooks/use-theme';
import {
  buildMetricSeries,
  formatDayShort,
  formatDelta,
  formatLatestDisplay,
  sparkNorms,
  type MetricSeries,
} from '@/lib/health-connect/summarize';
import type { PlatformHealthDaily, PlatformHealthMetric } from '@/lib/supabase/database.types';

const METRIC_VISUAL: Record<
  PlatformHealthMetric,
  { icon: keyof typeof Ionicons.glyphMap; tint: TintName }
> = {
  steps: { icon: 'walk', tint: 'teal' },
  heart_rate: { icon: 'heart', tint: 'red' },
  sleep: { icon: 'moon', tint: 'violet' },
};

type Props = {
  rows: PlatformHealthDaily[];
  loading?: boolean;
};

/** Per-metric summary cards: latest value, vs prior day, 7-day spark. */
export function HealthMetricCards({ rows, loading }: Props) {
  const series = buildMetricSeries(rows);

  if (loading) {
    return null;
  }

  if (series.length === 0) {
    return (
      <ThemedText type="caption" themeColor="textTertiary">
        Nothing synced yet. Connect and sync to see steps, heart rate, and sleep here.
      </ThemedText>
    );
  }

  return (
    <View style={styles.stack}>
      {series.map((item, index) => (
        <Animated.View key={item.metric} entering={FadeInDown.delay(index * 50).springify()}>
          <MetricCard series={item} />
        </Animated.View>
      ))}
    </View>
  );
}

function MetricCard({ series }: { series: MetricSeries }) {
  const theme = useTheme();
  const tints = useTints();
  const visual = METRIC_VISUAL[series.metric];
  const tint = tints[visual.tint];
  const norms = sparkNorms(series.points.map((p) => p.value));
  const delta =
    series.latest && series.previous
      ? formatDelta(series.metric, series.latest.value, series.previous.value, series.unit)
      : null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconBadge icon={visual.icon} tint={visual.tint} size={44} />
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{series.label}</ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            {series.latest ? formatDayShort(series.latest.day) : '—'}
            {series.points.length > 1 ? ` · ${series.points.length} days` : ''}
          </ThemedText>
        </View>
        {delta ? (
          <Chip
            label={delta.tone === 'up' ? 'Up' : delta.tone === 'down' ? 'Down' : 'Flat'}
            tint={delta.tone === 'up' ? 'green' : delta.tone === 'down' ? 'amber' : 'slate'}
            icon={
              delta.tone === 'up'
                ? 'trending-up'
                : delta.tone === 'down'
                  ? 'trending-down'
                  : 'remove'
            }
          />
        ) : (
          <Chip label="First sync" tint="slate" />
        )}
      </View>

      <View style={styles.valueRow}>
        <ThemedText type="stat" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {formatLatestDisplay(series)}
        </ThemedText>
        {delta ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {delta.text}
          </ThemedText>
        ) : (
          <ThemedText type="caption" themeColor="textTertiary">
            Sync again tomorrow to see change
          </ThemedText>
        )}
      </View>

      {norms.length >= 2 ? (
        <View style={styles.sparkBlock}>
          <View style={styles.sparkRow}>
            {norms.map((n, i) => (
              <View
                key={`${series.points[i]?.day ?? i}`}
                style={[
                  styles.sparkBar,
                  {
                    height: 10 + n * 32,
                    backgroundColor: tint.fg,
                    opacity: i === norms.length - 1 ? 1 : 0.35 + n * 0.45,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.sparkLabels}>
            <ThemedText type="caption" themeColor="textTertiary">
              {formatDayShort(series.points[0].day)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              {formatDayShort(series.points[series.points.length - 1].day)}
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={[styles.sparkPlaceholder, { backgroundColor: theme.surfaceMuted }]}>
          <ThemedText type="caption" themeColor="textTertiary">
            More days will fill a short trend here
          </ThemedText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two + Spacing.half,
  },
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  valueRow: {
    gap: Spacing.half,
  },
  value: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  sparkBlock: {
    gap: Spacing.one,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 44,
  },
  sparkBar: {
    flex: 1,
    borderRadius: Radius.sm,
    minWidth: 6,
  },
  sparkLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sparkPlaceholder: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
  },
});
