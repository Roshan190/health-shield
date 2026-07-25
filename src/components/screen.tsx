import { PropsWithChildren, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<
  ViewProps & {
    title?: string;
    subtitle?: string;
    /** Rendered to the right of the title (e.g. an icon badge or action). */
    headerRight?: ReactNode;
    scroll?: boolean;
  }
>;

export function Screen({
  title,
  subtitle,
  headerRight,
  scroll = true,
  children,
  style,
  ...rest
}: ScreenProps) {
  const body = (
    <View style={styles.inner}>
      {title ? (
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {headerRight}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <ThemedView style={[styles.root, style]} {...rest}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  inner: {
    // `alignSelf: 'stretch'` is implicit; cap and center for wide screens.
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  header: {
    flex: 1,
    gap: Spacing.one,
  },
});
