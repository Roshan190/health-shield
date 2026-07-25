import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  /** `elevated` = white surface with shadow; `muted` = flat subtle fill; `tinted` = brand-tinted fill. */
  variant?: 'elevated' | 'muted' | 'tinted';
  padded?: boolean;
};

export function Card({ variant = 'elevated', padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        {
          backgroundColor:
            variant === 'elevated'
              ? theme.surface
              : variant === 'tinted'
                ? theme.primaryMuted
                : theme.surfaceMuted,
          borderColor: variant === 'tinted' ? 'transparent' : theme.border,
        },
        variant === 'elevated' && Shadow.card,
        style,
      ]}
      {...rest}
    />
  );
}

type PressableCardProps = PressableProps & {
  padded?: boolean;
};

/** Elevated card that scales down slightly on press. */
export function PressableCard({ padded = true, style, ...rest }: PressableCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      android_ripple={{ color: theme.backgroundSelected, foreground: true }}
      style={(state) => [
        styles.base,
        padded && styles.padded,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          transform: [{ scale: state.pressed ? 0.98 : 1 }],
          opacity: state.pressed ? 0.96 : 1,
        },
        Shadow.card,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.three,
  },
});
