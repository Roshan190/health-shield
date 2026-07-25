import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type TintName } from '@/constants/theme';
import { useTheme, useTints } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  tint?: TintName;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Small status pill (e.g. "Renews in 12 days", "Coming soon"). */
export function Chip({ label, tint = 'slate', icon }: ChipProps) {
  const tints = useTints();
  const colors = tints[tint];

  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={colors.fg} /> : null}
      <ThemedText type="caption" style={[styles.chipLabel, { color: colors.fg }]}>
        {label}
      </ThemedText>
    </View>
  );
}

type SelectChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

/** Tappable selection pill used in forms (policy type, premium frequency). */
export function SelectChip({ label, selected, onPress, disabled }: SelectChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectChip,
        {
          backgroundColor: selected ? theme.primaryMuted : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      {selected ? <Ionicons name="checkmark-circle" size={15} color={theme.primary} /> : null}
      <ThemedText
        type="smallBold"
        style={{ color: selected ? theme.primary : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  chipLabel: {
    fontWeight: 700,
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
});
