/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Gradients, Tints, type ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/lib/theme/theme-store';

/**
 * The single place the active scheme is resolved.
 * Respects the in-app preference (system | light | dark).
 */
export function useThemeName(): ThemeName {
  const preference = useThemeStore((s) => s.preference);
  const scheme = useColorScheme();

  if (preference === 'light') {
    return 'light';
  }
  if (preference === 'dark') {
    return 'dark';
  }
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useThemeName()];
}

/** Tinted fg/bg pairs for icon badges and chips, matching the active scheme. */
export function useTints() {
  return Tints[useThemeName()];
}

/** Gradient stop sets for hero banners, matching the active scheme. */
export function useGradients() {
  return Gradients[useThemeName()];
}
