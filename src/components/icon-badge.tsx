import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, type TintName } from '@/constants/theme';
import { useTints } from '@/hooks/use-theme';

type IconBadgeProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: TintName;
  size?: number;
  /** `circle` for avatars/statuses, `squircle` for section/action icons. */
  shape?: 'circle' | 'squircle';
  style?: ViewStyle;
};

/** Tinted icon medallion — the building block for card and list-row identity. */
export function IconBadge({
  icon,
  tint = 'blue',
  size = 44,
  shape = 'squircle',
  style,
}: IconBadgeProps) {
  const tints = useTints();
  const colors = tints[tint];

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? Radius.pill : Math.round(size * 0.32),
          backgroundColor: colors.bg,
        },
        style,
      ]}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={colors.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
