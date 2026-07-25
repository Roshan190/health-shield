/**
 * HealthShield theme tokens.
 * Prefer these over one-off colors. NativeWind may wrap them later.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Palette: "trust blue + warm care".
 * - `primary` (blue) = trust / insurance
 * - `accent` (teal)  = health / care highlights
 * - `warning` (amber) = renewal soon, `danger` (red) = overdue/destructive
 * Token names kept stable so every screen re-themes automatically.
 *
 * Active scheme is chosen in-app (Profile → Appearance) via
 * `useThemeStore` preference: system | light | dark.
 */
export const Colors = {
  light: {
    text: '#0B1526',
    textSecondary: '#5B6B85',
    textTertiary: '#8C99B0',
    background: '#F6F8FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3ECFD',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF2F9',
    border: '#E3E9F3',
    primary: '#2563EB',
    primaryStrong: '#1D4ED8',
    primaryMuted: '#DBE7FF',
    onPrimary: '#FFFFFF',
    accent: '#0E9F97',
    accentMuted: '#D7F3F0',
    success: '#12A150',
    successMuted: '#DCF5E7',
    warning: '#B45309',
    warningMuted: '#FCEEDC',
    danger: '#DC2626',
    dangerMuted: '#FDE5E5',
  },
  dark: {
    text: '#EAF1FA',
    textSecondary: '#94A6C0',
    textTertiary: '#6E809C',
    background: '#0A101C',
    backgroundElement: '#141D2E',
    backgroundSelected: '#1F2E49',
    surface: '#141D2E',
    surfaceMuted: '#1B2537',
    border: '#28344C',
    primary: '#5B8DEF',
    primaryStrong: '#7CA5F5',
    primaryMuted: '#1E3157',
    onPrimary: '#08101F',
    accent: '#2DD4BF',
    accentMuted: '#123B37',
    success: '#3DD68C',
    successMuted: '#12351F',
    warning: '#F5A524',
    warningMuted: '#3D2C10',
    danger: '#F97066',
    dangerMuted: '#43181C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeName = keyof typeof Colors;

/**
 * Tinted icon-badge / chip pairs (foreground on soft background).
 * Used to give every card and section a recognizable color identity
 * without resorting to flat monochrome UI.
 */
export const Tints = {
  light: {
    blue: { fg: '#2563EB', bg: '#E3ECFD' },
    teal: { fg: '#0D9488', bg: '#D7F3F0' },
    amber: { fg: '#B45309', bg: '#FCEEDC' },
    red: { fg: '#DC2626', bg: '#FDE5E5' },
    violet: { fg: '#7C3AED', bg: '#EEE7FD' },
    green: { fg: '#12A150', bg: '#DCF5E7' },
    slate: { fg: '#5B6B85', bg: '#EAEFF6' },
  },
  dark: {
    blue: { fg: '#7CA5F5', bg: '#1E3157' },
    teal: { fg: '#2DD4BF', bg: '#123B37' },
    amber: { fg: '#F5A524', bg: '#3D2C10' },
    red: { fg: '#F97066', bg: '#43181C' },
    violet: { fg: '#A78BFA', bg: '#2C2150' },
    green: { fg: '#3DD68C', bg: '#12351F' },
    slate: { fg: '#94A6C0', bg: '#1B2537' },
  },
} as const;

export type TintName = keyof typeof Tints.light;

/**
 * Colors used on top of gradient surfaces (hero banners, brand buttons).
 * Scheme-independent: our gradients are dark in both light and dark mode.
 */
export const Overlay = {
  onGradient: '#FFFFFF',
  onGradientMuted: 'rgba(255,255,255,0.85)',
  onGradientFaint: 'rgba(255,255,255,0.7)',
  glassBg: 'rgba(255,255,255,0.16)',
  glassBgStrong: 'rgba(255,255,255,0.18)',
  glassBorder: 'rgba(255,255,255,0.25)',
  ripple: 'rgba(255,255,255,0.2)',
} as const;

/** Gradient stops for hero banners and premium surfaces. */
export const Gradients = {
  light: {
    hero: ['#1E3A8A', '#2456D6', '#3B82F6'],
    brand: ['#2563EB', '#4F46E5'],
    care: ['#0D9488', '#0EA5E9'],
  },
  dark: {
    hero: ['#101A38', '#16295E', '#1E4CB0'],
    brand: ['#1E3A8A', '#3730A3'],
    care: ['#0F766E', '#0369A1'],
  },
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Elevation levels for surfaces. Spread into a style object. */
export const Shadow = {
  /** Subtle resting elevation for cards. */
  card: Platform.select({
    ios: {
      shadowColor: '#0B1B3A',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  /** Pronounced elevation for hero cards and primary CTAs. */
  floating: Platform.select({
    ios: {
      shadowColor: '#0B1B3A',
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
