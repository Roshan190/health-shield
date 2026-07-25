import { useEffect } from 'react';
import { StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/** Pulsing placeholder block shown while content loads. */
export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.surfaceMuted },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton for list rows. */
export function SkeletonCard() {
  const theme = useTheme();

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width={44} height={44} radius={14} />
      <Animated.View style={styles.cardBody}>
        <Skeleton width="55%" height={15} />
        <Skeleton width="80%" height={12} />
        <Skeleton width="40%" height={12} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.two,
  },
});
