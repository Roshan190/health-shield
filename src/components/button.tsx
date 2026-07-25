import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Overlay, Radius, Shadow, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
};

export const Button = forwardRef<ComponentRef<typeof Pressable>, ButtonProps>(function Button(
  { label, variant = 'primary', size = 'lg', icon, loading = false, disabled, style, ...rest },
  ref
) {
  const theme = useTheme();
  const gradients = useGradients();

  const isPrimary = variant === 'primary';
  const bg = isPrimary
    ? 'transparent'
    : variant === 'secondary'
      ? theme.surface
      : variant === 'danger'
        ? theme.dangerMuted
        : 'transparent';

  const labelColor = isPrimary
    ? Overlay.onGradient
    : variant === 'danger'
      ? theme.danger
      : variant === 'ghost'
        ? theme.textSecondary
        : theme.text;

  const bordered = variant === 'secondary';
  const blocked = disabled || loading;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(blocked), busy: loading }}
      disabled={blocked}
      android_ripple={
        isPrimary ? { color: Overlay.ripple } : { color: theme.backgroundSelected }
      }
      style={(state) => [
        styles.base,
        sizes[size],
        {
          backgroundColor: bg,
          borderColor: bordered ? theme.border : 'transparent',
          borderWidth: bordered ? 1 : 0,
          opacity: blocked ? 0.55 : 1,
          transform: [{ scale: state.pressed ? 0.98 : 1 }],
        },
        isPrimary && Shadow.card,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {isPrimary ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={labelColor} />
        ) : null}
        <ThemedText
          type={size === 'sm' ? 'smallBold' : 'smallBold'}
          style={[{ color: labelColor }, size !== 'sm' && styles.labelLg]}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
});

const sizes = StyleSheet.create({
  lg: { minHeight: 54, paddingHorizontal: Spacing.four },
  md: { minHeight: 46, paddingHorizontal: Spacing.three },
  sm: { minHeight: 38, paddingHorizontal: Spacing.three },
});

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  labelLg: {
    fontSize: 15,
  },
});
