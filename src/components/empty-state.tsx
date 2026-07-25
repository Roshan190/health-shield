import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type TintName } from '@/constants/theme';
import { useTheme, useTints } from '@/hooks/use-theme';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: TintName;
  /** Two small satellite icons floating around the main medallion. */
  accessories?: [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap];
  title: string;
  message: string;
  children?: ReactNode;
};

/**
 * Illustrated empty state: layered icon composition + message + optional CTA.
 * Used anywhere we would otherwise show a blank screen.
 */
export function EmptyState({
  icon,
  tint = 'blue',
  accessories,
  title,
  message,
  children,
}: EmptyStateProps) {
  const theme = useTheme();
  const tints = useTints();

  return (
    <View style={styles.root}>
      <View style={styles.art}>
        <View style={[styles.halo, { backgroundColor: tints[tint].bg }]} />
        <IconBadge icon={icon} tint={tint} size={88} shape="circle" />
        {accessories ? (
          <>
            <View
              style={[
                styles.satellite,
                styles.satelliteLeft,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Ionicons name={accessories[0]} size={18} color={tints.teal.fg} />
            </View>
            <View
              style={[
                styles.satellite,
                styles.satelliteRight,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Ionicons name={accessories[1]} size={18} color={tints.violet.fg} />
            </View>
          </>
        ) : null}
      </View>

      <ThemedText type="heading" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.center, styles.message]}>
        {message}
      </ThemedText>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  art: {
    width: 140,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  halo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: Radius.pill,
    opacity: 0.4,
    transform: [{ scale: 1.12 }],
  },
  satellite: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  satelliteLeft: {
    left: 0,
    top: 8,
  },
  satelliteRight: {
    right: 0,
    bottom: 8,
  },
  center: {
    textAlign: 'center',
  },
  message: {
    maxWidth: 300,
  },
  actions: {
    marginTop: Spacing.three,
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
});
