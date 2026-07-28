import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabRoute = {
  key: string;
  name: string;
  params?: object;
};

type FloatingTabBarProps = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  descriptors: Record<string, { options: { title?: string } }>;
  // Expo Router's tab navigation helpers are wider than our local emit typing.
  navigation: any;
};

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

const TAB_META: Record<string, TabMeta> = {
  index: { label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  policies: { label: 'Policies', icon: 'shield-outline', iconFocused: 'shield-checkmark' },
  health: { label: 'Health', icon: 'fitness-outline', iconFocused: 'fitness' },
  family: { label: 'Family', icon: 'people-outline', iconFocused: 'people' },
  profile: { label: 'Profile', icon: 'person-outline', iconFocused: 'person' },
};

const SPRING = { damping: 16, stiffness: 220, mass: 0.6 };

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, Spacing.two),
          backgroundColor: theme.background,
        },
      ]}>
      <View
        style={[
          styles.bar,
          Shadow.floating,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          // Skip hidden stacks (vitals/meds/records) — D-012 keeps five visible tabs only.
          if (!meta) {
            return null;
          }

          const focused = state.index === index;
          const nestedState = state.routes[index]?.state as
            | { index?: number; routes?: { name: string }[] }
            | undefined;
          const nestedIndex = nestedState?.index ?? 0;
          const nestedRouteName = nestedState?.routes?.[nestedIndex]?.name;
          const isAtTabRoot =
            !nestedState || nestedIndex === 0 || nestedRouteName === 'index';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) {
              return;
            }

            // Re-tap active tab (or switch back to a tab with leftover stack): always
            // open that tab's index so nested screens don't trap the user.
            if (focused) {
              if (!isAtTabRoot) {
                navigation.navigate(route.name, { screen: 'index' });
              }
              return;
            }

            if (!isAtTabRoot) {
              navigation.navigate(route.name, { screen: 'index' });
            } else {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              label={meta.label}
              icon={focused ? meta.iconFocused : meta.icon}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + progress.value * 0.08 - pressed.value * 0.05 }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value * 0.5,
    transform: [{ translateY: (1 - progress.value) * 1.5 }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressed.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, SPRING);
      }}
      style={styles.item}>
      <Animated.View
        style={[
          styles.iconPill,
          { backgroundColor: focused ? theme.primaryMuted : 'transparent' },
          pillStyle,
        ]}>
        <Ionicons name={icon} size={22} color={focused ? theme.primary : theme.textTertiary} />
      </Animated.View>
      <Animated.View style={labelStyle}>
        <ThemedText
          type="caption"
          style={[
            styles.label,
            {
              color: focused ? theme.primary : theme.textTertiary,
              fontWeight: focused ? '700' : '500',
            },
          ]}
          numberOfLines={1}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    minHeight: 64,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
    minHeight: 52,
  },
  iconPill: {
    width: 44,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
